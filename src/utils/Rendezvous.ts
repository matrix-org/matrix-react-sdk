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

import * as ed from '@noble/ed25519';
import { decryptAES, encryptAES } from 'matrix-js-sdk/src/crypto/aes';
import { MatrixClient, Method } from 'matrix-js-sdk/src/matrix';
import { sleep } from 'matrix-js-sdk/src/utils';
import { encode, decode } from 'universal-base64url';
import { logger } from "matrix-js-sdk/src/logger";
import { DeviceInfo } from 'matrix-js-sdk/src/crypto/deviceinfo';
import { CrossSigningInfo } from 'matrix-js-sdk/src/crypto/CrossSigning';

import { setLoggedIn } from '../Lifecycle';
import { sendLoginRequest } from '../Login';
import { IMatrixClientCreds, MatrixClientPeg } from '../MatrixClientPeg';

function encodeBase64Url(byteArray: Uint8Array): string {
    return encode(btoa(Array.from(byteArray)
        .map(val => String.fromCharCode(val))
        .join('')));
}

function decodeBase64Url(encoded: string): Uint8Array {
    return Uint8Array.from(atob(decode(encoded)), c => c.charCodeAt(0));
}

const ALGORITHM = 'm.rendezvous.v1.x25519-aes-sha256';

export interface RendezvousCode {
    user?: string;
    rendezvous?: {
        type: string;
        uri?: string;
        algorithm?: string;
        key?: {
            x?: string;
        };
    };
}

export interface RendezvousResult {
    homeserver?: string;
    login_token?: string;
}

export enum RendezvousCancellationReason {
    UserDeclined = 'user_declined',
    OtherDeviceNotSignedIn = 'other_device_not_signed_in',
    OtherDeviceAlreadySignedIn = 'other_device_already_signed_in',
    Unknown = 'unknown',
    Expired = 'expired',
    UserCancelled = 'user_cancelled',
}

export class Rendezvous {
    private cli?: MatrixClient;
    private ourPrivateKey: Uint8Array;
    private ourPublicKey: Uint8Array;
    private theirPublicKey?: Uint8Array;
    private theirType: string;
    private sharedSecret?: Uint8Array;
    private defaultRzServer = 'https://localhost:8080/';
    private uri?: string;
    private expiresAt?: Date;
    public user?: string;
    private etag?: string;
    private cancelled = false;
    private newDeviceId?: string;
    private newDeviceKeys?: Record<string, string>;
    public onConfirmationDigits?: (digits: string) => void;
    public onCancelled?: (reason: RendezvousCancellationReason) => void;

    constructor(cli?: MatrixClient, code?: string) {
        if (typeof code === "string") {
            try {
                const parsed = JSON.parse(code) as RendezvousCode;
                if (!parsed.rendezvous?.uri
                    || parsed.rendezvous?.algorithm !== ALGORITHM
                    || !parsed.rendezvous?.key?.x
                    || !parsed.rendezvous?.type
                ) {
                    throw new Error('Invalid code');
                }

                this.uri = parsed.rendezvous.uri;
                this.theirPublicKey = decodeBase64Url(parsed.rendezvous.key.x);
                this.user = parsed.user;
                this.theirType = parsed.rendezvous.type;
            } catch (err) {
                throw new Error('Invalid code');
            }
        }

        this.cli = cli;

        this.ourPrivateKey = ed.utils.randomPrivateKey();
        this.ourPublicKey = ed.curve25519.scalarMultBase(this.ourPrivateKey);
    }

    async generateCode(): Promise<string> {
        if (this.uri) {
            throw new Error('Code already generated');
        }

        const data = {
            "type": this.cli ? "existing_device" : "new_device",
            "algorithm": ALGORITHM,
            "key": {
                "x": encodeBase64Url(this.ourPublicKey),
            },
        };

        // Secondary: 1. send our public key to the rendezvous point for cross reference
        await this.sendData(data);

        const rendezvous: RendezvousCode = {
            "rendezvous": {
                uri: this.uri,
                ...data,
            },
        };

        if (this.cli) {
            rendezvous.user = this.cli.getUserId();
        }

        return JSON.stringify(rendezvous);
    }

