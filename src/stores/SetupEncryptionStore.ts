/*
Copyright 2020 The Matrix.org Foundation C.I.C.

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

import EventEmitter from 'events';
import { VerificationRequest } from "matrix-js-sdk/src/crypto/verification/request/VerificationRequest";
import { IKeyBackupVersion } from "matrix-js-sdk/src/crypto/keybackup";
import { ISecretStorageKeyInfo } from "matrix-js-sdk/src/matrix";
import { MatrixClientPeg } from '../MatrixClientPeg';
import { accessSecretStorage, AccessCancelledError } from '../SecurityManager';
import { PHASE_DONE as VERIF_PHASE_DONE } from "matrix-js-sdk/src/crypto/verification/request/VerificationRequest";

export enum Phase {
    Loading = 0,
    Intro = 1,
    Busy = 2,
    Done = 3, // final done stage, but still showing UX
    ConfirmSkip = 4,
    Finished = 5, // UX can be closed
}

export class SetupEncryptionStore extends EventEmitter {
    private started: boolean;
    public phase: Phase;
    public verificationRequest: VerificationRequest;
    public backupInfo: IKeyBackupVersion;
    public keyId: string;
    public keyInfo: ISecretStorageKeyInfo;
    public hasDevicesToVerifyAgainst: boolean;

    public static sharedInstance() {
        if (!window.mxSetupEncryptionStore) window.mxSetupEncryptionStore = new SetupEncryptionStore();
        return window.mxSetupEncryptionStore;
    }

    public start(): void {
        if (this.started) {
            return;
        }
        this.started = true;
        this.phase = Phase.Loading;
        this.verificationRequest = null;
        this.backupInfo = null;

        // ID of the key that the secrets we want are encrypted with
        this.keyId = null;
        // Descriptor of the key that the secrets we want are encrypted with
        this.keyInfo = null;

        const cli = MatrixClientPeg.get();
        cli.on("crypto.verification.request", this.onVerificationRequest);
        cli.on('userTrustStatusChanged', this.onUserTrustStatusChanged);

        const requestsInProgress = cli.getVerificationRequestsToDeviceInProgress(cli.getUserId());
        if (requestsInProgress.length) {
            // If there are multiple, we take the most recent. Equally if the user sends another request from
            // another device after this screen has been shown, we'll switch to the new one, so this
            // generally doesn't support multiple requests.
            this.setActiveVerificationRequest(requestsInProgress[requestsInProgress.length - 1]);
        }

        this.fetchKeyInfo();
    }

    public stop(): void {
        if (!this.started) {
            return;
        }
        this.started = false;
        if (this.verificationRequest) {
            this.verificationRequest.off("change", this.onVerificationRequestChange);
        }
        if (MatrixClientPeg.get()) {
            MatrixClientPeg.get().removeListener("crypto.verification.request", this.onVerificationRequest);
            MatrixClientPeg.get().removeListener('userTrustStatusChanged', this.onUserTrustStatusChanged);
        }
    }

    public async fetchKeyInfo(): Promise<void> {
        const cli = MatrixClientPeg.get();
        const keys = await cli.isSecretStored('m.cross_signing.master', false);
        if (keys === null || Object.keys(keys).length === 0) {
            this.keyId = null;
            this.keyInfo = null;
        } else {
            // If the secret is stored under more than one key, we just pick an arbitrary one
            this.keyId = Object.keys(keys)[0];
            this.keyInfo = keys[this.keyId];
        }

        // do we have any other devices which are E2EE which we can verify against?
        const dehydratedDevice = await cli.getDehydratedDevice();
        this.hasDevicesToVerifyAgainst = cli.getStoredDevicesForUser(cli.getUserId()).some(
            device =>
                device.getIdentityKey() &&
                (!dehydratedDevice || (device.deviceId != dehydratedDevice.device_id)),
        );

        if (!this.hasDevicesToVerifyAgainst && !this.keyInfo) {
            // skip before we can even render anything.
            this.phase = Phase.Finished;
        } else {
            this.phase = Phase.Intro;
        }
        this.emit("update");
    }

    public async usePassPhrase(): Promise<void> {
        this.phase = Phase.Busy;
        this.emit("update");
        const cli = MatrixClientPeg.get();
        try {
            const backupInfo = await cli.getKeyBackupVersion();
            this.backupInfo = backupInfo;
            this.emit("update");
            // The control flow is fairly twisted here...
            // For the purposes of completing security, we only wait on getting
            // as far as the trust check and then show a green shield.
            // We also begin the key backup restore as well, which we're
            // awaiting inside `accessSecretStorage` only so that it keeps your
            // passphase cached for that work. This dialog itself will only wait
            // on the first trust check, and the key backup restore will happen
            // in the background.
            await new Promise((resolve: (value?: unknown) => void, reject: (reason?: any) => void) => {
                accessSecretStorage(async () => {
                    await cli.checkOwnCrossSigningTrust();
                    resolve();
                    if (backupInfo) {
                        // A complete restore can take many minutes for large
                        // accounts / slow servers, so we allow the dialog
                        // to advance before this.
                        await cli.restoreKeyBackupWithSecretStorage(backupInfo);
                    }
                }).catch(reject);
            });

            if (cli.getCrossSigningId()) {
                this.phase = Phase.Done;
                this.emit("update");
            }
        } catch (e) {
            if (!(e instanceof AccessCancelledError)) {
                console.log(e);
            }
            // this will throw if the user hits cancel, so ignore
            this.phase = Phase.Intro;
            this.emit("update");
        }
    }

    private onUserTrustStatusChanged = (userId: string) => {
        if (userId !== MatrixClientPeg.get().getUserId()) return;
        const publicKeysTrusted = MatrixClientPeg.get().getCrossSigningId();
        if (publicKeysTrusted) {
            this.phase = Phase.Done;
            this.emit("update");
        }
    }

    public onVerificationRequest = (request: VerificationRequest): void => {
        this.setActiveVerificationRequest(request);
    }

    public onVerificationRequestChange = (): void => {
        if (this.verificationRequest.cancelled) {
            this.verificationRequest.off("change", this.onVerificationRequestChange);
            this.verificationRequest = null;
            this.emit("update");
        } else if (this.verificationRequest.phase === VERIF_PHASE_DONE) {
            this.verificationRequest.off("change", this.onVerificationRequestChange);
            this.verificationRequest = null;
            // At this point, the verification has finished, we just need to wait for
            // cross signing to be ready to use, so wait for the user trust status to
            // change (or change to DONE if it's already ready).
            const publicKeysTrusted = MatrixClientPeg.get().getCrossSigningId();
            this.phase = publicKeysTrusted ? Phase.Done : Phase.Busy;
            this.emit("update");
        }
    }

    public skip(): void {
        this.phase = Phase.ConfirmSkip;
        this.emit("update");
    }

    public skipConfirm(): void {
        this.phase = Phase.Finished;
        this.emit("update");
    }

    public returnAfterSkip(): void {
        this.phase = Phase.Intro;
        this.emit("update");
    }

    public done(): void {
        this.phase = Phase.Finished;
        this.emit("update");
        // async - ask other clients for keys, if necessary
        MatrixClientPeg.get().crypto.cancelAndResendAllOutgoingKeyRequests();
    }

    private async setActiveVerificationRequest(request: VerificationRequest): Promise<void> {
        if (request.otherUserId !== MatrixClientPeg.get().getUserId()) return;

        if (this.verificationRequest) {
            this.verificationRequest.off("change", this.onVerificationRequestChange);
        }
        this.verificationRequest = request;
        await request.accept();
        request.on("change", this.onVerificationRequestChange);
        this.emit("update");
    }
}
