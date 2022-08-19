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

import React from 'react';
import { IThreepid, ThreepidMedium } from "matrix-js-sdk/src/@types/threepids";
import { logger } from "matrix-js-sdk/src/logger";

import { _t } from "../../../../languageHandler";
import { MatrixClientPeg } from "../../../../MatrixClientPeg";
import Field from "../../elements/Field";
import AccessibleButton from "../../elements/AccessibleButton";
import * as Email from "../../../../email";
import AddThreepid from "../../../../AddThreepid";
import Modal from '../../../../Modal';
import ErrorDialog from "../../dialogs/ErrorDialog";

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

interface IExistingEmailAddressProps {
    email: IThreepid;
    onRemoved: (emails: IThreepid) => void;
}

interface IExistingEmailAddressState {
    verifyRemove: boolean;
}

export class ExistingEmailAddress extends React.Component<IExistingEmailAddressProps, IExistingEmailAddressState> {
    constructor(props: IExistingEmailAddressProps) {
        super(props);

        this.state = {
            verifyRemove: false,
        };
    }

    private onRemove = (e: React.MouseEvent): void => {
        e.stopPropagation();
        e.preventDefault();

        this.setState({ verifyRemove: true });
    };

    private onDontRemove = (e: React.MouseEvent): void => {
        e.stopPropagation();
        e.preventDefault();

        this.setState({ verifyRemove: false });
    };

    private onActuallyRemove = (e: React.MouseEvent): void => {
        e.stopPropagation();
        e.preventDefault();

        MatrixClientPeg.get().deleteThreePid(this.props.email.medium, this.props.email.address).then(() => {
            return this.props.onRemoved(this.props.email);
        }).catch((err) => {
            logger.error("Unable to remove contact information: " + err);
            Modal.createDialog(ErrorDialog, {
                title: _t("Unable to remove contact information"),
                description: ((err && err.message) ? err.message : _t("Operation failed")),
            });
        });
    };

    public render(): JSX.Element {
        if (this.state.verifyRemove) {
            return (
                <div className="mx_ExistingEmailAddress">
                    <span className="mx_ExistingEmailAddress_promptText">
                        { _t("Remove %(email)s?", { email: this.props.email.address }) }
                    </span>
                    <AccessibleButton
                        onClick={this.onActuallyRemove}
                        kind="danger_sm"
                        className="mx_ExistingEmailAddress_confirmBtn"
                    >
                        { _t("Remove") }
                    </AccessibleButton>
                    <AccessibleButton
                        onClick={this.onDontRemove}
                        kind="link_sm"
                        className="mx_ExistingEmailAddress_confirmBtn"
                    >
                        { _t("Cancel") }
                    </AccessibleButton>
                </div>
            );
        }

        return (
            <div className="mx_ExistingEmailAddress">
                <span className="mx_ExistingEmailAddress_email">{ this.props.email.address }</span>
                <AccessibleButton onClick={this.onRemove} kind="danger_sm">
                    { _t("Remove") }
                </AccessibleButton>
            </div>
        );
    }
}

interface IProps {
    emails: IThreepid[];
    onEmailsChange: (emails: Partial<IThreepid>[]) => void;
}

interface IState {
    verifying: boolean;
    addTask: any; // FIXME: When AddThreepid is TSfied
    continueDisabled: boolean;
    newEmailAddress: string;
}

export default class EmailAddresses extends React.Component<IProps, IState> {
    constructor(props: IProps) {
        super(props);

        this.state = {
            verifying: false,
            addTask: null,
            continueDisabled: false,
            newEmailAddress: "",
        };
    }

    private onRemoved = (address): void => {
        const emails = this.props.emails.filter((e) => e !== address);
        this.props.onEmailsChange(emails);
    };

    private onChangeNewEmailAddress = (e: React.ChangeEvent<HTMLInputElement>): void => {
        this.setState({
            newEmailAddress: e.target.value,
        });
    };

    private onAddClick = (e: React.FormEvent): void => {
        e.stopPropagation();
        e.preventDefault();

        if (!this.state.newEmailAddress) return;

        const email = this.state.newEmailAddress;

        // TODO: Inline field validation
        if (!Email.looksValid(email)) {
            Modal.createDialog(ErrorDialog, {
                title: _t("Invalid Email Address"),
                description: _t("This doesn't appear to be a valid email address"),
            });
            return;
        }

        const task = new AddThreepid();
        this.setState({ verifying: true, continueDisabled: true, addTask: task });

        task.addEmailAddress(email).then(() => {
            this.setState({ continueDisabled: false });
        }).catch((err) => {
            logger.error("Unable to add email address " + email + " " + err);
            this.setState({ verifying: false, continueDisabled: false, addTask: null });
            Modal.createDialog(ErrorDialog, {
                title: _t("Unable to add email address"),
                description: ((err && err.message) ? err.message : _t("Operation failed")),
            });
        });
    };

    private onContinueClick = (e: React.MouseEvent): void => {
        e.stopPropagation();
        e.preventDefault();

        this.setState({ continueDisabled: true });
        this.state.addTask.checkEmailLinkClicked().then(([finished]) => {
            let newEmailAddress = this.state.newEmailAddress;
            if (finished) {
                const email = this.state.newEmailAddress;
                const emails = [
                    ...this.props.emails,
                    { address: email, medium: ThreepidMedium.Email },
                ];
                this.props.onEmailsChange(emails);
                newEmailAddress = "";
            }
            this.setState({
                addTask: null,
                continueDisabled: false,
                verifying: false,
                newEmailAddress,
            });
        }).catch((err) => {
            this.setState({ continueDisabled: false });
            if (err.errcode === 'M_THREEPID_AUTH_FAILED') {
                Modal.createDialog(ErrorDialog, {
                    title: _t("Your email address hasn't been verified yet"),
                    description: _t("Click the link in the email you received to verify " +
                        "and then click continue again."),
                });
            } else {
                logger.error("Unable to verify email address: ", err);
                Modal.createDialog(ErrorDialog, {
                    title: _t("Unable to verify email address."),
                    description: ((err && err.message) ? err.message : _t("Operation failed")),
                });
            }
        });
    };

    public render(): JSX.Element {
        const existingEmailElements = this.props.emails.map((e) => {
            return <ExistingEmailAddress email={e} onRemoved={this.onRemoved} key={e.address} />;
        });

        let addButton = (
            <AccessibleButton onClick={this.onAddClick} kind="primary">
                { _t("Add") }
            </AccessibleButton>
        );
        if (this.state.verifying) {
            addButton = (
                <div>
                    <div>{ _t("We've sent you an email to verify your address. Please follow the instructions there and then click the button below.") }</div>
                    <AccessibleButton
                        onClick={this.onContinueClick}
                        kind="primary"
                        disabled={this.state.continueDisabled}
                    >
                        { _t("Continue") }
                    </AccessibleButton>
                </div>
            );
        }

        return (
            <div className="mx_EmailAddresses">
                { existingEmailElements }
                <form
                    onSubmit={this.onAddClick}
                    autoComplete="off"
                    noValidate={true}
                    className="mx_EmailAddresses_new"
                >
                    <Field
                        type="text"
                        label={_t("Email Address")}
                        autoComplete="off"
                        disabled={this.state.verifying}
                        value={this.state.newEmailAddress}
                        onChange={this.onChangeNewEmailAddress}
                    />
                    { addButton }
                </form>
            </div>
        );
    }
}
