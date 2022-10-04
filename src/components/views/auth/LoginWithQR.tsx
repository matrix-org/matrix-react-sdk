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
import { MatrixClient } from 'matrix-js-sdk/src/client';

import { _t } from "../../../languageHandler";
import AccessibleButton from '../elements/AccessibleButton';
import { Rendezvous } from '../../../utils/Rendezvous';
import { MatrixClientPeg } from '../../../MatrixClientPeg';
import QRCode from '../elements/QRCode';
import defaultDispatcher from '../../../dispatcher/dispatcher';
import { Action } from '../../../dispatcher/actions';
import SdkConfig from '../../../SdkConfig';
import { ValidatedServerConfig } from '../../../utils/ValidatedServerConfig';
import Spinner from '../elements/Spinner';

enum Mode {
    SCAN,
    SHOW,
}

interface IProps {
    device: 'new' | 'existing';
    serverConfig?: ValidatedServerConfig;
    client?: MatrixClient;
    onFinished(...args: any): void;
}

interface IState {
    scannedRendezvous?: Rendezvous;
    generatedRendezvous?: Rendezvous;
    scannedCode?: string;
    confirmationDigits?: string;
    cancelled?: RendezvousCancellationReason;
    mediaPermissionError?: boolean;
    mode: Mode;
    scanning: boolean;
}

export default class LoginWithQR extends React.Component<IProps, IState> {
    constructor(props) {
        super(props);

        this.state = {
            mode: this.props.device === 'new' ? Mode.SHOW : Mode.SCAN,
            scanning: false,
        };

        void this.updateMode(this.state.mode, false);
    }

    private async updateMode(mode: Mode, setState = true) {
        if (setState) {
            this.setState({ mode });
        }

        if (mode === Mode.SCAN) {
            if (this.state.generatedRendezvous) {
                this.state.generatedRendezvous.onCancelled = undefined;
                this.state.generatedRendezvous.channel.transport.onCancelled = undefined;
                await this.state.generatedRendezvous.userCancelled();
                this.setState({ generatedRendezvous: undefined });
            }
            await this.requestMediaPermissions();
        } else {
            if (this.state.scannedRendezvous) {
                this.state.scannedRendezvous.onCancelled = undefined;
                this.state.scannedRendezvous.channel.transport.onCancelled = undefined;
                await this.state.scannedRendezvous.userCancelled();
                this.setState({ scannedRendezvous: undefined });
            }
            await this.generateCode();
        }
    }

    private get rendezvous(): Rendezvous {
        return this.state.generatedRendezvous ?? this.state.scannedRendezvous;
    }

