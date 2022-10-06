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
import { RendezvousCancellationReason, RendezvousChannel, RendezvousIntent } from 'matrix-js-sdk/src/rendezvous';
import { LoginTokenPostResponse } from 'matrix-js-sdk/src/@types/auth';

import { setLoggedIn } from '../Lifecycle';
import { sendLoginRequest } from '../Login';
import { IMatrixClientCreds, MatrixClientPeg } from '../MatrixClientPeg';

export enum PayloadType {
    Start = 'm.login.start',
    Finish = 'm.login.finish',
    Progress = 'm.login.progress',
}

export class Rendezvous {
    private cli?: MatrixClient;
    public user?: string;
    private newDeviceId?: string;
    private newDeviceKey?: string;
    private ourIntent: RendezvousIntent;
    public code?: string;
    public onCancelled?: (reason: RendezvousCancellationReason) => void;

    constructor(public channel: RendezvousChannel, cli?: MatrixClient) {
        this.cli = cli;
        this.ourIntent = this.isNewDevice ?
            RendezvousIntent.LOGIN_ON_NEW_DEVICE :
            RendezvousIntent.RECIPROCATE_LOGIN_ON_EXISTING_DEVICE;
    }

    async generateCode(): Promise<void> {
        if (this.code) {
            return;
        }

        this.code = JSON.stringify(await this.channel.generateCode(this.ourIntent));
    }

    private get isNewDevice(): boolean {
        return !this.cli;
    }

    private get isExistingDevice(): boolean {
        return !this.isNewDevice;
    }

    private async areIntentsIncompatible(theirIntent: RendezvousIntent): Promise<boolean> {
        const incompatible = theirIntent === this.ourIntent;

        logger.info(`ourIntent: ${this.ourIntent}, theirIntent: ${theirIntent}, incompatible: ${incompatible}`);

        if (incompatible) {
            await this.send({ type: PayloadType.Finish, intent: this.ourIntent });
            await this.channel.cancel(
                this.isNewDevice ?
                    RendezvousCancellationReason.OtherDeviceNotSignedIn :
                    RendezvousCancellationReason.OtherDeviceAlreadySignedIn,
            );
        }

        return incompatible;
    }

    async startAfterShowingCode(): Promise<string | undefined> {
        const checksum = await this.channel.connect();

        logger.info(`Connected to secure channel with checksum: ${checksum}`);

        // first step is always to receive a m.login.start event from scanning party
        const { type, intent: theirIntent } = await this.channel.receive();

        if (type === PayloadType.Finish) {
            if (theirIntent) {
                const incompatibleIntents = await this.areIntentsIncompatible(theirIntent);
                if (!incompatibleIntents) {
                    await this.channel.cancel(RendezvousCancellationReason.Unknown);
                }
            }
            return undefined;
        }

        if (type !== PayloadType.Start) {
            await this.channel.cancel(RendezvousCancellationReason.Unknown);
            return undefined;
        }

        return checksum;
    }

    async send({ type, ...payload }: { type: PayloadType, [key: string]: any }) {
        await this.channel.send({ type, ...payload });
    }

    async startAfterScanningCode(theirIntent: RendezvousIntent): Promise<string | undefined> {
        const checksum = await this.channel.connect();

        logger.info(`Connected to secure channel with checksum: ${checksum}`);

        if (await this.areIntentsIncompatible(theirIntent)) {
            return undefined;
        }

        await this.send({ type: PayloadType.Start, intent: this.ourIntent });

        return checksum;
    }

