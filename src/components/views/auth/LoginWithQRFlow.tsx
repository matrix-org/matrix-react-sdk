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

import React from "react";
import { RendezvousFailureReason } from "matrix-js-sdk/src/rendezvous";
import { QrReader, OnResultFunction } from "react-qr-reader";
import { logger } from "matrix-js-sdk/src/logger";

import { _t } from "../../../languageHandler";
import AccessibleButton from "../elements/AccessibleButton";
import QRCode from "../elements/QRCode";
import Spinner from "../elements/Spinner";
import { Icon as BackButtonIcon } from "../../../../res/img/element-icons/back.svg";
import { Icon as DevicesIcon } from "../../../../res/img/element-icons/devices.svg";
import { Icon as WarningBadge } from "../../../../res/img/element-icons/warning-badge.svg";
import { Icon as CheckmarkIcon } from "../../../../res/img/element-icons/check.svg";
import { Click, Phase } from "./LoginWithQR";

interface IProps {
    phase: Phase;
    code?: Buffer;
    onClick(type: Click): Promise<void>;
    failureReason?: RendezvousFailureReason;
    onScannedQRCode?: OnResultFunction;
    userCode?: string;
}

/**
 * A component that implements the UI for sign in and E2EE set up with a QR code.
 *
 * This uses the unstable feature of MSC3906: https://github.com/matrix-org/matrix-spec-proposals/pull/3906
 */
export default class LoginWithQRFlow extends React.Component<IProps> {
    public constructor(props: IProps) {
        super(props);
    }

    private handleClick = (type: Click): ((e: React.FormEvent) => Promise<void>) => {
        return async (e: React.FormEvent): Promise<void> => {
            e.preventDefault();
            await this.props.onClick(type);
        };
    };

    private cancelButton = (): JSX.Element => (
        <AccessibleButton data-testid="cancel-button" kind="primary_outline" onClick={this.handleClick(Click.Cancel)}>
            {_t("action|cancel")}
        </AccessibleButton>
    );

    private simpleSpinner = (description?: string): JSX.Element => {
        return (
            <div className="mx_LoginWithQR_spinner">
                <div>
                    <Spinner />
                    {description && <p>{description}</p>}
                </div>
            </div>
        );
    };

    private viewFinder(): JSX.Element {
        return (
            <svg viewBox="0 0 100 100" className="mx_QRViewFinder">
                <path fill="none" d="M10,0 L0,0 L0,10" />
                <path fill="none" d="M0,90 L0,100 L10,100" />
                <path fill="none" d="M90,100 L100,100 L100,90" />
                <path fill="none" d="M100,10 L100,0 L90,0" />
            </svg>
        );
    }