    public componentWillUnmount(): void {
        if (this.rendezvous) {
            this.rendezvous.onCancelled = undefined;
            this.rendezvous.channel.transport.onCancelled = undefined;
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

    private generateCode = async () => {
        try {
            const fallbackServer = SdkConfig.get().login_with_qr?.default_http_transport_server
                ?? 'https://rendezvous.lab.element.dev'; // FIXME: remove this default value

            const transport = new SimpleHttpRendezvousTransport(
                this.onCancelled,
                this.props.client,
                this.props.serverConfig?.hsUrl,
                fallbackServer,
            );

            const channel = new ECDHv1RendezvousChannel(transport, this.props.client);

            const generatedRendezvous = new Rendezvous(channel, this.props.client);

            generatedRendezvous.onCancelled = this.onCancelled;
            await generatedRendezvous.generateCode();
            logger.info(generatedRendezvous.code);
            this.setState({
                generatedRendezvous,
                cancelled: undefined,
            });

            const confirmationDigits = await generatedRendezvous.start();
            this.setState({ confirmationDigits });

            if (this.props.device === 'new') {
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
            scannedCode: undefined,
            scanning: false,
        });
        void this.requestMediaPermissions();
    }

    private processScannedCode = async (scannedCode: string) => {
        // try {
        //     const parsed = JSON.parse(scannedCode);
        // } catch (err) {
        //     this.setState({ cancelled: RendezvousCancellationReason.InvalidCode });
        //     return;
        // }
        try {
            if (this.state.scannedCode === scannedCode) {
                return; // suppress duplicate scans
            }
            if (this.rendezvous) {
                await this.rendezvous.userCancelled();
                this.reset();
            }

            const client = this.props.device === 'existing' ? MatrixClientPeg.get() : undefined;
            console.log(scannedCode);
            const channel = await buildChannelFromCode(scannedCode, this.onCancelled, client);
            const scannedRendezvous = new Rendezvous(channel, client);
            this.setState({
                scannedCode,
                scannedRendezvous,
                cancelled: undefined,
            });

            const confirmationDigits = await scannedRendezvous.start();
            this.setState({ confirmationDigits });

            if (this.props.device === 'new') {
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

    private cancelClicked = () => {
        void (async () => {
            await this.rendezvous.userCancelled();
            this.reset();
            this.props.onFinished(false);
        })();
    };

    private declineClicked = () => {
        void (async () => {
            await this.rendezvous.declineLoginOnExistingDevice();
            this.reset();
            this.props.onFinished(false);
        })();
    };

    private tryAgainClicked = () => {
        this.reset();

        if (this.state.mode === Mode.SHOW) {
            void this.generateCode();
        }
    };

    private onQrResult: OnResultFunction = (result, error) => {
        if (result) {
            this.processScannedCode(result.getText());
        }
    };

    private viewFinder() {
        return <svg viewBox="0 0 100 100" className="mx_QRViewFinder">
            <path fill="none" d="M10,0 L0,0 L0,10" />
            <path fill="none" d="M0,90 L0,100 L10,100" />
            <path fill="none" d="M90,100 L100,100 L100,90" />
            <path fill="none" d="M100,10 L100,0 L90,0" />
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

    private onBackClick = () => {
        void this.state.generatedRendezvous?.userCancelled();
        void this.state.scannedRendezvous?.userCancelled();

        this.props.onFinished(false);
    };

    private onScanQRCodeClicked = () => {
        void this.updateMode(Mode.SCAN);
    };

    private onShowQRCodeClicked = () => {
        void this.updateMode(Mode.SHOW);
    };

    private onDoScanQRClicked = () => {
        this.setState({ scanning: true });
    };

    render() {
        let title: string;
        let main: JSX.Element | undefined;
        let buttons: JSX.Element | undefined;
        let backButton = true;

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
                    cancellationMessage = _t("The request was cancelled.");
                    break;
            }
            title = _t("Connection unsuccessful");
            main = <p>{ cancellationMessage }</p>;
            buttons = <>
                <AccessibleButton
                    kind="primary"
                    onClick={this.tryAgainClicked}
                >
                    { _t("Try again") }
                </AccessibleButton>
                <AccessibleButton
                    kind="primary_outline"
                    onClick={this.cancelClicked}
                >
                    { _t("Cancel") }
                </AccessibleButton>
            </>;
            backButton = false;
        } else if (this.state.confirmationDigits) {
            title = _t("Secure connection established");
            if (this.props.device === 'new') {
                main = <>
                    <p>{ _t("Check your signed in device, the code below should be displayed:") }</p>
                    <div className="mx_LoginWithQR_confirmationDigits">
                        { this.state.confirmationDigits }
                    </div>
                    <p>{ _t("If the code above matches the code on your other device, then confirm the sign in on that device.") }</p>
                </>;
                buttons = <>
                    <div className="mx_LoginWithQR_separator">
                        { _t("No match?") }
                    </div>
                    <AccessibleButton
                        kind="primary_outline"
                        onClick={this.cancelClicked}
                    >
                        { _t("Cancel") }
                    </AccessibleButton>
                </>;
            } else {
                main = <>
                    <p>{ _t("Check your other device - the code below should be displayed. If the code below matches the code on your other device then press confirm to link devices:") }</p>
                    <div className="mx_LoginWithQR_confirmationDigits">
                        { this.state.confirmationDigits }
                    </div>
                    <p>{ _t("Please ensure that you know the origin of this code. By linking devices, you will provide someone with full access to your account.") }</p>
                </>;

                buttons = <>
                    <AccessibleButton
                        kind="primary_outline"
                        onClick={this.declineClicked}
                    >
                        { _t("Cancel") }
                    </AccessibleButton>
                    <AccessibleButton
                        kind="primary"
                        onClick={this.approveLogin}
                    >
                        { _t("Confirm") }
                    </AccessibleButton>
                </>;
            }
        } else if (this.state.mode === Mode.SHOW) {
            title = this.props.device === 'existing' ? _t("Link a device") : _t("Sign in with QR code");
            if (this.state.generatedRendezvous) {
                const code = <div>
                    <div className="mx_Centre">
                        <QRCode data={this.state.generatedRendezvous.code} className="mx_QRCode" />
                    </div>
                </div>;

                if (this.props.device === 'existing') {
                    main = <>
                        <p>{ _t("Scan the QR code below with your device that’s signed out.") }</p>
                        <ol>
                            <li>{ _t("Open Element on your other device") }</li>
                            <li>{ _t("Select ‘Sign in with QR code’") }</li>
                        </ol>
                        { code }
                    </>;
                } else {
                    main = <>
                        <p>{ _t("Scan the QR code below with your other device signed in to Element to sign in instantly.") }</p>
                        <ol>
                            <li>{ _t("Open Element on your other device") }</li>
                            <li>{ _t("Go to Settings -> Security & Privacy") }</li>
                            <li>{ _t("Select ‘Link a device’") }</li>
                        </ol>
                        { code }
                    </>;
                }
            } else {
                main = <div className="mx_LoginWithQR_spinner"><Spinner /></div>;
            }
            buttons = <>
                <div className="mx_LoginWithQR_separator">
                    { _t("Need an alternative method?") }
                </div>
                <AccessibleButton
                    kind="primary_outline"
                    onClick={this.onScanQRCodeClicked}
                >
                    { _t("Scan QR code") }
                </AccessibleButton>
            </>;
        } else if (this.state.mode === Mode.SCAN) {
            title = this.props.device === 'existing' ? _t("Link a device") : _t("Sign in with QR code");
            if (!this.state.scanning) {
                if (this.props.device === 'existing') {
                    main = <>
                        <p>
                            <span>{ _t("Use the camera on this device to scan the QR code shown on your other device signed in to Element.") }</span>
                            <span> { _t("To get the QR code:") }</span>
                        </p>
                        <ol>
                            <li>{ _t("Open Element on your other device") }</li>
                            <li>{ _t("Select ‘Sign in with QR code’") }</li>
                            <li>{ _t("Select ‘Show QR code on this device’") }</li>
                        </ol>
                    </>;
                } else {
                    main = <>
                        <p>
                            <span>{ _t("Use the camera on this device to scan the QR code shown on your other device.") }</span>
                            <span> { _t("To get the QR code:") }</span>
                        </p>
                        <ol>
                            <li>{ _t("Open Element on your other device") }</li>
                            <li>{ _t("Go to Settings -> Security & Privacy") }</li>
                            <li>{ _t("Select ‘Link a device’") }</li>
                            <li>{ _t("Select ‘Show QR code on this device’") }</li>
                        </ol>
                    </>;
                }
                buttons = <>
                    <AccessibleButton
                        kind="primary"
                        onClick={this.onDoScanQRClicked}
                    >
                        { _t("Scan QR code") }
                    </AccessibleButton>
                    <div className="mx_LoginWithQR_separator">
                        { _t("Need an alternative method?") }
                    </div>
                    <AccessibleButton
                        kind="primary_outline"
                        onClick={this.onShowQRCodeClicked}
                    >
                        { _t("Show QR code on this device") }
                    </AccessibleButton>
                </>;
            } else {
                main = <>
                    <p>{ _t("Line up the QR code in the square below:") }</p>
                    <QrReader
                        className="mx_LoginWithQR_QRScanner"
                        constraints={{}}
                        onResult={this.onQrResult}
                        ViewFinder={this.viewFinder}
                    />
                </>;
                buttons = <AccessibleButton
                    kind="primary_outline"
                    onClick={this.cancelClicked}
                >
                    { _t("Cancel") }
                </AccessibleButton>;
            }
        }

        return (
            <div className="mx_LoginWithQR">
                <div>
                    { backButton ?
                        <AccessibleButton className="mx_LoginWithQR_BackButton" onClick={this.onBackClick} title="Back">Back</AccessibleButton>
                        : null }
                    <h1>{ title }</h1>
                </div>
                <div className="mx_LoginWithQR_main">
                    { main }
                </div>
                <div>
                    { buttons }
                </div>
            </div>
        );
    }
}
