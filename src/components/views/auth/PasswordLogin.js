/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 Vector Creations Ltd

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
import classNames from 'classnames';
import sdk from '../../../index';
import { _t } from '../../../languageHandler';
import SdkConfig from '../../../SdkConfig';

/**
 * A pure UI component which displays a username/password form.
 */
class PasswordLogin extends React.Component {
    static defaultProps = {
        onError: function() {},
        onEditServerDetailsClick: null,
        onUsernameChanged: function() {},
        onUsernameBlur: function() {},
        onPasswordChanged: function() {},
        onPhoneCountryChanged: function() {},
        onPhoneNumberChanged: function() {},
        onPhoneNumberBlur: function() {},
        initialUsername: "",
        initialPhoneCountry: "",
        initialPhoneNumber: "",
        initialPassword: "",
        loginIncorrect: false,
        // This is optional and only set if we used a server name to determine
        // the HS URL via `.well-known` discovery. The server name is used
        // instead of the HS URL when talking about where to "sign in to".
        hsName: null,
        hsUrl: "",
        disableSubmit: false,
    }

    constructor(props) {
        super(props);
        this.state = {
            username: this.props.initialUsername,
            password: this.props.initialPassword,
            phoneCountry: this.props.initialPhoneCountry,
            phoneNumber: this.props.initialPhoneNumber,
            loginType: PasswordLogin.LOGIN_FIELD_MXID,
        };

        this.onForgotPasswordClick = this.onForgotPasswordClick.bind(this);
        this.onSubmitForm = this.onSubmitForm.bind(this);
        this.onUsernameChanged = this.onUsernameChanged.bind(this);
        this.onUsernameBlur = this.onUsernameBlur.bind(this);
        this.onLoginTypeChange = this.onLoginTypeChange.bind(this);
        this.onPhoneCountryChanged = this.onPhoneCountryChanged.bind(this);
        this.onPhoneNumberChanged = this.onPhoneNumberChanged.bind(this);
        this.onPhoneNumberBlur = this.onPhoneNumberBlur.bind(this);
        this.onPasswordChanged = this.onPasswordChanged.bind(this);
        this.isLoginEmpty = this.isLoginEmpty.bind(this);
    }

    onForgotPasswordClick(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        this.props.onForgotPasswordClick();
    }

    onSubmitForm(ev) {
        ev.preventDefault();

        let username = ''; // XXX: Synapse breaks if you send null here:
        let phoneCountry = null;
        let phoneNumber = null;
        let error;

        switch (this.state.loginType) {
            case PasswordLogin.LOGIN_FIELD_EMAIL:
                username = this.state.username;
                if (!username) {
                    error = _t('The email field must not be blank.');
                }
                break;
            case PasswordLogin.LOGIN_FIELD_MXID:
                username = this.state.username;
                if (!username) {
                    error = _t('The username field must not be blank.');
                }
                break;
            case PasswordLogin.LOGIN_FIELD_PHONE:
                phoneCountry = this.state.phoneCountry;
                phoneNumber = this.state.phoneNumber;
                if (!phoneNumber) {
                    error = _t('The phone number field must not be blank.');
                }
                break;
        }

        if (error) {
            this.props.onError(error);
            return;
        }

        if (!this.state.password) {
            this.props.onError(_t('The password field must not be blank.'));
            return;
        }

        this.props.onSubmit(
            username,
            phoneCountry,
            phoneNumber,
            this.state.password,
        );
    }

    onUsernameChanged(ev) {
        this.setState({username: ev.target.value});
        this.props.onUsernameChanged(ev.target.value);
    }

    onUsernameBlur(ev) {
        this.props.onUsernameBlur(ev.target.value);
    }

    onLoginTypeChange(ev) {
        const loginType = ev.target.value;
        this.props.onError(null); // send a null error to clear any error messages
        this.setState({
            loginType: loginType,
            username: "", // Reset because email and username use the same state
        });
    }

    onPhoneCountryChanged(country) {
        this.setState({
            phoneCountry: country.iso2,
            phonePrefix: country.prefix,
        });
        this.props.onPhoneCountryChanged(country.iso2);
    }

    onPhoneNumberChanged(ev) {
        this.setState({phoneNumber: ev.target.value});
        this.props.onPhoneNumberChanged(ev.target.value);
    }

    onPhoneNumberBlur(ev) {
        this.props.onPhoneNumberBlur(ev.target.value);
    }

    onPasswordChanged(ev) {
        this.setState({password: ev.target.value});
        this.props.onPasswordChanged(ev.target.value);
    }

