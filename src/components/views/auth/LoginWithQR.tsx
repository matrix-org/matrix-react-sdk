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
import { buildChannelFromCode, MSC3906Rendezvous, RendezvousFailureReason } from 'matrix-js-sdk/src/rendezvous';
import { MSC3886SimpleHttpRendezvousTransport } from 'matrix-js-sdk/src/rendezvous/transports';
import { MSC3903ECDHv1RendezvousChannel } from 'matrix-js-sdk/src/rendezvous/channels';
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

enum Phase {
    LOADING,
    SCAN_INSTRUCTIONS,
    SCANNING_QR,
    SHOWING_QR,
    CONNECTING,
    CONNECTED,
    WAITING_FOR_DEVICE,
    VERIFYING,
    ERROR,
}

interface IProps {
    serverConfig?: ValidatedServerConfig;
    client?: MatrixClient;
    mode: Mode;
    onFinished(...args: any): void;
}

interface IState {
    phase: Phase;
    rendezvous?: MSC3906Rendezvous;
    lastScannedCode?: string;
    confirmationDigits?: string;
    failureReason?: RendezvousFailureReason;
    mediaPermissionError?: boolean;
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
            phase: Phase.LOADING,
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
        this.setState({ phase: Phase.LOADING });
        if (this.state.rendezvous) {
            this.state.rendezvous.onFailure = undefined;
            this.state.rendezvous.channel.transport.onFailure = undefined;
            await this.state.rendezvous.userCancelled();
            this.setState({ rendezvous: undefined });
        }
        if (mode === Mode.SHOW) {
            await this.generateCode();
        } else {
            this.setState({ phase: Phase.SCAN_INSTRUCTIONS });
        }
    }

    public componentWillUnmount(): void {
        if (this.state.rendezvous) {
            // eslint-disable-next-line react/no-direct-mutation-state
            this.state.rendezvous.onFailure = undefined;
            // eslint-disable-next-line react/no-direct-mutation-state
            this.state.rendezvous.channel.transport.onFailure = undefined;
            // calling cancel will call close() as well to clean up the resources
            void this.state.rendezvous.userCancelled();
        }
    }

    private approveLogin = async (): Promise<void> => {
        if (!this.state.rendezvous) {
            throw new Error('Rendezvous not found');
        }
        this.setState({ phase: Phase.WAITING_FOR_DEVICE });
        const newDeviceId = await this.state.rendezvous.confirmLoginOnExistingDevice();
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
        const didCrossSign = await this.state.rendezvous.verifyNewDeviceOnExistingDevice();
        if (didCrossSign) {
            // alert(`New device signed in, cross signed and marked as known: ${newDeviceId}`);
        } else {
            // alert(`New device signed in, but no keys received for cross signing: ${newDeviceId}`);
        }
        this.props.onFinished(true);
    };

    private generateCode = async () => {
        try {
            const fallbackServer = SdkConfig.get().login_with_qr?.fallback_http_transport_server;

            const transport = new MSC3886SimpleHttpRendezvousTransport({
                onFailure: this.onFailure,
                client: this.props.client,
                hsUrl: this.props.serverConfig?.hsUrl,
                fallbackRzServer: fallbackServer,
            });

            const channel = new MSC3903ECDHv1RendezvousChannel(transport);

            const rendezvous = new MSC3906Rendezvous(channel, this.props.client);

            rendezvous.onFailure = this.onFailure;
            await rendezvous.generateCode();
            logger.info(rendezvous.code);
            this.setState({
                phase: Phase.SHOWING_QR,
                rendezvous,
                failureReason: undefined,
            });

            const confirmationDigits = await rendezvous.startAfterShowingCode();
            this.setState({ phase: Phase.CONNECTED, confirmationDigits });

            if (this.isNewDevice) {
                const creds = await rendezvous.completeLoginOnNewDevice();
                if (creds) {
                    await setLoggedIn({
                        accessToken: creds.accessToken,
                        userId: creds.userId,
                        deviceId: creds.deviceId,
                        homeserverUrl: creds.homeserverUrl,
                    });
                    await rendezvous.completeVerificationOnNewDevice(MatrixClientPeg.get());
                    this.props.onFinished(true);
                    defaultDispatcher.dispatch({
                        action: Action.ViewHomePage,
                    });
                }
            }
        } catch (e) {
            logger.error(e);
            if (this.state.rendezvous) {
                await this.state.rendezvous.cancel(RendezvousFailureReason.Unknown);
            }
        }
    };

    private onFailure = (reason: RendezvousFailureReason) => {
        logger.info(`Rendezvous failed: ${reason}`);
        this.setState({ phase: Phase.ERROR, failureReason: reason });
    };

    reset() {
        this.setState({
            rendezvous: undefined,
            confirmationDigits: undefined,
            failureReason: undefined,
            lastScannedCode: undefined,
        });
    }

    private get isExistingDevice(): boolean {
        return !!this.props.client;
    }

    private get isNewDevice(): boolean {
        return !this.props.client;
    }

    private processScannedCode = async (scannedCode: string) => {
        try {
            if (this.state.lastScannedCode === scannedCode) {
                return; // suppress duplicate scans
            }
            if (this.state.rendezvous) {
                await this.state.rendezvous.userCancelled();
                this.reset();
            }

            const { channel, intent: theirIntent } = await buildChannelFromCode(
                scannedCode,
                this.onFailure,
            );

            const rendezvous = new MSC3906Rendezvous(channel, this.props.client);
            this.setState({
                phase: Phase.CONNECTING,
                lastScannedCode: scannedCode,
                rendezvous,
                failureReason: undefined,
            });

            const confirmationDigits = await rendezvous.startAfterScanningCode(theirIntent);
            this.setState({ phase: Phase.CONNECTED, confirmationDigits });

            if (this.isNewDevice) {
                const creds = await rendezvous.completeLoginOnNewDevice();
                if (creds) {
                    await setLoggedIn({
                        accessToken: creds.accessToken,
                        userId: creds.userId,
                        deviceId: creds.deviceId,
                        homeserverUrl: creds.homeserverUrl,
                    });
                    await rendezvous.completeVerificationOnNewDevice(MatrixClientPeg.get());
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
            await this.state.rendezvous?.userCancelled();
            this.reset();
            this.props.onFinished(false);
        })();
    };

    private declineClicked = () => {
        void (async () => {
            await this.state.rendezvous?.declineLoginOnExistingDevice();
            this.reset();
            this.props.onFinished(false);
        })();
    };

    private tryAgainClicked = () => {
        this.reset();

        void this.updateMode(this.props.mode);
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
        void this.state.rendezvous?.userCancelled();

        this.props.onFinished(false);
    };

    private onDoScanQRClicked = () => {
        this.setState({ phase: Phase.SCANNING_QR });
        void this.requestMediaPermissions();
    };

    private cancelButton = () => <AccessibleButton
        kind="primary_outline"
        onClick={this.cancelClicked}
    >
        { _t("Cancel") }
    </AccessibleButton>;

    private simpleSpinner = (description?: string): JSX.Element => {
        return <div className="mx_LoginWithQR_spinner">
            <div>
                <Spinner />
                { description && <p>{ description }</p> }
            </div>
        </div>;
    };

    render() {
        let title: string;
        let titleIcon: JSX.Element | undefined;
        let main: JSX.Element | undefined;
        let buttons: JSX.Element | undefined;
        let backButton = true;
        let cancellationMessage: string | undefined;
        let centreTitle = false;

        switch (this.state.phase) {
            case Phase.ERROR:
                switch (this.state.failureReason) {
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
                centreTitle = true;
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
                    { this.cancelButton() }
                </>;
                break;
            case Phase.CONNECTED:
                title = _t("Devices connected");
                titleIcon = <DevicesIcon className="normal" />;
                backButton = false;
                if (this.isNewDevice) {
                    main = <>
                        <p>{ _t("Check that the same code is shown on your other device before proceeding:") }</p>
                        <div className="mx_LoginWithQR_confirmationDigits">
                            { this.state.confirmationDigits }
                        </div>
                    </>;
                    buttons = <>
                        <div className="mx_LoginWithQR_separator">
                            { _t("No match?") }
                        </div>
                        { this.cancelButton() }
                    </>;
                } else {
                    main = <>
                        <p>{ _t("Check that the code below matches with your other device:") }</p>
                        <div className="mx_LoginWithQR_confirmationDigits">
                            { this.state.confirmationDigits }
                        </div>
                        <div className="mx_LoginWithQR_confirmationAlert">
                            <div>
                                <InfoIcon />
                            </div>
                            <div>{ _t("By approving access for this device, it will have full access to your account.") }</div>
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
                            { _t("Approve") }
                        </AccessibleButton>
                    </>;
                }
                break;
            case Phase.SHOWING_QR:
                title =_t("Sign in with QR code");
                if (this.state.rendezvous) {
                    const code = <div className="mx_LoginWithQR_qrWrapper">
                        <QRCode data={[{ data: Buffer.from(this.state.rendezvous.code), mode: 'byte' }]} className="mx_QRCode" />
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
                                <li>{ _t("Open the app on your other device") }</li>
                                <li>{ _t("Go to Settings -> Security & Privacy") }</li>
                                <li>{ _t("Select 'Scan QR code'") }</li>
                            </ol>
                            { code }
                        </>;
                    }
                } else {
                    main = this.simpleSpinner();
                    buttons = this.cancelButton();
                }
                break;
            case Phase.SCAN_INSTRUCTIONS:
                title = _t("Sign in with QR code");
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
                break;
            case Phase.SCANNING_QR:
                title =_t("Sign in with QR code");
                main = <>
                    <p>{ _t("Line up the QR code in the square below:") }</p>
                    <QrReader
                        className="mx_LoginWithQR_QRScanner"
                        constraints={{}}
                        onResult={this.onQrResult}
                        ViewFinder={this.viewFinder}
                    />
                </>;
                break;
            case Phase.LOADING:
                main = this.simpleSpinner();
                break;
            case Phase.CONNECTING:
                main = this.simpleSpinner(_t("Connecting..."));
                buttons = this.cancelButton();
                break;
            case Phase.WAITING_FOR_DEVICE:
                main = this.simpleSpinner(_t("Waiting for device to sign in"));
                buttons = this.cancelButton();
                break;
            case Phase.VERIFYING:
                title = _t("Success");
                centreTitle = true;
                main = this.simpleSpinner(_t("Completing set up of your new device"));
                break;
        }

        return (
            <div className="mx_LoginWithQR">
                <div className={centreTitle ? "mx_LoginWithQR_centreTitle" : ""}>
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
