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
import { buildChannelFromCode, Rendezvous, RendezvousFailureReason } from 'matrix-js-sdk/src/rendezvous';
import { SimpleHttpRendezvousTransport } from 'matrix-js-sdk/src/rendezvous/transports';
import { ECDHv1RendezvousChannel } from 'matrix-js-sdk/src/rendezvous/channels';
import { QrReader, OnResultFunction } from 'react-qr-reader';
import { logger } from 'matrix-js-sdk/src/logger';
import { MatrixClient } from 'matrix-js-sdk/src/client';

import { _t } from "../../../languageHandler";
import AccessibleButton from '../elements/AccessibleButton';
import { MatrixClientPeg } from '../../../MatrixClientPeg';
import QRCode from '../elements/QRCode';
import defaultDispatcher from '../../../dispatcher/dispatcher';
import { Action } from '../../../dispatcher/actions';
import SdkConfig from '../../../SdkConfig';
import { ValidatedServerConfig } from '../../../utils/ValidatedServerConfig';
import Spinner from '../elements/Spinner';
import { Icon as BackButtonIcon } from "../../../../res/img/element-icons/back.svg";
import { Icon as DevicesIcon } from "../../../../res/img/element-icons/devices.svg";
import { Icon as WarningBadge } from "../../../../res/img/element-icons/warning-badge.svg";
import { Icon as InfoIcon } from "../../../../res/img/element-icons/i.svg";
import { setLoggedIn } from '../../../Lifecycle';

export enum Mode {
    SCAN = "scan",
    SHOW = "show",
}

interface IProps {
    device: 'new' | 'existing';
    serverConfig?: ValidatedServerConfig;
    client?: MatrixClient;
    mode: Mode;
    onFinished(...args: any): void;
}

interface IState {
    scannedRendezvous?: Rendezvous;
    generatedRendezvous?: Rendezvous;
    scannedCode?: string;
    confirmationDigits?: string;
    cancelled?: RendezvousFailureReason;
    mediaPermissionError?: boolean;
    scanning: boolean;
}

/**
 * A component that allows sign in and E2EE set up with a QR code.
 *
 * It implements both `login.start` and `login-reciprocate` capabilities as well as both scanning and showing QR codes.
 *
 * This uses the unstable feature of MSC3906: https://github.com/matrix-org/matrix-spec-proposals/pull/3906
 */
export default class LoginWithQR extends React.Component<IProps, IState> {
    constructor(props) {
        super(props);

        this.state = {
            scanning: false,
        };
    }

    componentDidMount(): void {
        void this.updateMode(this.props.mode);
    }

    componentDidUpdate(prevProps: Readonly<IProps>): void {
        if (prevProps.mode !== this.props.mode) {
            void this.updateMode(this.props.mode);
        }
    }

    private async updateMode(mode: Mode) {
        if (mode === Mode.SCAN) {
            if (this.state.generatedRendezvous) {
                this.state.generatedRendezvous.onFailure = undefined;
                this.state.generatedRendezvous.channel.transport.onFailure = undefined;
                await this.state.generatedRendezvous.userCancelled();
                this.setState({ generatedRendezvous: undefined });
            }
        } else {
            if (this.state.scannedRendezvous) {
                this.state.scannedRendezvous.onFailure = undefined;
                this.state.scannedRendezvous.channel.transport.onFailure = undefined;
                await this.state.scannedRendezvous.userCancelled();
                this.setState({ scannedRendezvous: undefined });
            }
            await this.generateCode();
        }
    }

    private get rendezvous(): Rendezvous | undefined {
        return this.state.generatedRendezvous ?? this.state.scannedRendezvous;
    }

