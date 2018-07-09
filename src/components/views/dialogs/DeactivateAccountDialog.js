/*
Copyright 2016 OpenMarket Ltd

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
import PropTypes from 'prop-types';

import sdk from '../../../index';
import Analytics from '../../../Analytics';
import MatrixClientPeg from '../../../MatrixClientPeg';
import * as Lifecycle from '../../../Lifecycle';
import Velocity from 'velocity-vector';
import { _t } from '../../../languageHandler';

export default class DeactivateAccountDialog extends React.Component {
    constructor(props, context) {
        super(props, context);

        this._passwordField = null;

        this._onOk = this._onOk.bind(this);
        this._onCancel = this._onCancel.bind(this);
        this._onPasswordFieldChange = this._onPasswordFieldChange.bind(this);
        this._onEraseFieldChange = this._onEraseFieldChange.bind(this);

        const deactivationPreferences =
            MatrixClientPeg.get().getAccountData('im.riot.account_deactivation_preferences');

        const shouldErase = (
            deactivationPreferences &&
            deactivationPreferences.getContent() &&
            deactivationPreferences.getContent().shouldErase
        ) || false;

        this.state = {
            confirmButtonEnabled: false,
            busy: false,
            shouldErase,
            errStr: null,
        };
    }

    _onPasswordFieldChange(ev) {
        this.setState({
            confirmButtonEnabled: Boolean(ev.target.value),
        });
    }

    _onEraseFieldChange(ev) {
        this.setState({
            shouldErase: ev.target.checked,
        });
    }

    async _onOk() {
        this.setState({busy: true});

        // Before we deactivate the account insert an event into
        // the user's account data indicating that they wish to be
        // erased from the homeserver.
        //
        // We do this because the API for erasing after deactivation
        // might not be supported by the connected homeserver. Leaving
        // an indication in account data is only best-effort, and
        // in the worse case, the HS maintainer would have to run a
        // script to erase deactivated accounts that have shouldErase
        // set to true in im.riot.account_deactivation_preferences.
        //
        // Note: The preferences are scoped to Riot, hence the
        // "im.riot..." event type.
        //
        // Note: This may have already been set on previous attempts
        // where, for example, the user entered the wrong password.
        // This is fine because the UI always indicates the preference
        // prior to us calling `deactivateAccount`.
        try {
            await MatrixClientPeg.get().setAccountData('im.riot.account_deactivation_preferences', {
                shouldErase: this.state.shouldErase,
            });
        } catch (err) {
            this.setState({
                busy: false,
                errStr: _t('Failed to indicate account erasure'),
            });
            return;
        }

        try {
            // This assumes that the HS requires password UI auth
            // for this endpoint. In reality it could be any UI auth.
            const auth = {
                type: 'm.login.password',
                user: MatrixClientPeg.get().credentials.userId,
                password: this._passwordField.value,
            };
            await MatrixClientPeg.get().deactivateAccount(auth, this.state.shouldErase);
        } catch (err) {
            let errStr = _t('Unknown error');
            // https://matrix.org/jira/browse/SYN-744
            if (err.httpStatus == 401 || err.httpStatus == 403) {
                errStr = _t('Incorrect password');
                Velocity(this._passwordField, "callout.shake", 300);
            }
            this.setState({
                busy: false,
                errStr: errStr,
            });
            return;
        }

        Analytics.trackEvent('Account', 'Deactivate Account');
        Lifecycle.onLoggedOut();
        this.props.onFinished(false);
    }

    _onCancel() {
        this.props.onFinished(false);
    }

    render() {
        const BaseDialog = sdk.getComponent('views.dialogs.BaseDialog');
        const Loader = sdk.getComponent("elements.Spinner");
        let passwordBoxClass = '';

        let error = null;
        if (this.state.errStr) {
            error = <div className="error">
                { this.state.errStr }
            </div>;
            passwordBoxClass = 'error';
        }

        const okLabel = this.state.busy ? <Loader /> : _t('Deactivate Account');
        const okEnabled = this.state.confirmButtonEnabled && !this.state.busy;

        let cancelButton = null;
        if (!this.state.busy) {
            cancelButton = <button onClick={this._onCancel} autoFocus={true}>
                { _t("Cancel") }
            </button>;
        }

        return (
            <BaseDialog className="mx_DeactivateAccountDialog"
                onFinished={this.props.onFinished}
                onEnterPressed={this.onOk}
                titleClass="danger"
                title={_t("Deactivate Account")}
            >
                <div className="mx_Dialog_content">
                    <p>{ _t(
                        "This will make your account permanently unusable. " +
                        "You will not be able to log in, and no one will be able to re-register the same " +
                        "user ID. " +
                        "This will cause your account to leave all rooms it is participating in, and it " +
                        "will remove your account details from your identity server. " +
                        "<b>This action is irreversible.</b>",
                        {},
                        { b: (sub) => <b> { sub } </b> },
                    ) }</p>

                    <p>{ _t(
                        "Deactivating your account <b>does not by default cause us to forget messages you " +
                        "have sent.</b> " +
                        "If you would like us to forget your messages, please tick the box below.",
                        {},
                        { b: (sub) => <b> { sub } </b> },
                    ) }</p>

                    <p>{ _t(
                        "Message visibility in Matrix is similar to email. " +
                        "Our forgetting your messages means that messages you have sent will not be shared " +
                        "with any new or unregistered users, but registered users who already have access " +
                        "to these messages will still have access to their copy.",
                    ) }</p>

                    <div className="mx_DeactivateAccountDialog_input_section">
                        <p>
                            <label htmlFor="mx_DeactivateAccountDialog_erase_account_input">
                                <input
                                    id="mx_DeactivateAccountDialog_erase_account_input"
                                    type="checkbox"
                                    checked={this.state.shouldErase}
                                    onChange={this._onEraseFieldChange}
                                />
                                { _t(
                                    "Please forget all messages I have sent when my account is deactivated " +
                                    "(<b>Warning:</b> this will cause future users to see an incomplete view " +
                                    "of conversations)",
                                    {},
                                    { b: (sub) => <b>{ sub }</b> },
                                ) }
                            </label>
                        </p>

                        <p>{ _t("To continue, please enter your password:") }</p>
                        <input
                            type="password"
                            placeholder={_t("password")}
                            onChange={this._onPasswordFieldChange}
                            ref={(e) => {this._passwordField = e;}}
                            className={passwordBoxClass}
                        />
                    </div>

                    { error }
                </div>
                <div className="mx_Dialog_buttons">
                    <button
                        className="mx_Dialog_primary danger"
                        onClick={this._onOk}
                        disabled={!okEnabled}
                    >
                        { okLabel }
                    </button>

                    { cancelButton }
                </div>
            </BaseDialog>
        );
    }
}

DeactivateAccountDialog.propTypes = {
    onFinished: PropTypes.func.isRequired,
};