    async completeOnNewDevice(): Promise<IMatrixClientCreds | undefined> {
        if (this.theirPublicKey) {
            // Primary: 1. send our public key via the rendezvous
            await this.sendData({ type: 'new_device', algorithm: ALGORITHM, key: { x: encodeBase64Url(this.ourPublicKey) } });
        } else {
            // Secondary: 2. wait for the other device to send us their public key
            logger.info('Waiting for other device to send us their public key');
            const res = await this.pollForData();

            if (!res) {
                return undefined;
            }

            const { type, key, algorithm } = res;

            if (algorithm !== ALGORITHM) {
                throw new Error('Unsupported algorithm');
            }

            if (!key?.x) {
                throw new Error('Invalid key');
            }

            this.theirPublicKey = decodeBase64Url(key.x);
            this.theirType = type;
            // send our public key to the other device to serve as ack and so that they can cross reference
            await this.sendData({ type: 'new_device', algorithm: ALGORITHM, key: { x: encodeBase64Url(this.ourPublicKey) } });
        }

        if (this.theirType !== 'existing_device') {
            logger.info('The other device is not signed in');
            await this.cancel(RendezvousCancellationReason.OtherDeviceNotSignedIn);
            // alert('The other device must be signed in already. Please try again with another device');
            return undefined;
        }

        this.sharedSecret = ed.curve25519.scalarMult(this.ourPrivateKey, this.theirPublicKey);

        logger.info('Waiting for confirmation digits');
        const res = await this.pollForData();
        if (!res) {
            return undefined;
        }

        const { digits } = res;
        if (!digits) {
            throw new Error('No confirmation digits received');
        }

        logger.log(`Received confirmation digits and echoing back: ${digits}`);
        await this.sendData({ digits }); // echo back for ack

        if (this.onConfirmationDigits) {
            this.onConfirmationDigits(digits);
        }

        // alert(`Secure connection established. The code ${digits} should be displayed on your other device`);

        // Primary: 2. wait for details of existing device
        // Secondary: 4. wait for details of existing device
        logger.info('Waiting for login_token');
        // eslint-disable-next-line camelcase
        const _res = await this.pollForData();
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

        await this.sendData(data);

        return login;
    }

    async startOnExistingDevice(): Promise<boolean> {
        if (!this.uri || !this.cli) {
            throw new Error('Rendezvous not set up');
        }

        if (this.theirPublicKey) {
            await this.sendData({ type: "existing_device", algorithm: ALGORITHM, key: { x: encodeBase64Url(this.ourPublicKey) } });
        }

        logger.info('Waiting for other device to send their public key');
        const res = await this.pollForData(); // ack
        if (!res) {
            return false;
        }
        const { type, key, algorithm } = res;
        if (type !== "new_device") {
            logger.info('Other device is already signed in');
            if (!this.theirPublicKey) {
                await this.sendData({ type: "existing_device", algorithm: ALGORITHM, key: { x: encodeBase64Url(this.ourPublicKey) } });
            }
            await this.cancel(RendezvousCancellationReason.OtherDeviceAlreadySignedIn);
            // alert('The other device is already signed in');
            return false;
        }

        if (algorithm !== ALGORITHM) {
            throw new Error('Unsupported algorithm');
        }

        if (!key?.x) {
            throw new Error('Invalid key');
        }

        if (this.theirPublicKey) {
            // check that the same public key was at the rendezvous point
            if (key.x !== encodeBase64Url(this.theirPublicKey)) {
                throw new Error('Key mismatch - potential tampering');
            }
        } else {
            this.theirPublicKey = decodeBase64Url(key.x);
        }

        this.sharedSecret = ed.curve25519.scalarMult(this.ourPrivateKey, this.theirPublicKey);

        // these digits are to reassure the user that they are communicating with the same device rather than anything else
        const digits = Math.random().toString().slice(2, 8);

        await this.sendData({ digits });
        logger.info('Waiting for ack of confirmation digits');
        const _res = await this.pollForData(); // echo of digits back
        if (!_res) {
            return false;
        }

        logger.info(`Sent confirmation digits: ${digits}`);

        if (this.onConfirmationDigits) {
            this.onConfirmationDigits(digits);
        }

        return true;
    }

    async declineLoginOnExistingDevice() {
        logger.info('User declined linking');
        await this.sendData({ outcome: 'declined' });
    }

