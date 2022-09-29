/*
Copyright 2022 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { IAuthData, MatrixClient } from 'matrix-js-sdk/src/matrix';
import { sleep } from 'matrix-js-sdk/src/utils';
import { logger } from "matrix-js-sdk/src/logger";
import { DeviceInfo } from 'matrix-js-sdk/src/crypto/deviceinfo';
import { CrossSigningInfo, requestKeysDuringVerification } from 'matrix-js-sdk/src/crypto/CrossSigning';
import { RendezvousCancellationReason, RendezvousChannel } from 'matrix-js-sdk/src/rendezvous';
import { LoginTokenPostResponse } from 'matrix-js-sdk/src/@types/auth';

import { setLoggedIn } from '../Lifecycle';
import { sendLoginRequest } from '../Login';
import { IMatrixClientCreds, MatrixClientPeg } from '../MatrixClientPeg';

export class Rendezvous {
    private cli?: MatrixClient;
    public user?: string;
    private newDeviceId?: string;
    private newDeviceKeys?: Record<string, string>;
    public code?: string;
    public onCancelled?: (reason: RendezvousCancellationReason) => void;

    constructor(private channel: RendezvousChannel, cli?: MatrixClient) {
        this.cli = cli;
    }

    async generateCode(): Promise<void> {
        if (this.code) {
            return;
        }

        this.code = JSON.stringify(await this.channel.generateCode());
    }

    async start(): Promise<string> {
        return this.channel.connect();
    }

    async completeOnNewDevice(): Promise<IMatrixClientCreds | undefined> {
        // alert(`Secure connection established. The code ${digits} should be displayed on your other device`);

        // Primary: 2. wait for details of existing device
        // Secondary: 4. wait for details of existing device
        logger.info('Waiting for login_token');
        // eslint-disable-next-line camelcase
        const _res = await this.channel.receive();
        if (!_res) {
            return undefined;
        }

        // eslint-disable-next-line camelcase
        const { homeserver, login_token, outcome } = _res;

        if (outcome === 'declined') {
            logger.info('Other device declined the linking');
            // alert('The other device has declined the linking');
            await this.cancel(RendezvousCancellationReason.UserDeclined);
            return undefined;
        }

        if (!homeserver) {
            throw new Error("No homeserver returned");
        }
        // eslint-disable-next-line camelcase
        if (!login_token) {
            throw new Error("No login token returned");
        }

        // eslint-disable-next-line camelcase
        const login = await sendLoginRequest(homeserver, undefined, "m.login.token", { token: login_token });

        await setLoggedIn(login);

        const { deviceId, userId } = login;

        const data = {
            outcome: 'success',
            deviceId,
            deviceKeys: undefined,
        };

        const client = MatrixClientPeg.get();

        if (client.crypto) {
            const devices = client.crypto.deviceList.getRawStoredDevicesForUser(userId);
            if (!devices || !devices[deviceId]) {
                throw new Error("Unknown device " + userId + ":" + deviceId);
            }

            const device = devices[deviceId];

            data.deviceKeys = device.keys;
        } else {
            logger.info("No crypto module, so not cross-signing");
        }

        await this.channel.send(data);

        // await confirmation of verification
        // eslint-disable-next-line camelcase
        const { verifying_device_id, keys } = await this.channel.receive();

        // set other device as verified
        await client.setDeviceVerified(userId, verifying_device_id, true);

        if (keys) {
            // set up cross-signing
            // eslint-disable-next-line camelcase
            const { master, user_signing, self_signing } = keys;

            // eslint-disable-next-line camelcase
            if (master || user_signing || self_signing) {
                // eslint-disable-next-line camelcase
                client.crypto.crossSigningInfo.setKeys({ master, user_signing, self_signing });
            }
        }

        // request keys from the verifying device
        await requestKeysDuringVerification(client, userId, verifying_device_id);

        return login;
    }

    async declineLoginOnExistingDevice() {
        logger.info('User declined linking');
        await this.channel.send({ outcome: 'declined' });
    }

    async confirmLoginOnExistingDevice(): Promise<string | undefined> {
        logger.info("Requesting login token");

        const loginTokenResponse = await this.cli.requestLoginToken();

        if (typeof (loginTokenResponse as IAuthData).session === 'string') {
            // TODO: handle UIA response
            throw new Error("UIA isn't supported yet");
        }
        // eslint-disable-next-line camelcase
        const { login_token } = loginTokenResponse as LoginTokenPostResponse;

        // eslint-disable-next-line camelcase
        await this.channel.send({ user: this.cli.getUserId(), homeserver: this.cli.baseUrl, login_token });

        logger.info('Waiting for outcome');
        const res = await this.channel.receive();
        if (!res) {
            return undefined;
        }
        const { outcome, deviceId, deviceKeys } = res;

        if (outcome !== 'success') {
            throw new Error('Linking failed');
        }

        this.newDeviceId = deviceId;
        this.newDeviceKeys = deviceKeys;

        return deviceId;
    }

    private async checkAndCrossSignDevice(deviceInfo: DeviceInfo) {
        const expected = Object.keys(deviceInfo.keys).length;
        const actual = Object.keys(this.newDeviceKeys).length;
        if (expected !== actual) {
            throw new Error(`New device has different keys than expected: ${expected} vs ${actual}`);
        }

        for (const keyId of Object.keys(this.newDeviceKeys)) {
            logger.info(`Checking ${keyId}: ${deviceInfo.keys[keyId]} vs ${this.newDeviceKeys[keyId]}`);
            if (deviceInfo.keys[keyId] !== this.newDeviceKeys[keyId]) {
                throw new Error(`New device has different keys than expected for ${keyId}`);
            }
        }

        const info = await this.cli.crypto.setDeviceVerification(this.cli.getUserId(), this.newDeviceId, true, false, true);

        // eslint-disable-next-line camelcase
        const { master, user_signing, self_signing } = this.cli.crypto.crossSigningInfo.toStorage().keys;
        // eslint-disable-next-line camelcase
        await this.channel.send({ outcome: 'verified', verifying_device_id: this.cli.getDeviceId(), keys: { master, user_signing, self_signing } });

        return info;
    }

    async crossSign(timeout = 10 * 1000): Promise<DeviceInfo | CrossSigningInfo | undefined> {
        if (!this.newDeviceId) {
            throw new Error('No new device to sign');
        }

        if (!this.newDeviceKeys || Object.values(this.newDeviceKeys).length === 0) {
            logger.info("No new device keys to sign");
            return undefined;
        }

        const cli = this.cli;

        {
            const deviceInfo = cli.crypto.getStoredDevice(cli.getUserId(), this.newDeviceId);

            if (deviceInfo) {
                return await this.checkAndCrossSignDevice(deviceInfo);
            }
        }

        logger.info("New device is not online");
        await sleep(timeout);

        logger.info("Going to wait for new device to be online");

        {
            const deviceInfo = cli.crypto.getStoredDevice(cli.getUserId(), this.newDeviceId);

            if (deviceInfo) {
                return await this.checkAndCrossSignDevice(deviceInfo);
            }
        }

        throw new Error('Device not online within timeout');
    }

    async userCancelled(): Promise<void> {
        this.cancel(RendezvousCancellationReason.UserCancelled);
    }

    async cancel(reason: RendezvousCancellationReason) {
        await this.channel.transport.cancel(reason);
    }
}