    public render(): React.ReactNode {
        logger.info(`LoginWithQRFlow render: phase=${this.props.phase}`);
        let title = "";
        let titleIcon: JSX.Element | undefined;
        let main: JSX.Element | undefined;
        let buttons: JSX.Element | undefined;
        let backButton = true;
        let cancellationMessage: string | undefined;
        let centreTitle = false;

        switch (this.props.phase) {
            case Phase.Error:
                switch (this.props.failureReason) {
                    case RendezvousFailureReason.Expired:
                        cancellationMessage = _t("auth|qr_code_login|error_linking_incomplete");
                        break;
                    case RendezvousFailureReason.InvalidCode:
                        cancellationMessage = _t("auth|qr_code_login|error_invalid_scanned_code");
                        break;
                    case RendezvousFailureReason.UnsupportedAlgorithm:
                        cancellationMessage = _t("auth|qr_code_login|error_device_unsupported");
                        break;
                    case RendezvousFailureReason.UserDeclined:
                        cancellationMessage = _t("auth|qr_code_login|error_request_declined");
                        break;
                    case RendezvousFailureReason.OtherDeviceAlreadySignedIn:
                        cancellationMessage = _t("auth|qr_code_login|error_device_already_signed_in");
                        break;
                    case RendezvousFailureReason.OtherDeviceNotSignedIn:
                        cancellationMessage = _t("auth|qr_code_login|error_device_not_signed_in");
                        break;
                    case RendezvousFailureReason.UserCancelled:
                        cancellationMessage = _t("auth|qr_code_login|error_request_cancelled");
                        break;
                    case RendezvousFailureReason.Unknown:
                        cancellationMessage = _t("auth|qr_code_login|error_unexpected");
                        break;
                    case RendezvousFailureReason.HomeserverLacksSupport:
                        cancellationMessage = _t("auth|qr_code_login|error_homeserver_lacks_support");
                        break;
                    default:
                        cancellationMessage = _t("auth|qr_code_login|error_request_cancelled");
                        break;
                }
                title = _t("timeline|m.call.invite|failed_connection");
                centreTitle = true;
                titleIcon = <WarningBadge className="error" />;
                backButton = false;
                main = <p data-testid="cancellation-message">{cancellationMessage}</p>;
                buttons = (
                    <>
                        <AccessibleButton
                            data-testid="try-again-button"
                            kind="primary"
                            onClick={this.handleClick(Click.TryAgain)}
                        >
                            {_t("action|try_again")}
                        </AccessibleButton>
                        {this.cancelButton()}
                    </>
                );
                break;
            case Phase.OutOfBandConfirmation:
                title = "Do you see a green checkmark on your other device?";
                titleIcon = <DevicesIcon className="normal" />;
                backButton = false;
                main = (
                    <>
                        <p>
                            Confirm that you see a green checkmark on both devices to to verify that the connection is
                            secure.
                        </p>
                        <div className="mx_LoginWithQR_confirmationAlert">
                            <div>
                                <CheckmarkIcon />
                            </div>
                        </div>
                        {this.props.userCode ? (
                            <div>
                                <p>Security code</p>
                                <p>If asked, enter the code below on your other device.</p>
                                <p>{this.props.userCode}</p>
                            </div>
                        ) : null}
                    </>
                );

                buttons = (
                    <>
                        <AccessibleButton
                            data-testid="approve-login-button"
                            kind="primary"
                            onClick={this.handleClick(Click.Approve)}
                        >
                            Yes, I do
                        </AccessibleButton>
                        <AccessibleButton
                            data-testid="decline-login-button"
                            kind="primary_outline"
                            onClick={this.handleClick(Click.Decline)}
                        >
                            No, I don't
                        </AccessibleButton>
                    </>
                );
                break;
            case Phase.Continue:
                // PROTOTYPE: I don't think we would offer the ability to scan from a web browser, so this is really just for the prototype.
                title = "Go to your account to continue";
                titleIcon = <DevicesIcon className="normal" />;
                backButton = false;
                main = (
                    <>
                        <p>Open your servername.io account to link your new device.</p>
                        <p>
                            This screen is only needed due to Web Browser UX restrictions. If this was a native mobile
                            app like Element X then the OIDC Provider consent screen could be opened automatically.
                            Also, we don't plan to offer the ability to scan from a web browser so this is a non-issue.
                        </p>
                        <div className="mx_LoginWithQR_confirmationAlert">
                            <div>
                                <CheckmarkIcon />
                            </div>
                        </div>
                    </>
                );

                buttons = (
                    <>
                        <AccessibleButton
                            data-testid="approve-login-button"
                            kind="primary"
                            onClick={this.handleClick(Click.Approve)}
                        >
                            Continue
                        </AccessibleButton>
                    </>
                );
                break;
            case Phase.ShowChannelSecure:
                title = "Go to your other device";
                titleIcon = <DevicesIcon className="normal" />;
                backButton = false;
                main = (
                    <>
                        <p>You’ll be asked to confirm that you can see a green checkmark on this device..</p>
                        <div className="mx_LoginWithQR_confirmationAlert">
                            <div>
                                <CheckmarkIcon />
                            </div>
                        </div>
                        {this.props.userCode ? (
                            <div>
                                <p>Security code</p>
                                <p>If asked, enter the code below on your other device.</p>
                                <p>{this.props.userCode}</p>
                            </div>
                        ) : null}
                    </>
                );
                break;
            case Phase.ShowingQR:
                title = _t("settings|sessions|sign_in_with_qr");
                if (this.props.code) {
                    const code = (
                        <div className="mx_LoginWithQR_qrWrapper">
                            <QRCode data={[{ data: this.props.code, mode: "byte" }]} className="mx_QRCode" />
                        </div>
                    );
                    main = (
                        <>
                            <p>Do something:</p>
                            <ol>
                                <li>A</li>
                                <li>B</li>
                                <li>C</li>
                            </ol>
                            {code}
                        </>
                    );
                    buttons = (
                        <AccessibleButton
                            data-testid="decline-login-button"
                            kind="primary_outline"
                            onClick={this.handleClick(Click.ScanQr)}
                        >
                            Scan QR code instead
                        </AccessibleButton>
                    );
                } else {
                    main = this.simpleSpinner();
                    buttons = this.cancelButton();
                }
                break;
            case Phase.Loading:
                main = this.simpleSpinner();
                break;
            case Phase.Connecting:
                main = this.simpleSpinner(_t("auth|qr_code_login|connecting"));
                buttons = this.cancelButton();
                break;
            case Phase.WaitingForDevice:
                main = (
                    <>
                        {this.simpleSpinner(_t("auth|qr_code_login|waiting_for_device"))}
                        {this.props.userCode ? (
                            <div>
                                <p>Security code</p>
                                <p>If asked, enter the code below on your other device.</p>
                                <p>{this.props.userCode}</p>
                            </div>
                        ) : null}
                    </>
                );
                buttons = this.cancelButton();
                break;
            case Phase.Verifying:
                title = _t("common|success");
                centreTitle = true;
                main = this.simpleSpinner(_t("auth|qr_code_login|completing_setup"));
                break;
            case Phase.ScanningQR:
                title = _t("settings|sessions|sign_in_with_qr");
                main = (
                    <>
                        <p>Line up the QR code in the square below:</p>
                        <QrReader
                            className="mx_LoginWithQR_QRScanner"
                            constraints={{}}
                            onResult={this.props.onScannedQRCode}
                            ViewFinder={this.viewFinder}
                        />
                    </>
                );
                buttons = (
                    <AccessibleButton
                        data-testid="decline-login-button"
                        kind="primary_outline"
                        onClick={this.handleClick(Click.ShowQr)}
                    >
                        Show QR code instead
                    </AccessibleButton>
                );
                break;
        }

        return (
            <div data-testid="login-with-qr" className="mx_LoginWithQR">
                <div className={centreTitle ? "mx_LoginWithQR_centreTitle" : ""}>
                    {backButton ? (
                        <AccessibleButton
                            data-testid="back-button"
                            className="mx_LoginWithQR_BackButton"
                            onClick={this.handleClick(Click.Back)}
                            title="Back"
                        >
                            <BackButtonIcon />
                        </AccessibleButton>
                    ) : null}
                    <h1>
                        {titleIcon}
                        {title}
                    </h1>
                </div>
                <div className="mx_LoginWithQR_main">{main}</div>
                <div className="mx_LoginWithQR_buttons">{buttons}</div>
            </div>
        );
    }
}
