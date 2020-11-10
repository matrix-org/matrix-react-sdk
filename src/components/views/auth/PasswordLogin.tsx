/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 Vector Creations Ltd
Copyright 2019 New Vector Ltd.

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
import classNames from 'classnames';
import { _t } from '../../../languageHandler';
import SdkConfig from '../../../SdkConfig';
import AccessibleButton, { ButtonEvent } from "../elements/AccessibleButton";
import CountlyAnalytics from "../../../CountlyAnalytics";
import CountryDropdown from "../auth/CountryDropdown";
import SignInToText from "../auth/SignInToText";
import Field from "../elements/Field";
import { ValidatedServerConfig } from "../../../utils/AutoDiscoveryUtils";

interface IProps {
    onError: (error: string) => void;
    onEditServerDetailsClick: () => void | null,
    onUsernameChanged: (username: string) => void;
    onUsernameBlur: (blur: string) => void;
    onPasswordChanged: (password: string) => void;
    onPhoneCountryChanged: (country: any) => void;
    onPhoneNumberChanged: (number: string) => void;
    onPhoneNumberBlur: (blur: string) => void;
    onForgotPasswordClick: () => void;
    onSubmit: (username: string, phoneCountry: string, phoneNumber: string, password: string) => void;

    initialUsername: string;
    initialPassword: string;
    initialPhoneCountry: string;
    initialPhoneNumber: string;
    loginIncorrect: boolean;
    disableSubmit: boolean;
    busy?: boolean;
    serverConfig?: ValidatedServerConfig;
}

enum LoginType {
    LOGIN_FIELD_EMAIL = "login_field_email",
    LOGIN_FIELD_MXID = "login_field_mxid",
    LOGIN_FIELD_PHONE = "login_field_phone",
}

interface IState {
    username: string;
    password: string;
    phoneCountry: string;
    phoneNumber: string;
    phonePrefix?: string;
    loginType: LoginType;
}

/**
 * A pure UI component which displays a username/password form.
 */