    public componentWillUnmount(): void {
        if (this.rendezvous) {
            this.rendezvous.onFailure = undefined;
            this.rendezvous.channel.transport.onFailure = undefined;
            // calling cancel will call close() as well to clean up the resources
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

            const transport = new SimpleHttpRendezvousTransport({
                onFailure: this.onFailure,
                client: this.props.client,
                hsUrl: this.props.serverConfig?.hsUrl,
                fallbackRzServer: fallbackServer,
                fetch: MatrixClientPeg.get().http.fetch,
            });

            const channel = new ECDHv1RendezvousChannel(transport);

            const generatedRendezvous = new Rendezvous(channel, this.props.client);

            generatedRendezvous.onFailure = this.onFailure;
            await generatedRendezvous.generateCode();
            logger.info(generatedRendezvous.code);
            this.setState({
                generatedRendezvous,
                cancelled: undefined,
            });

            const confirmationDigits = await generatedRendezvous.startAfterShowingCode();
            this.setState({ confirmationDigits });

            if (this.isNewDevice) {
                const creds = await generatedRendezvous.completeLoginOnNewDevice();
                if (creds) {
                    await setLoggedIn({
                        accessToken: creds.accessToken,
                        userId: creds.userId,
                        deviceId: creds.deviceId,
                        homeserverUrl: creds.homeserverUrl,
                    });
                    await generatedRendezvous.completeVerificationOnNewDevice(MatrixClientPeg.get());
                    this.props.onFinished(true);
                    defaultDispatcher.dispatch({
                        action: Action.ViewHomePage,
                    });
                }
            }
        } catch (e) {
            logger.error(e);
            if (this.rendezvous) {
                await this.rendezvous.cancel(RendezvousFailureReason.Unknown);
            }
        }
    };

    private onFailure = (reason: RendezvousFailureReason) => {
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
    }

    private get isExistingDevice(): boolean {
        return this.props.device === 'existing';
    }

    private get isNewDevice(): boolean {
        return this.props.device === 'new';
    }

    private processScannedCode = async (scannedCode: string) => {
        // try {
        //     const parsed = JSON.parse(scannedCode);
        // } catch (err) {
        //     this.setState({ cancelled: RendezvousFailureReason.InvalidCode });
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

            const { channel, intent: theirIntent } = await buildChannelFromCode(
                scannedCode,
                this.onFailure,
                MatrixClientPeg.get().http.fetch,
            );

            const scannedRendezvous = new Rendezvous(channel, this.props.client);
            this.setState({
                scannedCode,
                scannedRendezvous,
                cancelled: undefined,
            });

            const confirmationDigits = await scannedRendezvous.startAfterScanningCode(theirIntent);
            this.setState({ confirmationDigits });

            if (this.isNewDevice) {
                const creds = await scannedRendezvous.completeLoginOnNewDevice();
                if (creds) {
                    await setLoggedIn({
                        accessToken: creds.accessToken,
                        userId: creds.userId,
                        deviceId: creds.deviceId,
                        homeserverUrl: creds.homeserverUrl,
                    });
                    await scannedRendezvous.completeVerificationOnNewDevice(MatrixClientPeg.get());
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
            await this.rendezvous?.userCancelled();
            this.reset();
            this.props.onFinished(false);
        })();
    };

    private declineClicked = () => {
        void (async () => {
            await this.rendezvous?.declineLoginOnExistingDevice();
            this.reset();
            this.props.onFinished(false);
        })();
    };

