/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017, 2018, 2019 New Vector Ltd
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
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';
import { _t, _td } from '../../../languageHandler';
import * as sdk from '../../../index';
import Modal from "../../../Modal";
import SdkConfig from "../../../SdkConfig";
import PasswordReset from "../../../PasswordReset";
import AutoDiscoveryUtils, {ValidatedServerConfig} from "../../../utils/AutoDiscoveryUtils";
import classNames from 'classnames';
import AuthPage from "../../views/auth/AuthPage";
import * as Email from "../../../email";

// Phases
// Show controls to configure server details
const PHASE_SERVER_DETAILS = 0;
// Show the forgot password inputs
const PHASE_FORGOT = 1;
// Show the forgot  email adress looks correct
const PHASE_FORGOT_EMAIL_OKAY = 2;
// Same as above, plus password length is correct.
const PHASE_FORGOT_PASSWORD_LENGTH_OKAY = 3;
// Same as above, plus password contains a lowercase letter.
const PHASE_FORGOT_PASSWORD_LOWERCASE_OKAY = 4;
// Same as above, plus password contains an uppercase letter.
const PHASE_FORGOT_PASSWORD_UPPERCASE_OKAY = 5;
// Same as above, plus password contians a number.
const PHASE_FORGOT_PASSWORD_NUMBER_OKAY = 6;
// Same as above, plus password contians a special symbol.
const PHASE_FORGOT_PASSWORD_SYMBOL_OKAY = 7;
// Same as above, plus both password match
const PHASE_FORGOT_CONFIRM_OKAY = 8;
// Email is in the process of being sent
const PHASE_SENDING_EMAIL = 9;
// Email has been sent
const PHASE_EMAIL_SENT = 10;
// User has clicked the link in email and completed reset
const PHASE_DONE = 11;

const SEND_BUTTON_MSG = [
    _td('Fill in your e-mail address.'),
    _td('Create a new password more than 8 chars long.'),
    _td('Password should contain a lower case letter.'),
    _td('Password should contain an upper case letter.'),
    _td('Password should contain a number.'),
    _td('Password should contain a special character.'),
    _td('Confirm your new password'),
    _td('Press to send reset e-mail')];

