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
import SettingsSubsection from "../shared/SettingsSubsection";
import InlineSpinner from "../../elements/InlineSpinner";
import AccessibleButton, { ButtonEvent } from "../../elements/AccessibleButton";

/*
TODO: Improve the UX for everything in here.
It's very much placeholder, but it gets the job done. The old way of handling
email addresses in user settings was to use dialogs to communicate state, however
due to our dialog system overriding dialogs (causing unmounts) this creates problems
for a sane UX. For instance, the user could easily end up entering an email address
and receive a dialog to verify the address, which then causes the component here
to forget what it was doing and ultimately fail. Dialogs are still used in some
places to communicate errors - these should be replaced with inline validation when
that is available.
*/

/*
TODO: Reduce all the copying between account vs. discovery components.
*/

interface IEmailAddressProps {
    email: ThirdPartyIdentifier;
    disabled?: boolean;
}

interface IEmailAddressState {
    verifying: boolean;
    addTask: AddThreepid | null;
    continueDisabled: boolean;
    bound?: boolean;
}

export class EmailAddress extends React.Component<IEmailAddressProps, IEmailAddressState> {
    public constructor(props: IEmailAddressProps) {
        super(props);

        const { bound } = props.email;

        this.state = {
            verifying: false,
            addTask: null,
            continueDisabled: false,
            bound,
        };
    }

    public componentDidUpdate(prevProps: Readonly<IEmailAddressProps>): void {
        if (this.props.email !== prevProps.email) {
            const { bound } = this.props.email;
            this.setState({ bound });
        }
    }

    private async changeBinding({ bind, label, errorTitle }: Binding): Promise<void> {
        const { medium, address } = this.props.email;

        try {
            if (bind) {
                const task = new AddThreepid(MatrixClientPeg.safeGet());
                this.setState({
                    verifying: true,
                    continueDisabled: true,
                    addTask: task,
                });
                await task.bindEmailAddress(address);
                this.setState({
                    continueDisabled: false,
                });
            } else {
                await MatrixClientPeg.safeGet().unbindThreePid(medium, address);
            }
            this.setState({ bound: bind });
        } catch (err) {
            logger.error(`changeBinding: Unable to ${label} email address ${address}`, err);
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
            errorTitle: _t("settings|general|error_revoke_email_discovery"),
        });
    };

    private onShareClick = (e: ButtonEvent): void => {
        e.stopPropagation();
        e.preventDefault();
        this.changeBinding({
            bind: true,
            label: "share",
            errorTitle: _t("settings|general|error_share_email_discovery"),
        });
    };

    private onContinueClick = async (e: ButtonEvent): Promise<void> => {
        e.stopPropagation();
        e.preventDefault();

        // Prevent the continue button from being pressed multiple times while we're working
        this.setState({ continueDisabled: true });
        try {
            await this.state.addTask?.checkEmailLinkClicked();
            this.setState({
                addTask: null,
                verifying: false,
            });
        } catch (err) {
            logger.error(`Unable to verify email address:`, err);

            let underlyingError = err;
            if (err instanceof UserFriendlyError) {
                underlyingError = err.cause;
            }

            if (underlyingError instanceof MatrixError && underlyingError.errcode === "M_THREEPID_AUTH_FAILED") {
                Modal.createDialog(ErrorDialog, {
                    title: _t("settings|general|email_not_verified"),
                    description: _t("settings|general|email_verification_instructions"),
                });
            } else {
                logger.error("Unable to verify email address: " + err);
                Modal.createDialog(ErrorDialog, {
                    title: _t("settings|general|error_email_verification"),
                    description: extractErrorMessageFromError(err, _t("invite|failed_generic")),
                });
            }
        } finally {
            // Re-enable the continue button so the user can retry
            this.setState({ continueDisabled: false });
        }
    };

    public render(): React.ReactNode {
        const { address } = this.props.email;
        const { verifying, bound } = this.state;

        let status;
        if (verifying) {
            status = (
                <span>
                    {_t("settings|general|discovery_email_verification_instructions")}
                    <AccessibleButton
                        className="mx_GeneralUserSettingsTab_section--discovery_existing_button"
                        kind="primary_sm"
                        onClick={this.onContinueClick}
                        disabled={this.state.continueDisabled}
                    >
                        {_t("action|complete")}
                    </AccessibleButton>
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
                <span className="mx_GeneralUserSettingsTab_section--discovery_existing_address">{address}</span>
                {status}
            </div>
        );
    }
}
interface IProps {
    emails: ThirdPartyIdentifier[];
    isLoading?: boolean;
    disabled?: boolean;
}

export default class EmailAddresses extends React.Component<IProps> {
    public render(): React.ReactNode {
        let content;
        if (this.props.isLoading) {
            content = <InlineSpinner />;
        } else if (this.props.emails.length > 0) {
            content = this.props.emails.map((e) => {
                return <EmailAddress email={e} key={e.address} disabled={this.props.disabled} />;
            });
        }

        const hasEmails = !!this.props.emails.length;

        return (
            <SettingsSubsection
                heading={_t("settings|general|emails_heading")}
                description={(!hasEmails && _t("settings|general|discovery_email_empty")) || undefined}
                stretchContent
            >
                {content}
            </SettingsSubsection>
        );
    }
}