    private tryAgainClicked = () => {
        this.reset();

        if (this.props.mode === Mode.SHOW) {
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

    private onDoScanQRClicked = () => {
        this.setState({ scanning: true });
        void this.requestMediaPermissions();
    };

    render() {
        let title: string;
        let titleIcon: JSX.Element | undefined;
        let main: JSX.Element | undefined;
        let buttons: JSX.Element | undefined;
        let backButton = true;

        if (this.state.cancelled) {
            let cancellationMessage: string;
            switch (this.state.cancelled) {
                case RendezvousFailureReason.Expired:
                    cancellationMessage = _t("The linking wasn't completed in the required time.");
                    break;
                case RendezvousFailureReason.InvalidCode:
                    cancellationMessage = _t("The scanned code is invalid.");
                    break;
                case RendezvousFailureReason.UnsupportedAlgorithm:
                    cancellationMessage = _t("Linking with this device is not supported.");
                    break;
                case RendezvousFailureReason.UserDeclined:
                    cancellationMessage = _t("The request was declined on the other device.");
                    break;
                case RendezvousFailureReason.OtherDeviceAlreadySignedIn:
                    cancellationMessage = _t("The other device is already signed in.");
                    break;
                case RendezvousFailureReason.OtherDeviceNotSignedIn:
                    cancellationMessage = _t("The other device isn't signed in.");
                    break;
                case RendezvousFailureReason.UserCancelled:
                    cancellationMessage = _t("The request was cancelled.");
                    break;
                case RendezvousFailureReason.Unknown:
                    cancellationMessage = _t("An unexpected error occurred.");
                    break;
                case RendezvousFailureReason.HomeserverLacksSupport:
                    cancellationMessage = _t("The homeserver doesn't support signing in another device.");
                    break;
                default:
                    cancellationMessage = _t("The request was cancelled.");
                    break;
            }
            title = _t("Connection failed");
            titleIcon = <WarningBadge className="error" />;
            backButton = false;
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
        } else if (this.state.confirmationDigits) {
            title = _t("Devices connected");
            titleIcon = <DevicesIcon className="normal" />;
            backButton = false;
            if (this.isNewDevice) {
                main = <>
                    <p>{ _t("Check your mobile device, the code below should be displayed. Confirm that the code below matches with that device:") }</p>
                    <div className="mx_LoginWithQR_confirmationDigits">
                        { this.state.confirmationDigits }
                    </div>
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
                    <p>{ _t("Confirm that the code below matches with your mobile device:") }</p>
                    <div className="mx_LoginWithQR_confirmationDigits">
                        { this.state.confirmationDigits }
                    </div>
                    <div className="mx_LoginWithQR_confirmationAlert">
                        <div>
                            <InfoIcon />
                        </div>
                        <div>{ _t("Please ensure that you know the origin of this code. By linking devices, you will provide someone with full access to your account.") }</div>
                    </div>
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
        } else if (this.props.mode === Mode.SHOW) {
            title =_t("Sign in with QR code");
            if (this.state.generatedRendezvous) {
                const code = <div className="mx_LoginWithQR_qrWrapper">
                    <QRCode data={[{ data: Buffer.from(this.state.generatedRendezvous.code), mode: 'byte' }]} className="mx_QRCode" />
                </div>;

                if (this.isExistingDevice) {
                    main = <>
                        <p>{ _t("Scan the QR code below with your device that's signed out.") }</p>
                        <ol>
                            <li>{ _t("Start at the sign in screen") }</li>
                            <li>{ _t("Select 'Scan QR code'") }</li>
                        </ol>
                        { code }
                    </>;
                } else {
                    main = <>
                        <p>{ _t("Scan the QR code below with your device that's already signed in:") }</p>
                        <ol>
                            <li>{ _t("Open the app on your mobile device") }</li>
                            <li>{ _t("Go to Settings -> Security & Privacy") }</li>
                            <li>{ _t("Select 'Scan QR code'") }</li>
                        </ol>
                        { code }
                    </>;
                }
            } else {
                main = <div className="mx_LoginWithQR_spinner"><Spinner /></div>;
                buttons = <>
                    <AccessibleButton
                        kind="primary_outline"
                        onClick={this.cancelClicked}
                    >
                        { _t("Cancel") }
                    </AccessibleButton>
                </>;
            }
        } else if (this.props.mode === Mode.SCAN) {
            title = _t("Sign in with QR code");
            if (!this.state.scanning) {
                if (this.isExistingDevice) {
                    main = <>
                        <p>
                            <span>{ _t("Use the camera on this device to scan the QR code shown on your other device:") }</span>
                        </p>
                        <ol>
                            <li>{ _t("Start at the sign in screen") }</li>
                            <li>{ _t("Select 'Show QR code'") }</li>
                        </ol>
                    </>;
                } else {
                    main = <>
                        <p>
                            <span>{ _t("Use the camera on this device to scan the QR code shown on your signed in device:") }</span>
                        </p>
                        <ol>
                            <li>{ _t("Open Element on your other device") }</li>
                            <li>{ _t("Go to Settings -> Security & Privacy") }</li>
                            <li>{ _t("Select 'Link a device'") }</li>
                            <li>{ _t("Select 'Show QR code on this device'") }</li>
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
            }
        }

        return (
            <div className="mx_LoginWithQR">
                <div>
                    { backButton ?
                        <AccessibleButton className="mx_LoginWithQR_BackButton" onClick={this.onBackClick} title="Back"><BackButtonIcon /></AccessibleButton>
                        : null }
                    <h1>{ titleIcon }{ title }</h1>
                </div>
                <div className="mx_LoginWithQR_main">
                    { main }
                </div>
                <div className="mx_LoginWithQR_buttons">
                    { buttons }
                </div>
            </div>
        );
    }
}