    async confirmLoginOnExistingDevice(): Promise<string | undefined> {
        logger.info("Requesting login token");
        // eslint-disable-next-line camelcase
        const { login_token } = await this.cli.http.authedRequest<{ login_token: string, expires_in: number }>(undefined, Method.Post, '/login/token', {}, {});

        // eslint-disable-next-line camelcase
        await this.sendData({ user: this.cli.getUserId(), homeserver: this.cli.baseUrl, login_token });

        logger.info('Waiting for outcome');
        const res = await this.pollForData();
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

    private async sendData(data: object) {
        if (this.cancelled) {
            return;
        }
        const method = this.uri ? "PUT" : "POST";
        const uri = this.uri ?? this.defaultRzServer;

        const body = JSON.stringify(this.sharedSecret ? await encryptAES(JSON.stringify(data), this.sharedSecret, 'rendezvous') : data);

        logger.info(`Sending data: ${JSON.stringify(data)} as ${body} to ${this.uri}`);

        const headers = this.etag ? { 'if-match': this.etag } : {};
        const res = await fetch(uri, { method,
            headers: { 'content-type': 'application/json', ...headers },
            body,
        });
        if (res.status === 404) {
            return this.cancel(RendezvousCancellationReason.Unknown);
        }
        this.etag = res.headers.get("etag");

        logger.info(`Posted data to ${this.uri} new sequence number ${this.etag}`);

        if (method === 'POST') {
            const { id } = await res.json();
            if (res.headers.has('expires')) {
                this.expiresAt = new Date(res.headers.get('expires'));
            }
            this.uri =`${uri}${id}`;
        }
    }

    private async checkAndCrossSignDevice(deviceInfo: DeviceInfo) {
        if (Object.keys(deviceInfo.keys).length !== Object.keys(this.newDeviceKeys).length) {
            throw new Error(`New device has different keys than expected: ${Object.keys(deviceInfo.keys).length} vs ${Object.keys(this.newDeviceKeys).length}`);
        }

        for (const keyId of Object.keys(this.newDeviceKeys)) {
            logger.info(`Checking ${keyId}: ${deviceInfo.keys[keyId]} vs ${this.newDeviceKeys[keyId]}`);
            if (deviceInfo.keys[keyId] !== this.newDeviceKeys[keyId]) {
                throw new Error(`New device has different keys than expected for ${keyId}`);
            }
        }
        return await this.cli.crypto.setDeviceVerification(this.cli.getUserId(), this.newDeviceId, true, false, true);
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

    private async pollForData() {
        if (!this.uri) {
            throw new Error('Rendezvous not set up');
        }
        let done = false;
        while (!done) {
            if (this.cancelled) {
                return;
            }
            logger.debug(`Polling: ${this.uri} after sequence number ${this.etag}`);
            const headers = this.etag ? { 'if-none-match': this.etag } : {};
            const poll = await fetch(this.uri, { method: "GET", headers });

            logger.debug(`Received polling response: ${poll.status} from ${this.uri}`);
            if (poll.status === 404) {
                return await this.cancel(RendezvousCancellationReason.Unknown);
            }

            if (poll.headers.get('content-type') !== 'application/json') {
                this.etag = poll.headers.get("etag");
            } else if (poll.status === 200) {
                this.etag = poll.headers.get("etag");
                const data = await poll.json();
                logger.info(`Received data: ${JSON.stringify(data)} from ${this.uri} with sequence number ${this.etag}`);
                if (data.ciphertext) {
                    if (!this.sharedSecret) {
                        throw new Error('Shared secret not set up');
                    }
                    const decrypted = await decryptAES(data, this.sharedSecret, 'rendezvous');
                    logger.info(`Decrypted data: ${decrypted}`);
                    return JSON.parse(decrypted);
                }
                return data;
            }

            done = false;
            await sleep(1000);
        }
    }

    async userCancelled(): Promise<void> {
        this.cancel(RendezvousCancellationReason.UserCancelled);
    }

    private async cancel(reason: RendezvousCancellationReason) {
        this.cancelled = true;
        if (this.uri && reason === RendezvousCancellationReason.UserDeclined) {
            try {
                logger.info(`Deleting channel: ${this.uri}`);
                await fetch(this.uri, { method: "DELETE" });
            } catch (e) {
                logger.warn(e);
            }
        }
        if (reason === RendezvousCancellationReason.Unknown && this.expiresAt && this.expiresAt.getTime() < Date.now()) {
            reason = RendezvousCancellationReason.Expired;
        }
        if (this.onCancelled) {
            this.onCancelled(reason);
        }
    }
}