    renderLoginField(loginType) {
        const Field = sdk.getComponent('elements.Field');

        const classes = {};

        switch (loginType) {
            case PasswordLogin.LOGIN_FIELD_EMAIL:
                classes.error = this.props.loginIncorrect && !this.state.username;
                return <Field
                    className={classNames(classes)}
                    id="mx_PasswordLogin_email"
                    name="username" // make it a little easier for browser's remember-password
                    key="email_input"
                    type="text"
                    label={_t("Email")}
                    placeholder="joe@example.com"
                    value={this.state.username}
                    onChange={this.onUsernameChanged}
                    onBlur={this.onUsernameBlur}
                    autoFocus
                />;
            case PasswordLogin.LOGIN_FIELD_MXID:
                classes.error = this.props.loginIncorrect && !this.state.username;
                return <Field
                    className={classNames(classes)}
                    id="mx_PasswordLogin_username"
                    name="username" // make it a little easier for browser's remember-password
                    key="username_input"
                    type="text"
                    label={SdkConfig.get().disable_custom_urls ?
                        _t("Username on %(hs)s", {
                            hs: this.props.hsUrl.replace(/^https?:\/\//, ''),
                        }) : _t("Username")}
                    value={this.state.username}
                    onChange={this.onUsernameChanged}
                    onBlur={this.onUsernameBlur}
                    autoFocus
                />;
            case PasswordLogin.LOGIN_FIELD_PHONE: {
                const CountryDropdown = sdk.getComponent('views.auth.CountryDropdown');
                classes.error = this.props.loginIncorrect && !this.state.phoneNumber;

                const phoneCountry = <CountryDropdown
                    value={this.state.phoneCountry}
                    isSmall={true}
                    showPrefix={true}
                    onOptionChange={this.onPhoneCountryChanged}
                />;

                return <Field
                    className={classNames(classes)}
                    id="mx_PasswordLogin_phoneNumber"
                    name="phoneNumber"
                    key="phone_input"
                    type="text"
                    label={_t("Phone")}
                    value={this.state.phoneNumber}
                    prefix={phoneCountry}
                    onChange={this.onPhoneNumberChanged}
                    onBlur={this.onPhoneNumberBlur}
                    autoFocus
                />;
            }
        }
    }

    isLoginEmpty() {
        switch (this.state.loginType) {
            case PasswordLogin.LOGIN_FIELD_EMAIL:
            case PasswordLogin.LOGIN_FIELD_MXID:
                return !this.state.username;
            case PasswordLogin.LOGIN_FIELD_PHONE:
                return !this.state.phoneCountry || !this.state.phoneNumber;
        }
    }

    render() {
        const Field = sdk.getComponent('elements.Field');

        let forgotPasswordJsx;

        if (this.props.onForgotPasswordClick) {
            forgotPasswordJsx = <span>
                {_t('Not sure of your password? <a>Set a new one</a>', {}, {
                    a: sub => <a className="mx_Login_forgot"
                        onClick={this.onForgotPasswordClick}
                        href="#"
                    >
                        {sub}
                    </a>,
                })}
            </span>;
        }

        let signInToText = _t('Sign in to your Matrix account');
        if (this.props.hsName) {
            signInToText = _t('Sign in to your Matrix account on %(serverName)s', {
                serverName: this.props.hsName,
            });
        } else {
            try {
                const parsedHsUrl = new URL(this.props.hsUrl);
                signInToText = _t('Sign in to your Matrix account on %(serverName)s', {
                    serverName: parsedHsUrl.hostname,
                });
            } catch (e) {
                // ignore
            }
        }

        let editLink = null;
        if (this.props.onEditServerDetailsClick) {
            editLink = <a className="mx_AuthBody_editServerDetails"
                href="#" onClick={this.props.onEditServerDetailsClick}
            >
                {_t('Change')}
            </a>;
        }

        const pwFieldClass = classNames({
            error: this.props.loginIncorrect && !this.isLoginEmpty(), // only error password if error isn't top field
        });

        const loginField = this.renderLoginField(this.state.loginType);

        let loginType;
        if (!SdkConfig.get().disable_3pid_login) {
            loginType = (
                <div className="mx_Login_type_container">
                    <label className="mx_Login_type_label">{ _t('Sign in with') }</label>
                    <Field
                        className="mx_Login_type_dropdown"
                        id="mx_PasswordLogin_type"
                        element="select"
                        value={this.state.loginType}
                        onChange={this.onLoginTypeChange}
                    >
                        <option
                            key={PasswordLogin.LOGIN_FIELD_MXID}
                            value={PasswordLogin.LOGIN_FIELD_MXID}
                        >
                            {_t('Username')}
                        </option>
                        <option
                            key={PasswordLogin.LOGIN_FIELD_EMAIL}
                            value={PasswordLogin.LOGIN_FIELD_EMAIL}
                        >
                            {_t('Email address')}
                        </option>
                        <option
                            key={PasswordLogin.LOGIN_FIELD_PHONE}
                            value={PasswordLogin.LOGIN_FIELD_PHONE}
                        >
                            {_t('Phone')}
                        </option>
                    </Field>
                </div>
            );
        }

        return (
            <div>
                <h3>
                    {signInToText}
                    {editLink}
                </h3>
                <form onSubmit={this.onSubmitForm}>
                    {loginType}
                    {loginField}
                    <Field
                        className={pwFieldClass}
                        id="mx_PasswordLogin_password"
                        type="password"
                        name="password"
                        label={_t('Password')}
                        value={this.state.password}
                        onChange={this.onPasswordChanged}
                    />
                    {forgotPasswordJsx}
                    <input className="mx_Login_submit"
                        type="submit"
                        value={_t('Sign in')}
                        disabled={this.props.disableSubmit}
                    />
                </form>
            </div>
        );
    }
}

PasswordLogin.LOGIN_FIELD_EMAIL = "login_field_email";
PasswordLogin.LOGIN_FIELD_MXID = "login_field_mxid";
PasswordLogin.LOGIN_FIELD_PHONE = "login_field_phone";

PasswordLogin.propTypes = {
    onSubmit: PropTypes.func.isRequired, // fn(username, password)
    onError: PropTypes.func,
    onForgotPasswordClick: PropTypes.func, // fn()
    initialUsername: PropTypes.string,
    initialPhoneCountry: PropTypes.string,
    initialPhoneNumber: PropTypes.string,
    initialPassword: PropTypes.string,
    onUsernameChanged: PropTypes.func,
    onPhoneCountryChanged: PropTypes.func,
    onPhoneNumberChanged: PropTypes.func,
    onPasswordChanged: PropTypes.func,
    loginIncorrect: PropTypes.bool,
    hsName: PropTypes.string,
    hsUrl: PropTypes.string,
    disableSubmit: PropTypes.bool,
};

module.exports = PasswordLogin;
