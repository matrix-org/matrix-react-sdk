/*
Copyright 2019 New Vector Ltd
Copyright 2019 The Matrix.org Foundation C.I.C.

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
import { logger } from "matrix-js-sdk/src/logger";
import { MatrixError } from "matrix-js-sdk/src/matrix";

import { _t, UserFriendlyError } from "../../../../languageHandler";
import { MatrixClientPeg } from "../../../../MatrixClientPeg";
import Modal from "../../../../Modal";
import AddThreepid, { Binding, ThirdPartyIdentifier } from "../../../../AddThreepid";
import ErrorDialog, { extractErrorMessageFromError } from "../../dialogs/ErrorDialog";
import Field from "../../elements/Field";
import SettingsSubsection from "../shared/SettingsSubsection";
import InlineSpinner from "../../elements/InlineSpinner";
import AccessibleButton, { ButtonEvent } from "../../elements/AccessibleButton";

/*
TODO: Improve the UX for everything in here.
This is a copy/paste of EmailAddresses, mostly.
 */

// TODO: Combine EmailAddresses and PhoneNumbers to be 3pid agnostic

interface IPhoneNumberProps {
    msisdn: ThirdPartyIdentifier;
    disabled?: boolean;
}

interface IPhoneNumberState {
    verifying: boolean;
    verificationCode: string;
    addTask: AddThreepid | null;
    continueDisabled: boolean;
    bound?: boolean;
    verifyError: string | null;
}

export class PhoneNumber extends React.Component<IPhoneNumberProps, IPhoneNumberState> {
    public constructor(props: IPhoneNumberProps) {
        super(props);

        const { bound } = props.msisdn;

        this.state = {
            verifying: false,
            verificationCode: "",
            addTask: null,
            continueDisabled: false,
            bound,
            verifyError: null,
        };
    }

    public componentDidUpdate(prevProps: Readonly<IPhoneNumberProps>): void {
        if (this.props.msisdn !== prevProps.msisdn) {
            const { bound } = this.props.msisdn;
            this.setState({ bound });
        }
    }

    private async changeBinding({ bind, label, errorTitle }: Binding): Promise<void> {
        const { medium, address } = this.props.msisdn;

        try {
            if (bind) {
                const task = new AddThreepid(MatrixClientPeg.safeGet());
                this.setState({
                    verifying: true,
                    continueDisabled: true,
                    addTask: task,
                });
                // XXX: Sydent will accept a number without country code if you add
                // a leading plus sign to a number in E.164 format (which the 3PID
                // address is), but this goes against the spec.
                // See https://github.com/matrix-org/matrix-doc/issues/2222
                // @ts-ignore
                await task.bindMsisdn(null, `+${address}`);
                this.setState({
                    continueDisabled: false,
                });
            } else {
                await MatrixClientPeg.safeGet().unbindThreePid(medium, address);
            }
            this.setState({ bound: bind });
        } catch (err) {
            logger.error(`changeBinding: Unable to ${label} phone number ${address}`, err);
            this.setState({
                verifying: false,
                continueDisabled: false,
                addTask: null,
            });
            Modal.createDialog(ErrorDialog, {
                title: errorTitle,
                description: extractErrorMessageFromError(err, _t("invite|failed_generic")),
            });
        }
    }

    private onRevokeClick = (e: ButtonEvent): void => {
        e.stopPropagation();
        e.preventDefault();
        this.changeBinding({
            bind: false,
            label: "revoke",
            errorTitle: _t("settings|general|error_revoke_msisdn_discovery"),
        });
    };

    private onShareClick = (e: ButtonEvent): void => {
        e.stopPropagation();
        e.preventDefault();
        this.changeBinding({
            bind: true,
            label: "share",
            errorTitle: _t("settings|general|error_share_msisdn_discovery"),
        });
    };

    private onVerificationCodeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        this.setState({
            verificationCode: e.target.value,
        });
    };

    private onContinueClick = async (e: ButtonEvent | React.FormEvent): Promise<void> => {
        e.stopPropagation();
        e.preventDefault();

        this.setState({ continueDisabled: true });
        const token = this.state.verificationCode;
        try {
            await this.state.addTask?.haveMsisdnToken(token);
            this.setState({
                addTask: null,
                continueDisabled: false,
                verifying: false,
                verifyError: null,
                verificationCode: "",
            });
        } catch (err) {
            logger.error("Unable to verify phone number:", err);

            let underlyingError = err;
            if (err instanceof UserFriendlyError) {
                underlyingError = err.cause;
            }

            this.setState({ continueDisabled: false });
            if (underlyingError instanceof MatrixError && underlyingError.errcode !== "M_THREEPID_AUTH_FAILED") {
                Modal.createDialog(ErrorDialog, {
                    title: _t("settings|general|error_msisdn_verification"),
                    description: extractErrorMessageFromError(err, _t("invite|failed_generic")),
                });
            } else {
                this.setState({ verifyError: _t("settings|general|incorrect_msisdn_verification") });
            }
        }
    };

    public render(): React.ReactNode {
        const { address } = this.props.msisdn;
        const { verifying, bound } = this.state;

        let status;
        if (verifying) {
            status = (
                <span className="mx_GeneralUserSettingsTab_section--discovery_existing_verification">
                    <span>
                        {_t("settings|general|msisdn_verification_instructions")}
                        <br />
                        {this.state.verifyError}
                    </span>
                    <form onSubmit={this.onContinueClick} autoComplete="off" noValidate={true}>
                        <Field
                            type="text"
                            label={_t("settings|general|msisdn_verification_field_label")}
                            autoComplete="off"
                            disabled={this.state.continueDisabled}
                            value={this.state.verificationCode}
                            onChange={this.onVerificationCodeChange}
                        />
                    </form>
                </span>
            );
        } else if (bound) {
            status = (
                <AccessibleButton
                    className="mx_GeneralUserSettingsTab_section--discovery_existing_button"
                    kind="danger_sm"
                    onClick={this.onRevokeClick}
                    disabled={this.props.disabled}
                >
                    {_t("action|revoke")}
                </AccessibleButton>
            );
        } else {
            status = (
                <AccessibleButton
                    className="mx_GeneralUserSettingsTab_section--discovery_existing_button"
                    kind="primary_sm"
                    onClick={this.onShareClick}
                    disabled={this.props.disabled}
                >
                    {_t("action|share")}
                </AccessibleButton>
            );
        }

        return (
            <div className="mx_GeneralUserSettingsTab_section--discovery_existing">
                <span className="mx_GeneralUserSettingsTab_section--discovery_existing_address">+{address}</span>
                {status}
            </div>
        );
    }
}

interface IProps {
    msisdns: ThirdPartyIdentifier[];
    isLoading?: boolean;
    disabled?: boolean;
}

export default class PhoneNumbers extends React.Component<IProps> {
    public render(): React.ReactNode {
        let content;
        if (this.props.isLoading) {
            content = <InlineSpinner />;
        } else if (this.props.msisdns.length > 0) {
            content = this.props.msisdns.map((e) => {
                return <PhoneNumber msisdn={e} key={e.address} disabled={this.props.disabled} />;
            });
        }

        const description = (!content && _t("settings|general|discovery_msisdn_empty")) || undefined;

        return (
            <SettingsSubsection
                data-testid="mx_DiscoveryPhoneNumbers"
                heading={_t("settings|general|msisdns_heading")}
                description={description}
                stretchContent
            >
                {content}
            </SettingsSubsection>
        );
    }
}
