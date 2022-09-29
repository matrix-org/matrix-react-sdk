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

import React from 'react';
import { buildChannelFromCode, RendezvousCancellationReason } from 'matrix-js-sdk/src/rendezvous';
import { SimpleHttpRendezvousTransport } from 'matrix-js-sdk/src/rendezvous/transports';
import { ECDHv1RendezvousChannel } from 'matrix-js-sdk/src/rendezvous/channels';
import { QrReader, OnResultFunction } from 'react-qr-reader';
import { logger } from 'matrix-js-sdk/src/logger';

import { _t } from "../../../languageHandler";
import BaseDialog from "./BaseDialog";
import { IDialogProps } from "./IDialogProps";
import AccessibleButton from '../elements/AccessibleButton';
import { Rendezvous } from '../../../utils/Rendezvous';
import { MatrixClientPeg } from '../../../MatrixClientPeg';
import QRCode from '../elements/QRCode';
import defaultDispatcher from '../../../dispatcher/dispatcher';
import { Action } from '../../../dispatcher/actions';
import SdkConfig from '../../../SdkConfig';

interface IProps extends IDialogProps {
    device: 'new' | 'existing';
}

interface IState {
    scannedRendezvous?: Rendezvous;
    generatedRendezvous?: Rendezvous;
    confirmationDigits?: string;
    cancelled?: RendezvousCancellationReason;
    mediaPermissionError?: boolean;
}

export default class RendezvousDialog extends React.Component<IProps, IState> {
    constructor(props) {
        super(props);

        this.state = {};

        if (this.props.device === 'new') {
            void this.generateRendezvous();
        } else {
            void this.requestMediaPermissions();
        }
    }

    private get rendezvous(): Rendezvous {
        return this.state.generatedRendezvous ?? this.state.scannedRendezvous;
    }

    public componentWillUnmount(): void {
        if (this.rendezvous) {
            void this.rendezvous.userCancelled();
        }
    }

    private approveLogin = async (): Promise<void> => {
        if (!this.rendezvous) {
            throw new Error('Rendezvous not found');
        }
        const newDeviceId = await this.rendezvous.confirmLoginOnExistingDevice();
        if (!newDeviceId) {
            // user denied
            return;
        }
        const cli = MatrixClientPeg.get();
        if (!cli.crypto) {
            // alert(`New device signed in: ${newDeviceId}. Not signing cross-signing as no crypto setup`);
            this.props.onFinished(true);
            return;
        }
        const didCrossSign = await this.rendezvous.crossSign();
        if (didCrossSign) {
            // alert(`New device signed in, cross signed and marked as known: ${newDeviceId}`);
        } else {
            // alert(`New device signed in, but no keys received for cross signing: ${newDeviceId}`);
        }
        this.props.onFinished(true);
    };

    private generateRendezvous = async () => {
        try {
            const defaultServer = SdkConfig.get().rendezvous?.default_http_transport_server
                ?? 'https://rendezvous.lab.element.dev'; // FIXME: remove this default value

            if (!defaultServer) {
                throw new Error('No default server configured');
            }
            const transport = new SimpleHttpRendezvousTransport(this.onCancelled, defaultServer);

            const client = this.props.device === 'existing' ? MatrixClientPeg.get() : undefined;

            const channel = new ECDHv1RendezvousChannel(transport, client);

            const generatedRendezvous = new Rendezvous(channel, client);

            generatedRendezvous.onConfirmationDigits = this.onConfirmationDigits;
            generatedRendezvous.onCancelled = this.onCancelled;
            await generatedRendezvous.generateCode();
            logger.info(generatedRendezvous.code);
            this.setState({
                generatedRendezvous,
                cancelled: undefined,
            });
            if (this.props.device === 'existing') {
                await generatedRendezvous.startOnExistingDevice();
            } else {
                const res = await generatedRendezvous.completeOnNewDevice();
                if (res) {
                    this.props.onFinished(true);
                    defaultDispatcher.dispatch({
                        action: Action.ViewHomePage,
                    });
                }
            }
        } catch (e) {
            logger.error(e);
            if (this.rendezvous) {
                await this.rendezvous.cancel(RendezvousCancellationReason.Unknown);
            }
        }
    };

    private onConfirmationDigits = (confirmationDigits: string) => {
        this.setState({ confirmationDigits });
    };

    private onCancelled = (reason: RendezvousCancellationReason) => {
        logger.info(`Rendezvous cancelled: ${reason}`);
        this.setState({ cancelled: reason });
    };

    reset() {
        this.setState({
            scannedRendezvous: undefined,
            generatedRendezvous: undefined,
            confirmationDigits: undefined,
            cancelled: undefined,
        });
        void this.requestMediaPermissions();
    }

    private doScannedRendezvous = async (scannedCode: string) => {
        // try {
        //     const parsed = JSON.parse(scannedCode);
        // } catch (err) {
        //     this.setState({ cancelled: RendezvousCancellationReason.InvalidCode });
        //     return;
        // }
        try {
            const client = this.props.device === 'existing' ? MatrixClientPeg.get() : undefined;
            const channel = await buildChannelFromCode(scannedCode, this.onCancelled, client);
            const scannedRendezvous = new Rendezvous(channel, client);
            scannedRendezvous.onConfirmationDigits = this.onConfirmationDigits;
            this.setState({
                scannedRendezvous,
                cancelled: undefined,
            });
            if (this.props.device === 'existing') {
                await scannedRendezvous.startOnExistingDevice();
            } else {
                const res = await scannedRendezvous.completeOnNewDevice();
                if (res) {
                    this.props.onFinished(true);
                    defaultDispatcher.dispatch({
                        action: Action.ViewHomePage,
                    });
                }
            }
        } catch (e) {
            alert(e);
        }
    };