export default class PasswordLogin extends React.Component<IProps, IState> {
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
        disableSubmit: false,
    };

    constructor(props: IProps) {
        super(props);
        this.state = {
            username: this.props.initialUsername,
            password: this.props.initialPassword,
            phoneCountry: this.props.initialPhoneCountry,
            phoneNumber: this.props.initialPhoneNumber,
            loginType: LoginType.LOGIN_FIELD_MXID,
        };
    }

    onForgotPasswordClick = (ev: ButtonEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        this.props.onForgotPasswordClick();
    }

    onSubmitForm = (ev: React.FormEvent<HTMLFormElement>) => {
        ev.preventDefault();

        let username = ''; // XXX: Synapse breaks if you send null here:
        let phoneCountry = '';
        let phoneNumber = '';
        let error = '';

        switch (this.state.loginType) {
            case LoginType.LOGIN_FIELD_EMAIL:
                username = this.state.username;
                if (!username) {
                    error = _t('The email field must not be blank.');
                }
                break;
            case LoginType.LOGIN_FIELD_MXID:
                username = this.state.username;
                if (!username) {
                    error = _t('The username field must not be blank.');
                }
                break;
            case LoginType.LOGIN_FIELD_PHONE:
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

    onUsernameChanged = (ev: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({username: ev.target.value});
        this.props.onUsernameChanged(ev.target.value);
    }

    onUsernameFocus = () => {
        if (this.state.loginType === LoginType.LOGIN_FIELD_MXID) {
            CountlyAnalytics.instance.track("onboarding_login_mxid_focus");
        } else {
            CountlyAnalytics.instance.track("onboarding_login_email_focus");
        }
    }

    onUsernameBlur = (ev: React.ChangeEvent<HTMLInputElement>) => {
        if (this.state.loginType === LoginType.LOGIN_FIELD_MXID) {
            CountlyAnalytics.instance.track("onboarding_login_mxid_blur");
        } else {
            CountlyAnalytics.instance.track("onboarding_login_email_blur");
        }
        this.props.onUsernameBlur(ev.target.value);
    }

    onLoginTypeChange = (ev: React.ChangeEvent<HTMLSelectElement>) => {
        const loginType = ev.target.value as LoginType;
        this.props.onError(null); // send a null error to clear any error messages
        this.setState({
            loginType: loginType,
            username: "", // Reset because email and username use the same state
        });
        CountlyAnalytics.instance.track("onboarding_login_type_changed", { loginType });
    }

    onPhoneCountryChanged = (country: {iso2: string, name: string, prefix: string}) =>{
        this.setState({
            phoneCountry: country.iso2,
            phonePrefix: country.prefix,
        });
        this.props.onPhoneCountryChanged(country.iso2);
    }

    onPhoneNumberChanged = (ev: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({phoneNumber: ev.target.value});
        this.props.onPhoneNumberChanged(ev.target.value);
    }

    onPhoneNumberFocus = () => {
        CountlyAnalytics.instance.track("onboarding_login_phone_number_focus");
    }

    onPhoneNumberBlur = (ev: React.ChangeEvent<HTMLInputElement>) => {
        this.props.onPhoneNumberBlur(ev.target.value);
        CountlyAnalytics.instance.track("onboarding_login_phone_number_blur");
    }

    onPasswordChanged = (ev: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({password: ev.target.value});
        this.props.onPasswordChanged(ev.target.value);
    }

    renderLoginField(loginType: LoginType, autoFocus: boolean) {
        const classes: { error?: boolean } = {};

        switch (loginType) {
            case LoginType.LOGIN_FIELD_EMAIL:
                classes.error = this.props.loginIncorrect && !this.state.username;
                return <Field
                    className={classNames(classes)}
                    name="username" // make it a little easier for browser's remember-password
                    key="email_input"
                    type="text"
                    label={_t("Email")}
                    placeholder="joe@example.com"
                    value={this.state.username}
                    onChange={this.onUsernameChanged}
                    onFocus={this.onUsernameFocus}
                    onBlur={this.onUsernameBlur}
                    disabled={this.props.disableSubmit}
                    autoFocus={autoFocus}
                />;
            case LoginType.LOGIN_FIELD_MXID:
                classes.error = this.props.loginIncorrect && !this.state.username;
                return <Field
                    className={classNames(classes)}
                    name="username" // make it a little easier for browser's remember-password
                    key="username_input"
                    type="text"
                    label={_t("Username")}
                    value={this.state.username}
                    onChange={this.onUsernameChanged}
                    onFocus={this.onUsernameFocus}
                    onBlur={this.onUsernameBlur}
                    disabled={this.props.disableSubmit}
                    autoFocus={autoFocus}
                />;
            case LoginType.LOGIN_FIELD_PHONE: {
                classes.error = this.props.loginIncorrect && !this.state.phoneNumber;

                const phoneCountry = <CountryDropdown
                    value={this.state.phoneCountry}
                    isSmall={true}
                    showPrefix={true}
                    onOptionChange={this.onPhoneCountryChanged}
                />;

                return <Field
                    className={classNames(classes)}
                    name="phoneNumber"
                    key="phone_input"
                    type="text"
                    label={_t("Phone")}
                    value={this.state.phoneNumber}
                    prefixComponent={phoneCountry}
                    onChange={this.onPhoneNumberChanged}
                    onFocus={this.onPhoneNumberFocus}
                    onBlur={this.onPhoneNumberBlur}
                    disabled={this.props.disableSubmit}
                    autoFocus={autoFocus}
                />;
            }
        }
    }

    isLoginEmpty = () => {
        switch (this.state.loginType) {
            case LoginType.LOGIN_FIELD_EMAIL:
            case LoginType.LOGIN_FIELD_MXID:
                return !this.state.username;
            case LoginType.LOGIN_FIELD_PHONE:
                return !this.state.phoneCountry || !this.state.phoneNumber;
        }
    }

    render() {
        let forgotPasswordJsx: JSX.Element | undefined;

        if (this.props.onForgotPasswordClick) {
            forgotPasswordJsx = <span>
                {_t('Not sure of your password? <a>Set a new one</a>', {}, {
                    a: sub => (
                        <AccessibleButton
                            className="mx_Login_forgot"
                            disabled={this.props.busy}
                            kind="link"
                            onClick={this.onForgotPasswordClick}
                        >
                            {sub}
                        </AccessibleButton>
                    ),
                })}
            </span>;
        }

        const pwFieldClass = classNames({
            error: this.props.loginIncorrect && !this.isLoginEmpty(), // only error password if error isn't top field
        });

        // If login is empty, autoFocus login, otherwise autoFocus password.
        // this is for when auto server discovery remounts us when the user tries to tab from username to password
        const autoFocusPassword = !this.isLoginEmpty();
        const loginField = this.renderLoginField(this.state.loginType, !autoFocusPassword);

        let loginType: JSX.Element | undefined;
        if (!SdkConfig.get().disable_3pid_login) {
            loginType = (
                <div className="mx_Login_type_container">
                    <label className="mx_Login_type_label">{ _t('Sign in with') }</label>
                    <Field
                        element="select"
                        value={this.state.loginType}
                        onChange={this.onLoginTypeChange}
                        disabled={this.props.disableSubmit}
                    >
                        <option
                            key={LoginType.LOGIN_FIELD_MXID}
                            value={LoginType.LOGIN_FIELD_MXID}
                        >
                            {_t('Username')}
                        </option>
                        <option
                            key={LoginType.LOGIN_FIELD_EMAIL}
                            value={LoginType.LOGIN_FIELD_EMAIL}
                        >
                            {_t('Email address')}
                        </option>
                        <option
                            key={LoginType.LOGIN_FIELD_PHONE}
                            value={LoginType.LOGIN_FIELD_PHONE}
                        >
                            {_t('Phone')}
                        </option>
                    </Field>
                </div>
            );
        }

        return (
            <div>
                <SignInToText serverConfig={this.props.serverConfig}
                    onEditServerDetailsClick={this.props.onEditServerDetailsClick} />
                <form onSubmit={this.onSubmitForm}>
                    {loginType}
                    {loginField}
                    <Field
                        className={pwFieldClass}
                        type="password"
                        name="password"
                        label={_t('Password')}
                        value={this.state.password}
                        onChange={this.onPasswordChanged}
                        disabled={this.props.disableSubmit}
                        autoFocus={autoFocusPassword}
                    />
                    {forgotPasswordJsx}
                    { !this.props.busy && <input className="mx_Login_submit"
                        type="submit"
                        value={_t('Sign in')}
                        disabled={this.props.disableSubmit}
                    /> }
                </form>
            </div>
        );
    }
}
