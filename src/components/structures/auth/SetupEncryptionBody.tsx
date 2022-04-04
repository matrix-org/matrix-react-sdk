/*
Copyright 2020-2021 The Matrix.org Foundation C.I.C.

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

import React from 'react';
import { ISecretStorageKeyInfo } from 'matrix-js-sdk/src/crypto/api';
import { IKeyBackupInfo } from "matrix-js-sdk/src/crypto/keybackup";
import { VerificationRequest } from "matrix-js-sdk/src/crypto/verification/request/VerificationRequest";
import { logger } from "matrix-js-sdk/src/logger";

import { _t } from '../../../languageHandler';
import { MatrixClientPeg } from '../../../MatrixClientPeg';
import Modal from '../../../Modal';
import VerificationRequestDialog from '../../views/dialogs/VerificationRequestDialog';
import { SetupEncryptionStore, Phase } from '../../../stores/SetupEncryptionStore';
import { replaceableComponent } from "../../../utils/replaceableComponent";
import EncryptionPanel from "../../views/right_panel/EncryptionPanel";
import AccessibleButton from '../../views/elements/AccessibleButton';
import Spinner from '../../views/elements/Spinner';

function keyHasPassphrase(keyInfo: ISecretStorageKeyInfo): boolean {
    return Boolean(
        keyInfo.passphrase &&
        keyInfo.passphrase.salt &&
        keyInfo.passphrase.iterations,
    );
}

interface IProps {
    onFinished: () => void;
}

interface IState {
    phase: Phase;
    verificationRequest: VerificationRequest;
    backupInfo: IKeyBackupInfo;
    lostKeys: boolean;
}

@replaceableComponent("structures.auth.SetupEncryptionBody")
export default class SetupEncryptionBody extends React.Component<IProps, IState> {
    constructor(props) {
        super(props);
        const store = SetupEncryptionStore.sharedInstance();
        store.on("update", this.onStoreUpdate);
        store.start();
        this.state = {
            phase: store.phase,
            // this serves dual purpose as the object for the request logic and
            // the presence of it indicating that we're in 'verify mode'.
            // Because of the latter, it lives in the state.
            verificationRequest: store.verificationRequest,
            backupInfo: store.backupInfo,
            lostKeys: store.lostKeys(),
        };
    }

    private onStoreUpdate = () => {
        const store = SetupEncryptionStore.sharedInstance();
        if (store.phase === Phase.Finished) {
            this.props.onFinished();
            return;
        }
        this.setState({
            phase: store.phase,
            verificationRequest: store.verificationRequest,
            backupInfo: store.backupInfo,
            lostKeys: store.lostKeys(),
        });
    };

    public componentWillUnmount() {
        const store = SetupEncryptionStore.sharedInstance();
        store.off("update", this.onStoreUpdate);
        store.stop();
    }

    private onUsePassphraseClick = async () => {
        const store = SetupEncryptionStore.sharedInstance();
        store.usePassPhrase();
    };

    private onVerifyClick = () => {
        const cli = MatrixClientPeg.get();
        const userId = cli.getUserId();
        const requestPromise = cli.requestVerification(userId);

        // We need to call onFinished now to close this dialog, and
        // again later to signal that the verification is complete.
        this.props.onFinished();
        Modal.createTrackedDialog('New Session Verification', 'Starting dialog', VerificationRequestDialog, {
            verificationRequestPromise: requestPromise,
            member: cli.getUser(userId),
            onFinished: async () => {
                const request = await requestPromise;
                request.cancel();
                this.props.onFinished();
            },
        });
    };

    private onSkipConfirmClick = () => {
        const store = SetupEncryptionStore.sharedInstance();
        store.skipConfirm();
    };

    private onSkipBackClick = () => {
        const store = SetupEncryptionStore.sharedInstance();
        store.returnAfterSkip();
    };

    private onResetClick = (ev: React.MouseEvent<HTMLButtonElement>) => {
        ev.preventDefault();
        const store = SetupEncryptionStore.sharedInstance();
        store.reset();
    };

    private onResetConfirmClick = () => {
        this.props.onFinished();
        const store = SetupEncryptionStore.sharedInstance();
        store.resetConfirm();
    };

    private onResetBackClick = () => {
        const store = SetupEncryptionStore.sharedInstance();
        store.returnAfterReset();
    };

    private onDoneClick = () => {
        const store = SetupEncryptionStore.sharedInstance();
        store.done();
    };

    private onEncryptionPanelClose = () => {
        this.props.onFinished();
    };

    public render() {
        const {
            phase,
            lostKeys,
        } = this.state;

        if (this.state.verificationRequest) {
            return <EncryptionPanel
                layout="dialog"
                verificationRequest={this.state.verificationRequest}
                onClose={this.onEncryptionPanelClose}
                member={MatrixClientPeg.get().getUser(this.state.verificationRequest.otherUserId)}
                isRoomEncrypted={false}
            />;
        } else if (phase === Phase.Intro) {
            if (lostKeys) {
                return (
                    <div>
                        <p>{ _t(
                            "It looks like you don't have a recovery key or any other devices you can use to complete " +
                            "the setup of secure messaging. As a result, this device won't be able to access past encrypted messages. " +
                            "In order to verify your identity on this device, you'll need to reset " +
                            "secure messaging completely.",
                        ) }</p>

                        <div className="mx_CompleteSecurity_actionRow">
                            <AccessibleButton kind="primary" onClick={this.onResetConfirmClick}>
                                { _t("Reset secure messaging") }
                            </AccessibleButton>
                        </div>
                    </div>
                );
            } else {
                const store = SetupEncryptionStore.sharedInstance();
                let recoveryKeyPrompt;
                if (store.keyInfo && keyHasPassphrase(store.keyInfo)) {
                    recoveryKeyPrompt = _t("Use recovery key or passphrase");
                } else if (store.keyInfo) {
                    recoveryKeyPrompt = _t("Use recovery key");
                }

                let useRecoveryKeyButton;
                if (recoveryKeyPrompt) {
                    useRecoveryKeyButton = <AccessibleButton kind="primary" onClick={this.onUsePassphraseClick}>
                        { recoveryKeyPrompt }
                    </AccessibleButton>;
                }

                let verifyButton;
                if (store.hasDevicesToVerifyAgainst) {
                    verifyButton = <AccessibleButton kind="primary" onClick={this.onVerifyClick}>
                        { _t("Use another device") }
                    </AccessibleButton>;
                }

                return (
                    <div>
                        <p>{ _t(
                            "Setup secure messaging on this device to access past encrypted messages and allow others to trust it.",
                        ) }</p>
                        <p>{ _t(
                            "Please select how you would like to do the setup.",
                        ) }</p>

                        <div className="mx_CompleteSecurity_actionRow">
                            { verifyButton }
                            { useRecoveryKeyButton }
                        </div>
                        <div className="mx_SetupEncryptionBody_reset">
                            { _t("Forgotten or lost all setup methods? <a>Reset secure messaging</a>", null, {
                                a: (sub) => <button
                                    onClick={this.onResetClick}
                                    className="mx_SetupEncryptionBody_reset_link mx_Dialog_nonDialogButton">
                                    { sub }
                                </button>,
                            }) }
                        </div>
                    </div>
                );
            }
        } else if (phase === Phase.Done) {
            let message;
            if (this.state.backupInfo) {
                message = <p>{ _t(
                    "Secure messaging is now setup on this device and you can access your past encrypted message. " +
                    "Others will see this device as trusted.",
                ) }</p>;
            } else {
                message = <p>{ _t(
                    "Secure messaging is now setup on this device and others will see it as trusted.",
                ) }</p>;
            }
            return (
                <div>
                    <div className="mx_CompleteSecurity_heroIcon mx_E2EIcon_verified" />
                    { message }
                    <div className="mx_CompleteSecurity_actionRow">
                        <AccessibleButton
                            kind="primary"
                            onClick={this.onDoneClick}
                        >
                            { _t("Done") }
                        </AccessibleButton>
                    </div>
                </div>
            );
        } else if (phase === Phase.ConfirmSkip) {
            return (
                <div>
                    <p>{ _t(
                        "Without setting up secure messaging you won't have access to past encrypted messages. " +
                        "This device may also appear as untrusted to others.",
                    ) }</p>
                    <div className="mx_CompleteSecurity_actionRow">
                        <AccessibleButton
                            kind="danger_outline"
                            onClick={this.onSkipConfirmClick}
                        >
                            { _t("Setup later") }
                        </AccessibleButton>
                        <AccessibleButton
                            kind="primary"
                            onClick={this.onSkipBackClick}
                        >
                            { _t("Go back") }
                        </AccessibleButton>
                    </div>
                </div>
            );
        } else if (phase === Phase.ConfirmReset) {
            return (
                <div>
                    <p>{ _t(
                        "By resetting secure messaging you will lose access to your past encrypted messages. " +
                        "Also, any contact who has previously verified you will see this device as untrusted.",
                    ) }</p>
                    <p>{ _t(
                        "You should only proceed if you are certain that you cannot access your other devices and have lost " +
                        "your recovery key.",
                    ) }</p>

                    <div className="mx_CompleteSecurity_actionRow">
                        <AccessibleButton kind="danger_outline" onClick={this.onResetConfirmClick}>
                            { _t("Proceed with reset") }
                        </AccessibleButton>
                        <AccessibleButton kind="primary" onClick={this.onResetBackClick}>
                            { _t("Go Back") }
                        </AccessibleButton>
                    </div>
                </div>
            );
        } else if (phase === Phase.Busy || phase === Phase.Loading) {
            return <Spinner />;
        } else {
            logger.log(`SetupEncryptionBody: Unknown phase ${phase}`);
        }
    }
}