    private cancel = () => {
        if (this.rendezvous) {
            if (this.state.confirmationDigits) {
                if (this.props.device === 'existing') {
                    void this.rendezvous.declineLoginOnExistingDevice();
                }
            }
            void this.rendezvous.userCancelled();
            this.reset();
        }
    };

    private tryAgain = () => {
        if (this.state.generatedRendezvous) {
            this.reset();
            void this.generateRendezvous();
        } else {
            this.reset();
        }
    };

    private onQrResult: OnResultFunction = (result, error) => {
        if (result) {
            this.doScannedRendezvous(result.getText());
        }
    };

    private viewFinder() {
        return <svg viewBox="0 0 100 100" className="mx_QRViewFinder">
            <path fill="none" d="M15,0 L0,0 L0,15" />
            <path fill="none" d="M0,85 L0,100 L15,100" />
            <path fill="none" d="M85,100 L100,100 L100,85" />
            <path fill="none" d="M100,15 L100,0 L85,0" />
        </svg>;
    }

    private requestMediaPermissions = async () => {
        try {
            await navigator.mediaDevices.getUserMedia({ video: true });
            this.setState({ mediaPermissionError: false });
        } catch (err) {
            this.setState({ mediaPermissionError: true });
        }
    };

    render() {
        let pasted;
        let generated;
        let confirm;
        let cancelled;

        if (this.state.cancelled) {
            let cancellationMessage: string;
            switch (this.state.cancelled) {
                case RendezvousCancellationReason.Expired:
                    cancellationMessage = _t("The linking wasn't completed in the required time.");
                    break;
                case RendezvousCancellationReason.InvalidCode:
                    cancellationMessage = _t("The scanned code is invalid.");
                    break;
                case RendezvousCancellationReason.UnsupportedAlgorithm:
                    cancellationMessage = _t("Linking with this device is not supported.");
                    break;
                case RendezvousCancellationReason.UserDeclined:
                    cancellationMessage = _t("The request was declined on the other device.");
                    break;
                case RendezvousCancellationReason.OtherDeviceAlreadySignedIn:
                    cancellationMessage = _t("The other device is already signed in.");
                    break;
                case RendezvousCancellationReason.OtherDeviceNotSignedIn:
                    cancellationMessage = _t("The other device isn't signed in.");
                    break;
                case RendezvousCancellationReason.UserCancelled:
                    cancellationMessage = _t("The request was cancelled.");
                    break;
                case RendezvousCancellationReason.Unknown:
                    cancellationMessage = _t("An unexpected error occurred.");
                    break;
                default:
                    cancellationMessage = _t("Th request was cancelled.");
                    break;
            }
            cancelled = <div>
                <div className="mx_Centre">
                    <p>{ cancellationMessage }</p>
                </div>
                <div className="mx_Centre">
                    <AccessibleButton
                        kind="primary"
                        onClick={this.tryAgain}
                    >
                        { _t("Try again") }
                    </AccessibleButton>
                </div>
            </div>;
        } else {
            if (this.state.confirmationDigits) {
                confirm =
                <div>
                    <p>Secure connection established.</p>
                    { this.props.device === 'new' ?
                        <p>Please follow the instructions on your other device to complete sign in.</p>
                        :
                        null
                    }
                    <p>The code { this.state.confirmationDigits } should be displayed on the other device.</p>
                    { this.props.device === 'existing' ?
                        <div>
                            Do you want to sign it in?
                            <div className="mx_Centre">
                                <AccessibleButton
                                    kind="primary"
                                    onClick={this.approveLogin}
                                >
                                    { _t("Confirm") }
                                </AccessibleButton>
                                <AccessibleButton
                                    kind="danger_outline"
                                    onClick={this.cancel}
                                >
                                    { _t("Cancel") }
                                </AccessibleButton>
                            </div>
                        </div>
                        :
                        <div className="mx_Centre">
                            <AccessibleButton
                                kind="danger_outline"
                                onClick={this.cancel}
                            >
                                { _t("Cancel") }
                            </AccessibleButton>
                        </div>
                    }
                </div>;
            } else if (this.state.generatedRendezvous) {
                generated = <div>
                    <p>{ _t("Scan this QR code using your other device:") }</p>
                    <div>
                        <div className="mx_Centre">
                            <QRCode data={this.state.generatedRendezvous.code} className="mx_QRCode" />
                        </div>
                        <div className="mx_Centre">
                            <AccessibleButton
                                kind="primary"
                                onClick={this.cancel}
                            >
                                { _t("Scan using this device instead") }
                            </AccessibleButton>
                        </div>
                    </div>
                </div>;
            } else if (!this.state.scannedRendezvous) {
                pasted = <>
                    <div>
                        <p>{ _t("Use your camera to scan the QR code shown on your other device:") }</p>
                        <div className="mx_Centre">
                            <QrReader
                                className="mx_QRScanner"
                                constraints={{}}
                                onResult={this.onQrResult}
                                ViewFinder={this.viewFinder}
                            />
                        </div>
                        <div className="mx_Centre">
                            <AccessibleButton
                                kind="primary"
                                onClick={this.generateRendezvous}
                            >
                                { _t("Show code on this device instead") }
                            </AccessibleButton>
                        </div>
                    </div>
                </>;
            }
        }

        const title = this.props.device === 'existing' ? _t("Link another device") : _t("Sign in using another device");

        return (
            <BaseDialog
                // hasCancel={true}
                onFinished={this.props.onFinished}
                title={title}
                className="mx_RendezvousDialog"
                contentId="mx_RendezvousDevice"
            >
                { cancelled }
                { confirm }
                { pasted }
                { generated }
                { !cancelled && !confirm && !pasted && !generated ? <p>Connecting...</p> : null }
            </BaseDialog>
        );
    }
}
