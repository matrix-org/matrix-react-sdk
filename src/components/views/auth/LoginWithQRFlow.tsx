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

import React, { createRef } from "react";
import { RendezvousFailureReason } from "matrix-js-sdk/src/rendezvous";
import { Icon as ChevronLeftIcon } from "@vector-im/compound-design-tokens/icons/chevron-left.svg";
import { Heading, MFAInput, Text } from "@vector-im/compound-web";

import { _t } from "../../../languageHandler";
import AccessibleButton from "../elements/AccessibleButton";
import QRCode from "../elements/QRCode";
import Spinner from "../elements/Spinner";
import { Icon as InfoIcon } from "../../../../res/img/element-icons/i.svg";
import { Click, Phase } from "./LoginWithQR-types";
import SdkConfig from "../../../SdkConfig";
import { FailureReason, LoginWithQRFailureReason } from "./LoginWithQR";
import { XOR } from "../../../@types/common";
import { ErrorMessage } from "../../structures/ErrorMessage";

/**
 * @deprecated the MSC3906 implementation is deprecated in favour of MSC4108.
 */
interface MSC3906Props extends Pick<Props, "phase" | "onClick" | "failureReason"> {
    code?: string;
    confirmationDigits?: string;
}

interface Props {
    phase: Phase;
    code?: Uint8Array;
    onClick(type: Click, checkCodeEntered?: string): Promise<void>;
    failureReason?: FailureReason;
    userCode?: string;
    checkCode?: string;
}

/**
 * A component that implements the UI for sign in and E2EE set up with a QR code.
 *
 * This supports the unstable features of MSC3906 and MSC4108
 */
export default class LoginWithQRFlow extends React.Component<XOR<Props, MSC3906Props>> {
    private checkCodeInput = createRef<HTMLInputElement>();

    public constructor(props: XOR<Props, MSC3906Props>) {
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

    public render(): React.ReactNode {
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
                    case RendezvousFailureReason.UnsupportedTransport:
                    case RendezvousFailureReason.UnsupportedAlgorithm:
                        cancellationMessage = _t("auth|qr_code_login|error_device_unsupported");
                        break;
                    case RendezvousFailureReason.UserDeclined:
                        cancellationMessage = _t("auth|qr_code_login|error_request_declined");
                        break;
                    case RendezvousFailureReason.UserCancelled:
                        cancellationMessage = _t("auth|qr_code_login|error_request_cancelled");
                        break;
                    case LoginWithQRFailureReason.RateLimited:
                        cancellationMessage = _t("auth|qr_code_login|error_rate_limited");
                        break;
                    case RendezvousFailureReason.Unknown:
                        cancellationMessage = _t("auth|qr_code_login|error_unexpected");
                        break;
                    case RendezvousFailureReason.HomeserverLacksSupport:
                        cancellationMessage = _t("auth|qr_code_login|error_homeserver_lacks_support");
                        break;
                    case RendezvousFailureReason.InsecureChannelDetected:
                        cancellationMessage = _t("auth|qr_code_login|error_insecure_connection");
                        break;
                    case RendezvousFailureReason.UnexpectedMessage:
                        cancellationMessage = _t("auth|qr_code_login|error_unexpected_message");
                        break;
                    case RendezvousFailureReason.DeviceAlreadyExists:
                        cancellationMessage = _t("auth|qr_code_login|error_device_already_exists");
                        break;
                    case RendezvousFailureReason.DeviceNotFound:
                        cancellationMessage = _t("auth|qr_code_login|error_device_not_found");
                        break;
                    default:
                        cancellationMessage = _t("auth|qr_code_login|error_unexpected");
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
            case Phase.LegacyConnected:
                backButton = false;
                main = (
                    <>
                        <p>{_t("auth|qr_code_login|confirm_code_match")}</p>
                        <div className="mx_LoginWithQR_confirmationDigits">{this.props.confirmationDigits}</div>
                        <div className="mx_LoginWithQR_confirmationAlert">
                            <div>
                                <InfoIcon />
                            </div>
                            <div>{_t("auth|qr_code_login|approve_access_warning")}</div>
                        </div>
                    </>
                );

                buttons = (
                    <>
                        <AccessibleButton
                            data-testid="decline-login-button"
                            kind="primary_outline"
                            onClick={this.handleClick(Click.Decline)}
                        >
                            {_t("action|cancel")}
                        </AccessibleButton>
                        <AccessibleButton
                            data-testid="approve-login-button"
                            kind="primary"
                            onClick={this.handleClick(Click.Approve)}
                        >
                            {_t("action|approve")}
                        </AccessibleButton>
                    </>
                );
                break;
            case Phase.OutOfBandConfirmation:
                backButton = false;
                main = (
                    <>
                        <Heading as="h1" size="sm" weight="semibold">
                            {_t("auth|qr_code_login|check_code_heading")}
                        </Heading>
                        <Text size="md">{_t("auth|qr_code_login|check_code_explainer")}</Text>
                        <label htmlFor="mx_LoginWithQR_checkCode">
                            {_t("auth|qr_code_login|check_code_input_label")}
                        </label>
                        <MFAInput
                            className="mx_LoginWithQR_checkCode_input mx_no_textinput"
                            ref={this.checkCodeInput}
                            length={2}
                            autoFocus
                            id="mx_LoginWithQR_checkCode"
                            data-invalid={
                                this.props.failureReason === LoginWithQRFailureReason.CheckCodeMismatch
                                    ? true
                                    : undefined
                            }
                        />
                        <ErrorMessage
                            message={
                                this.props.failureReason === LoginWithQRFailureReason.CheckCodeMismatch
                                    ? _t("auth|qr_code_login|check_code_mismatch")
                                    : null
                            }
                        />
                    </>
                );

                buttons = (
                    <>
                        <AccessibleButton
                            data-testid="decline-login-button"
                            kind="primary_outline"
                            onClick={this.handleClick(Click.Decline)}
                        >
                            {_t("action|cancel")}
                        </AccessibleButton>
                        <AccessibleButton
                            data-testid="approve-login-button"
                            kind="primary"
                            onClick={this.handleClick(Click.Approve)}
                        >
                            {_t("action|continue")}
                        </AccessibleButton>
                    </>
                );
                break;
            case Phase.ShowingQR:
                if (this.props.code) {
                    const data =
                        typeof this.props.code !== "string" ? this.props.code : Buffer.from(this.props.code ?? "");

                    main = (
                        <>
                            <Heading as="h1" size="sm" weight="semibold">
                                {_t("auth|qr_code_login|scan_code_instruction")}
                            </Heading>
                            <div className="mx_LoginWithQR_qrWrapper">
                                <QRCode data={[{ data, mode: "byte" }]} className="mx_QRCode" />
                            </div>
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
                } else {
                    main = this.simpleSpinner();
                    buttons = this.cancelButton();
                }
                break;
            case Phase.Loading:
                main = this.simpleSpinner();
                break;
            case Phase.WaitingForDevice:
                main = (
                    <>
                        {this.simpleSpinner(_t("auth|qr_code_login|waiting_for_device"))}
                        {this.props.userCode ? (
                            <div>
                                <p>{_t("auth|qr_code_login|security_code")}</p>
                                <p>{_t("auth|qr_code_login|security_code_prompt")}</p>
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
