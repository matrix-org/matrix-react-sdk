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

import React, { RefObject, createRef } from "react";
import { RendezvousFailureReason } from "matrix-js-sdk/src/rendezvous";
import { Icon as ChevronLeftIcon } from "@vector-im/compound-design-tokens/icons/chevron-left.svg";
import { QrReader, OnResultFunction } from "react-qr-reader";
import { logger } from "matrix-js-sdk/src/logger";

import { _t } from "../../../languageHandler";
import AccessibleButton from "../elements/AccessibleButton";
import QRCode from "../elements/QRCode";
import Spinner from "../elements/Spinner";
import { Click, Phase } from "./LoginWithQR";
import SdkConfig from "../../../SdkConfig";

interface IProps {
    phase: Phase;
    code?: Uint8Array;
    onClick(type: Click, checkCodeEntered?: string): Promise<void>;
    failureReason?: RendezvousFailureReason;
    onScannedQRCode?: OnResultFunction;
    userCode?: string;
    checkCode?: string;
}

/**
 * A component that implements the UI for sign in and E2EE set up with a QR code.
 *
 * This uses the unstable feature of MSC3906: https://github.com/matrix-org/matrix-spec-proposals/pull/3906
 */
export default class LoginWithQRFlow extends React.Component<IProps> {
    private checkCodeInput: RefObject<HTMLInputElement> = createRef();

    public constructor(props: IProps) {
        super(props);
    }

    private handleClick = (type: Click): ((e: React.FormEvent) => Promise<void>) => {
        return async (e: React.FormEvent): Promise<void> => {
            e.preventDefault();
            await this.props.onClick(type, type === Click.Approve ? this.checkCodeInput.current?.value : undefined);
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
                centreTitle = true;
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
                backButton = false;
                main = (
                    <>
                        <p>
                            To verify that the connection is secure, please enter the code shown on your other device:
                        </p>
                        <p>
                            <input ref={this.checkCodeInput} type="text" autoFocus={true} placeholder="Code" />
                        </p>
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
                            Continue
                        </AccessibleButton>
                        <AccessibleButton
                            data-testid="decline-login-button"
                            kind="primary_outline"
                            onClick={this.handleClick(Click.Decline)}
                        >
                            No code shown
                        </AccessibleButton>
                    </>
                );
                break;
            case Phase.Continue:
                // PROTOTYPE: I don't think we would offer the ability to scan from a web browser, so this is really just for the prototype.
                // title = "Go to your account to continue";
                // titleIcon = <DevicesIcon className="normal" />;
                backButton = false;
                main = (
                    <>
                        <p>Open your servername.io account to link your new device.</p>
                        <p>
                            This screen is only needed due to Web Browser UX restrictions. If this was a native mobile
                            app like Element X then the OIDC Provider consent screen could be opened automatically.
                            Also, we don't plan to offer the ability to scan from a web browser so this is a non-issue.
                        </p>
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
                backButton = false;
                main = (
                    <>
                        <p>Go to your other device</p>
                        <p>You’ll be asked to enter the following code:</p>
                        <p>{this.props.checkCode}</p>
                    </>
                );
                break;
            case Phase.ShowUserCode:
                backButton = false;
                main = (
                    <>
                        <p>Go back to your other device to finish signing in</p>
                        <hr />
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
                if (this.props.code) {
                    const code = (
                        <div className="mx_LoginWithQR_qrWrapper">
                            <QRCode data={[{ data: this.props.code, mode: "byte" }]} className="mx_QRCode" />
                        </div>
                    );
                    main = (
                        <>
                            <h1>{_t("auth|qr_code_login|scan_code_instruction")}</h1>
                            {code}
                            <ol>
                                <li>
                                    {_t("auth|qr_code_login|open_element_other_device", {
                                        brand: SdkConfig.get().brand,
                                    })}
                                </li>
                                <li>
                                    {_t("auth|qr_code_login|select_qr_code", {
                                        scanQRCode: <b>{_t("auth|qr_code_login|scan_qr_code")}</b>,
                                    })}
                                </li>
                                <li>{_t("auth|qr_code_login|point_the_camera")}</li>
                                <li>{_t("auth|qr_code_login|follow_remaining_instructions")}</li>
                            </ol>
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
                centreTitle = true;
                main = this.simpleSpinner(_t("auth|qr_code_login|completing_setup"));
                break;
            case Phase.ScanningQR:
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
                        <div className="mx_LoginWithQR_heading">
                            <AccessibleButton
                                data-testid="back-button"
                                className="mx_LoginWithQR_BackButton"
                                onClick={this.handleClick(Click.Back)}
                                title="Back"
                            >
                                <ChevronLeftIcon />
                            </AccessibleButton>
                            <div className="mx_LoginWithQR_breadcrumbs">
                                {_t("settings|sessions|title")} / {_t("settings|sessions|sign_in_with_qr")}
                            </div>
                        </div>
                    ) : null}
                </div>
                <div className="mx_LoginWithQR_main">{main}</div>
                <div className="mx_LoginWithQR_buttons">{buttons}</div>
            </div>
        );
    }
}