export default createReactClass({
    displayName: 'ForgotPassword',

    propTypes: {
        serverConfig: PropTypes.instanceOf(ValidatedServerConfig).isRequired,
        onServerConfigChange: PropTypes.func.isRequired,
        onLoginClick: PropTypes.func,
        onComplete: PropTypes.func.isRequired,
    },

    getInitialState: function() {
        return {
            phase: PHASE_FORGOT,
            email: "",
            password: "",
            password2: "",
            // Setting to 0 makes it enables, everything else will disable
            disabled: 1,
            errorText: null,

            // We perform liveliness checks later, but for now suppress the errors.
            // We also track the server dead errors independently of the regular errors so
            // that we can render it differently, and override any other error the user may
            // be seeing.
            serverIsAlive: true,
            serverErrorIsFatal: false,
            serverDeadError: "",
            serverRequiresIdServer: null,
        };
    },

    componentDidMount: function() {
        this.reset = null;
        this._checkServerLiveliness(this.props.serverConfig);
    },

    // TODO: [REACT-WARNING] Replace with appropriate lifecycle event
    UNSAFE_componentWillReceiveProps: function(newProps) {
        if (newProps.serverConfig.hsUrl === this.props.serverConfig.hsUrl &&
            newProps.serverConfig.isUrl === this.props.serverConfig.isUrl) return;

        // Do a liveliness check on the new URLs
        this._checkServerLiveliness(newProps.serverConfig);
    },

    _checkServerLiveliness: async function(serverConfig) {
        try {
            await AutoDiscoveryUtils.validateServerConfigWithStaticUrls(
                serverConfig.hsUrl,
                serverConfig.isUrl,
            );

            const pwReset = new PasswordReset(serverConfig.hsUrl, serverConfig.isUrl);
            const serverRequiresIdServer = await pwReset.doesServerRequireIdServerParam();

            this.setState({
                serverIsAlive: true,
                serverRequiresIdServer,
            });
        } catch (e) {
            this.setState(AutoDiscoveryUtils.authComponentStateForError(e, "forgot_password"));
        }
    },

    testNewPasswordLength: function(password) {
        if (password.length >= 8) {
            return 1
        } else {
            return 0
        }
    },

    testNewPasswordContainsLowerCase: function(password) {
        var pattern = /[a-z]/;
        return pattern.test(password);
    },

    testNewPasswordContainsUpperCase: function(password) {
        var pattern = /[A-Z]/;
        return pattern.test(password);
    },

    testNewPasswordContainsNumber: function(password) {
        var pattern = /[0-9]/;
        return pattern.test(password);
    },

    testNewPasswordContainsSpecialChar: function (password) {
        var pattern = /\W/;
        return pattern.test(password);
    },

    testPasswordsAreEqual: function(password, password2) {
        if (password === password2) {
            return 1
        } else {
            return 0
        }
    },

    getPhasePromotion: function(email,password,password2) {
        if (!Email.looksValid(email)) {
            return PHASE_FORGOT;
        }
        if (!this.testNewPasswordLength(password)) {
            return PHASE_FORGOT_EMAIL_OKAY;
        }
        if (!this.testNewPasswordContainsLowerCase(password)) {
            return PHASE_FORGOT_PASSWORD_LENGTH_OKAY;
        }
        if (!this.testNewPasswordContainsUpperCase(password)) {
            return PHASE_FORGOT_PASSWORD_LOWERCASE_OKAY;
        }
        if (!this.testNewPasswordContainsNumber(password)) {
            return PHASE_FORGOT_PASSWORD_UPPERCASE_OKAY;
        }
        if (!this.testNewPasswordContainsSpecialChar(password)) {
            return PHASE_FORGOT_PASSWORD_NUMBER_OKAY;
        }
        if (!this.testPasswordsAreEqual(password,password2)) {
            return PHASE_FORGOT_PASSWORD_SYMBOL_OKAY;
        }
        return PHASE_FORGOT_CONFIRM_OKAY;
    },

    submitPasswordReset: function(email, password) {
        this.setState({
            phase: PHASE_SENDING_EMAIL,
        });
        this.reset = new PasswordReset(this.props.serverConfig.hsUrl, this.props.serverConfig.isUrl);
        this.reset.resetPassword(email, password).then(() => {
            this.setState({
                phase: PHASE_EMAIL_SENT,
            });
        }, (err) => {
            this.showErrorDialog(_t('Failed to send email') + ": " + err.message);
            this.setState({
                phase: PHASE_FORGOT,
            });
        });
    },

    onVerify: async function(ev) {
        ev.preventDefault();
        if (!this.reset) {
            console.error("onVerify called before submitPasswordReset!");
            return;
        }
        try {
            await this.reset.checkEmailLinkClicked();
            this.setState({ phase: PHASE_DONE });
        } catch (err) {
            this.showErrorDialog(err.message);
        }
    },

    onSubmitForm: async function(ev) {
        ev.preventDefault();

        // refresh the server errors, just in case the server came back online
        await this._checkServerLiveliness(this.props.serverConfig);

        const QuestionDialog = sdk.getComponent("dialogs.QuestionDialog");
        Modal.createTrackedDialog('Forgot Password Warning', '', QuestionDialog, {
            title: _t('Warning!'),
            description:
                <div>
                    { _t(
                        "Changing your password will reset any end-to-end encryption keys " +
                        "on all of your sessions, making encrypted chat history unreadable. Set up " +
                        "Key Backup or export your room keys from another session before resetting your " +
                        "password.",
                    ) }
                </div>,
            button: _t('Continue'),
            onFinished: (confirmed) => {
                if (confirmed) {
                    this.submitPasswordReset(this.state.email, this.state.password);
                }
            },
        });
    },

    onEmailChanged: function(ev) {
        let email = ev.target.value;
        let phase = this.getPhasePromotion(email,this.state.password,this.state.password2)
        let disabled = (phase == PHASE_FORGOT_CONFIRM_OKAY) ? 0 : 1;
        this.setState({
            "phase": phase,
            "email": email,
            "disabled": disabled,
        });
    },

    onPasswordChanged: function(ev) {
        let password = ev.target.value;
        let phase = this.getPhasePromotion(this.state.email,password,this.state.password2)
        let disabled = (phase == PHASE_FORGOT_CONFIRM_OKAY) ? 0 : 1;
        this.setState({
            "phase": phase,
            "password": password,
            "disabled": disabled,
        });
    },

    onPasswordConfirmChanged: function(ev) {
        let password2 = ev.target.value;
        let phase = this.getPhasePromotion(this.state.email,this.state.password,password2)
        let disabled = (phase == PHASE_FORGOT_CONFIRM_OKAY) ? 0 : 1;
        this.setState({
            "phase": phase,
            "password2": password2,
            "disabled": disabled,
        });
    },

    async onServerDetailsNextPhaseClick() {
        this.setState({
            phase: PHASE_FORGOT,
        });
    },

    onEditServerDetailsClick(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        this.setState({
            phase: PHASE_SERVER_DETAILS,
        });
    },

    onLoginClick: function(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        this.props.onLoginClick();
    },

    showErrorDialog: function(body, title) {
        const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
        Modal.createTrackedDialog('Forgot Password Error', '', ErrorDialog, {
            title: title,
            description: body,
        });
    },

    renderServerDetails() {
        const ServerConfig = sdk.getComponent("auth.ServerConfig");

        if (SdkConfig.get()['disable_custom_urls']) {
            return null;
        }

        return <ServerConfig
            serverConfig={this.props.serverConfig}
            onServerConfigChange={this.props.onServerConfigChange}
            delayTimeMs={0}
            showIdentityServerIfRequiredByHomeserver={true}
            onAfterSubmit={this.onServerDetailsNextPhaseClick}
            submitText={_t("Next")}
            submitClass="mx_Login_submit"
        />;
    },

    renderForgot() {
        const Field = sdk.getComponent('elements.Field');

        let errorText = null;
        const err = this.state.errorText;
        if (err) {
            errorText = <div className="mx_Login_error">{ err }</div>;
        }

        let serverDeadSection;
        if (!this.state.serverIsAlive) {
            const classes = classNames({
                "mx_Login_error": true,
                "mx_Login_serverError": true,
                "mx_Login_serverErrorNonFatal": !this.state.serverErrorIsFatal,
            });
            serverDeadSection = (
                <div className={classes}>
                    {this.state.serverDeadError}
                </div>
            );
        }

        let yourMatrixAccountText = _t('Your Matrix account on %(serverName)s', {
            serverName: this.props.serverConfig.hsName,
        });
        if (this.props.serverConfig.hsNameIsDifferent) {
            const TextWithTooltip = sdk.getComponent("elements.TextWithTooltip");

            yourMatrixAccountText = _t('Your Matrix account on <underlinedServerName />', {}, {
                'underlinedServerName': () => {
                    return <TextWithTooltip
                        class="mx_Login_underlinedServerName"
                        tooltip={this.props.serverConfig.hsUrl}
                    >
                        {this.props.serverConfig.hsName}
                    </TextWithTooltip>;
                },
            });
        }

        // If custom URLs are allowed, wire up the server details edit link.
        let editLink = null;
        if (!SdkConfig.get()['disable_custom_urls']) {
            editLink = <a className="mx_AuthBody_editServerDetails"
                href="#" onClick={this.onEditServerDetailsClick}
            >
                {_t('Change')}
            </a>;
        }

        if (!this.props.serverConfig.isUrl && this.state.serverRequiresIdServer) {
            return <div>
                <h3>
                    {yourMatrixAccountText}
                    {editLink}
                </h3>
                {_t(
                    "No identity server is configured: " +
                    "add one in server settings to reset your password.",
                )}
                <a className="mx_AuthBody_changeFlow" onClick={this.onLoginClick} href="#">
                    {_t('Sign in instead')}
                </a>
            </div>;
        }

        return <div>
            {errorText}
            {serverDeadSection}
            <h3>
                {yourMatrixAccountText}
                {editLink}
            </h3>
            <form onSubmit={this.onSubmitForm}>
                <div className="mx_AuthBody_fieldRow">
                    <Field
                        name="reset_email" // define a name so browser's password autofill gets less confused
                        type="text"
                        label={_t('Email')}
                        value={this.state.email}
                        onChange={this.onEmailChanged}
                        autoFocus
                    />
                </div>
                <div className="mx_AuthBody_fieldRow">
                    <Field
                        name="reset_password"
                        type="password"
                        label={_t('Password')}
                        value={this.state.password}
                        onChange={this.onPasswordChanged}
                    />
                    <Field
                        name="reset_password_confirm"
                        type="password"
                        label={_t('Confirm')}
                        value={this.state.password2}
                        onChange={this.onPasswordConfirmChanged}
                    />
                </div>
                <span>{_t(
                    'A verification email will be sent to your inbox to confirm ' +
                    'setting your new password.',
                )}</span>
                <input
                    className="mx_Login_submit"
                    type="submit" disabled={this.state.disabled}
                    value={SEND_BUTTON_MSG[this.state.phase-PHASE_FORGOT]}
                />
            </form>
            <a className="mx_AuthBody_changeFlow" onClick={this.onLoginClick} href="#">
                {_t('Sign in instead')}
            </a>
        </div>;
    },

    renderSendingEmail() {
        const Spinner = sdk.getComponent("elements.Spinner");
        return <Spinner />;
    },

    renderEmailSent() {
        return <div>
            {_t("An email has been sent to %(emailAddress)s. Once you've followed the " +
                "link it contains, click below.", { emailAddress: this.state.email })}
            <br />
            <input className="mx_Login_submit" type="button" onClick={this.onVerify}
                value={_t('I have verified my email address')} />
        </div>;
    },

    renderDone() {
        return <div>
            <p>{_t("Your password has been reset.")}</p>
            <p>{_t(
                "You have been logged out of all sessions and will no longer receive " +
                "push notifications. To re-enable notifications, sign in again on each " +
                "device.",
            )}</p>
            <input className="mx_Login_submit" type="button" onClick={this.props.onComplete}
                value={_t('Return to login screen')} />
        </div>;
    },

    render: function() {
        const AuthHeader = sdk.getComponent("auth.AuthHeader");
        const AuthBody = sdk.getComponent("auth.AuthBody");

        let resetPasswordJsx;
        switch (this.state.phase) {
            case PHASE_SERVER_DETAILS:
                resetPasswordJsx = this.renderServerDetails();
                break;
            case PHASE_FORGOT:
            case PHASE_FORGOT_EMAIL_OKAY:
            case PHASE_FORGOT_PASSWORD_LENGTH_OKAY:
            case PHASE_FORGOT_PASSWORD_LOWERCASE_OKAY:
            case PHASE_FORGOT_PASSWORD_UPPERCASE_OKAY:
            case PHASE_FORGOT_PASSWORD_NUMBER_OKAY:
            case PHASE_FORGOT_PASSWORD_SYMBOL_OKAY:
            case PHASE_FORGOT_CONFIRM_OKAY:
                resetPasswordJsx = this.renderForgot();
                break;
            case PHASE_SENDING_EMAIL:
                resetPasswordJsx = this.renderSendingEmail();
                break;
            case PHASE_EMAIL_SENT:
                resetPasswordJsx = this.renderEmailSent();
                break;
            case PHASE_DONE:
                resetPasswordJsx = this.renderDone();
                break;
        }

        return (
            <AuthPage>
                <AuthHeader />
                <AuthBody>
                    <h2> { _t('Set a new password') } </h2>
                    {resetPasswordJsx}
                </AuthBody>
            </AuthPage>
        );
    },
});