    async completeOnNewDevice(): Promise<IMatrixClientCreds | undefined> {
        // alert(`Secure connection established. The code ${digits} should be displayed on your other device`);

        logger.info('Waiting for protocols and homeserver');

        const { type: type1, homeserver, outcome: outcome1, protocols } = await this.channel.receive();

        if (type1 === PayloadType.Finish) {
            switch (outcome1 ?? '') {
                case 'declined':
                    logger.info('Other device declined the linking');
                    await this.cancel(RendezvousCancellationReason.UserDeclined);
                    break;
                case 'unsupported':
                    logger.info('Other device declined the linking');
                    await this.cancel(RendezvousCancellationReason.HomeserverLacksSupport);
                    break;
                default:
                    await this.cancel(RendezvousCancellationReason.Unknown);
            }
            return undefined;
        }

        if (type1 !== PayloadType.Progress) {
            logger.info(`Received unexpected payload: ${type1}`);
            await this.cancel(RendezvousCancellationReason.Unknown);
            return undefined;
        }

        if (!Array.isArray(protocols) || !protocols.includes('login_token')) {
            await this.send({ type: PayloadType.Finish, outcome: 'unsupported' });
            await this.cancel(RendezvousCancellationReason.UnsupportedAlgorithm);
            return undefined;
        }

        await this.send({ type: PayloadType.Progress, protocol: 'login_token' });

        logger.info('Waiting for login_token');

        // eslint-disable-next-line camelcase
        const { type: type2, login_token, outcome: outcome2 } = await this.channel.receive();

        if (type2 === PayloadType.Finish) {
            switch (outcome2 ?? '') {
                case 'unsupported':
                    await this.cancel(RendezvousCancellationReason.HomeserverLacksSupport);
                    break;
                default:
                    await this.cancel(RendezvousCancellationReason.Unknown);
            }
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

        const client = MatrixClientPeg.get();

        await this.send({
            type: PayloadType.Progress,
            outcome: 'success',
            device_id: deviceId,
            device_key: client.getDeviceEd25519Key(),
        });

        // await confirmation of verification
        // eslint-disable-next-line camelcase
        const { verifying_device_id: verifyingDeviceId, master_key: masterKey, verifying_device_key: verifyingDeviceKey } = await this.channel.receive();

        const verifyingDeviceFromServer =
            client.crypto.deviceList.getStoredDevice(userId, verifyingDeviceId);

        if (verifyingDeviceFromServer?.getFingerprint() === verifyingDeviceKey) {
            // set other device as verified
            logger.info(`Setting device ${verifyingDeviceId} as verified`);
            await client.setDeviceVerified(userId, verifyingDeviceId, true);

            if (masterKey) {
                // set master key as trusted
                await client.setDeviceVerified(userId, masterKey, true);
            }

            // request secrets from the verifying device
            logger.info(`Requesting secrets from ${verifyingDeviceId}`);
            await requestKeysDuringVerification(client, userId, verifyingDeviceId);
        } else {
            logger.info(`Verifying device ${verifyingDeviceId} doesn't match: ${verifyingDeviceFromServer}`);
        }

        return login;
    }

    async declineLoginOnExistingDevice() {
        logger.info('User declined linking');
        await this.send({ type: PayloadType.Finish, outcome: 'declined' });
    }

    async confirmLoginOnExistingDevice(): Promise<string | undefined> {
        const client = this.cli;

        const homeserver = client.baseUrl;
        const user = client.getUserId();

        if (!(await client.doesServerSupportUnstableFeature('org.matrix.msc3882'))) {
            logger.info("Server doesn't support MSC3882");
            await this.send({ type: PayloadType.Finish, outcome: 'unsupported', user, homeserver });
            await this.cancel(RendezvousCancellationReason.HomeserverLacksSupport);
            return undefined;
        }

        await this.send({ type: PayloadType.Progress, protocols: ['login_token'], user, homeserver });

        const { type, protocol, outcome: outcome1 } = await this.channel.receive();

        if (type === PayloadType.Finish) {
            // new device decided not to complete
            switch (outcome1 ?? '') {
                case 'unsupported':
                    await this.cancel(RendezvousCancellationReason.UnsupportedAlgorithm);
                    break;
                default:
                    await this.cancel(RendezvousCancellationReason.Unknown);
            }
            return undefined;
        }

        if (type !== PayloadType.Progress) {
            await this.cancel(RendezvousCancellationReason.Unknown);
            return undefined;
        }

        if (protocol !== 'login_token') {
            await this.cancel(RendezvousCancellationReason.UnsupportedAlgorithm);
            return undefined;
        }

        logger.info("Requesting login token");

        const loginTokenResponse = await client.requestLoginToken();

        if (typeof (loginTokenResponse as IAuthData).session === 'string') {
            // TODO: handle UIA response
            throw new Error("UIA isn't supported yet");
        }
        // eslint-disable-next-line camelcase
        const { login_token } = loginTokenResponse as LoginTokenPostResponse;

        // eslint-disable-next-line camelcase
        await this.send({ type: PayloadType.Progress, login_token });

        logger.info('Waiting for outcome');
        const res = await this.channel.receive();
        if (!res) {
            return undefined;
        }
        const { outcome, device_id: deviceId, device_key: deviceKey } = res;

        if (outcome !== 'success') {
            throw new Error('Linking failed');
        }

        this.newDeviceId = deviceId;
        this.newDeviceKey = deviceKey;

        return deviceId;
    }

    private async checkAndCrossSignDevice(deviceInfo: DeviceInfo) {
        // check that keys received from the server for the new device match those received from the device itself
        if (deviceInfo.getFingerprint() !== this.newDeviceKey) {
            throw new Error(`New device has different keys than expected: ${this.newDeviceKey} vs ${deviceInfo.getFingerprint()}`);
        }

        // mark the device as verified locally + cross sign
        logger.info(`Marking device ${this.newDeviceId} as verified`);
        const info = await this.cli.crypto.setDeviceVerification(
            this.cli.getUserId(),
            this.newDeviceId,
            true, false, true,
        );

        const masterPublicKey = this.cli.crypto.crossSigningInfo.getId('master');

        await this.send({
            type: PayloadType.Finish,
            outcome: 'verified',
            verifying_device_id: this.cli.getDeviceId(),
            verifying_device_key: this.cli.getDeviceEd25519Key(),
            master_key: masterPublicKey,
        });

        return info;
    }

    async crossSign(timeout = 10 * 1000): Promise<DeviceInfo | CrossSigningInfo | undefined> {
        if (!this.newDeviceId) {
            throw new Error('No new device to sign');
        }

        if (!this.newDeviceKey) {
            logger.info("No new device key to sign");
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
        await this.channel.cancel(reason);
    }
}
