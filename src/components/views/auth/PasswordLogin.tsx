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
import PropTypes from 'prop-types';
import classNames from 'classnames';
import * as sdk from '../../../index';
import { _t } from '../../../languageHandler';
import SdkConfig from '../../../SdkConfig';
import { ValidatedServerConfig } from "../../../utils/AutoDiscoveryUtils";
import AccessibleButton, { ButtonEvent } from "../elements/AccessibleButton";

export const LOGIN_FIELD_EMAIL = "login_field_email";
export const LOGIN_FIELD_MXID = "login_field_mxid";
export const LOGIN_FIELD_PHONE = "login_field_phone";

export type LoginType = 'login_field_email' | 'login_field_mxid' | 'login_field_phone';

const defaultHandler = () => { };

interface IProps {
    onSubmit: (formUsername: string, formPhoneCountry: string, formPhoneNumber: string, password: string) => void;
    onError
    onEditServerDetailsClick
    onForgotPasswordClick: (event?: ButtonEvent) => void;
    onUsernameChanged
    onPhoneCountryChanged
    onPhoneNumberChanged
    onPasswordChanged
    onUsernameBlur
    onPhoneNumberBlur

    initialUsername?: string;
    initialPhoneCountry?: string;
    initialPhoneNumber?: string;
    initialPassword?: string;
    loginIncorrect?: boolean;
    disableSubmit?: boolean;
    serverConfig: ValidatedServerConfig;
    busy?: boolean;
}

export default function PasswordLogin(props: IProps) {
    const [username, setUsername] = React.useState(props.initialUsername ?? '');
    const [password, setPassword] = React.useState(props.initialPassword ?? '');
    const [phoneCountry, setPhoneCountry] = React.useState(props.initialPhoneCountry ?? '');
    const [phoneNumber, setPhoneNumber] = React.useState(props.initialPhoneNumber ?? '');
    const [phonePrefix, setPhonePrefix] = React.useState('');
    const [loginType, setLoginType] = React.useState<LoginType>(LOGIN_FIELD_MXID);

    function onUsernameChanged(ev) {
        setUsername(ev.target.value);
        props.onUsernameChanged?.(ev.target.value);
    }

    function onUsernameBlur(ev) {
        props.onUsernameBlur?.(ev.target.value);
    }

    function onLoginTypeChange(ev) {
        const loginType = ev.target.value;
        // Send a null error to clear any error messages.
        this.props.onError?.(null);
        setLoginType(loginType);
        setUsername('');
    }

    function onPhoneCountryChanged(country) {
        setPhoneCountry(country.iso2);
        setPhonePrefix(country.prefix);
        props.onPhoneCountryChanged?.(country.iso2);
    }

    function onPhoneNumberChanged(ev) {
        setPhoneNumber(ev.target.value);
        props.onPhoneNumberChanged?.(ev.target.value);
    }

    function onPhoneNumberBlur(ev) {
        props.onPhoneNumberBlur?.(ev.target.value);
    }

    function onPasswordChanged(ev) {
        setPassword(ev.target.value);
        props.onPasswordChanged?.(ev.target.value);
    }

    function onForgotPasswordClick(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        props.onForgotPasswordClick?.();
    }

    function onSubmitForm(ev) {
        ev.preventDefault();

        const formUsername = (loginType === LOGIN_FIELD_MXID || loginType === LOGIN_FIELD_EMAIL) ? username : null; // XXX: Synapse breaks if you send null here:
        const formPhoneCountry = loginType === LOGIN_FIELD_PHONE ? phoneCountry : null;
        const formPhoneNumber = loginType === LOGIN_FIELD_PHONE ? phoneNumber : null;
        const error = getErrors({ loginType, username, phoneNumber, password });

        if (error) {
            props.onError?.(error);
            return;
        }

        props.onSubmit(
            formUsername,
            formPhoneCountry,
            formPhoneNumber,
            password
        );
    }

    function renderLoginField(loginType, autoFocus) {
        let classes = {};

        switch (loginType) {
            case LOGIN_FIELD_EMAIL:
                classes = { error: props.loginIncorrect && !username };
                return (
                    <EmailLoginField {...props} className={classNames(classes)} username={username} autoFocus={autoFocus} />
                );
            case LOGIN_FIELD_MXID:
                classes = { error: props.loginIncorrect && !username };
                return (
                    <MXIDLoginField {...props} autoFocus={autoFocus} className={classNames(classes)} username={username} />
                );
            case LOGIN_FIELD_PHONE: {
                classes = { error: props.loginIncorrect && !phoneNumber };
                return (
                    <PhoneLoginField {...props} username={username} autoFocus={autoFocus} className={classNames(classes)} phoneNumber={phoneNumber} />
                );
            }
        }
    }

    function isLoginEmpty() {
        switch (loginType) {
            case LOGIN_FIELD_EMAIL:
            case LOGIN_FIELD_MXID:
                return !username;
            case LOGIN_FIELD_PHONE:
                return !phoneCountry || !phoneNumber;
        }
    }

    const Field = sdk.getComponent('elements.Field');
    const SignInToText = sdk.getComponent('views.auth.SignInToText');

    const pwFieldClass = classNames({
        error: props.loginIncorrect && !isLoginEmpty(), // only error password if error isn't top field
    });

    // If login is empty, autoFocus login, otherwise autoFocus password.
    // this is for when auto server discovery remounts us when the user tries to tab from username to password
    const autoFocusPassword = !isLoginEmpty();
    const loginField = renderLoginField(loginType, !autoFocusPassword);
    const loginTypeSelector = !SdkConfig.get().disable_3pid_login && <LoginTypeSelector onLoginTypeChange={onLoginTypeChange} loginType={loginType} {...props} />;

    return (
        <div>
            <SignInToText serverConfig={props.serverConfig}
                onEditServerDetailsClick={props.onEditServerDetailsClick} />
            <form onSubmit={onSubmitForm}>
                {loginTypeSelector}
                {loginField}
                <Field
                    className={pwFieldClass}
                    type="password"
                    name="password"
                    label={_t('Password')}
                    value={password}
                    onChange={onPasswordChanged}
                    disabled={props.disableSubmit}
                    autoFocus={autoFocusPassword}
                />
                {!!props.onForgotPasswordClick && <ForgotPassword onForgotPasswordClick={onForgotPasswordClick} disabled={props.busy} />}
                {!props.busy && <input className="mx_Login_submit"
                    type="submit"
                    value={_t('Sign in')}
                    disabled={props.disableSubmit}
                />}
            </form>
        </div>
    );
}

interface IEmailLoginFieldProps {
    className?: string;
    onUsernameChanged?: (newUsername: string) => void;
    onUsernameBlur?: (username: string) => void;
    disableSubmit?: boolean;
    username: string;
    autoFocus: boolean;
}

interface IPhoneLoginFieldProps {
    className?: string;
    onUsernameChanged?: (newUsername: string) => void;
    onUsernameBlur?: (username: string) => void;
    onPhoneNumberChanged: (newPhoneNumber: string) => void;
    onPhoneNumberBlur: (phoneNumber: string) => void;
    disableSubmit?: boolean;
    username: string;
    autoFocus: boolean;
    phoneNumber: string;
}

function PhoneLoginField(props: IPhoneLoginFieldProps) {
    const CountryDropdown = sdk.getComponent('views.auth.CountryDropdown');
    const Field = sdk.getComponent('elements.Field');

    const phoneCountry = (
        <CountryDropdown
            value={this.state.phoneCountry}
            isSmall={true}
            showPrefix={true}
            onOptionChange={this.onPhoneCountryChanged}
        />
    );

    return (
        <Field
            className={props.className}
            name="phoneNumber"
            key="phone_input"
            type="text"
            label={_t("Phone")}
            value={this.state.phoneNumber}
            prefixComponent={phoneCountry}
            onChange={props.onPhoneNumberChanged}
            onBlur={props.onPhoneNumberBlur}
            disabled={props.disableSubmit}
            autoFocus={props.autoFocus}
        />
    );
}

/** UI component that renders the email login field. */
function EmailLoginField(props: IEmailLoginFieldProps) {
    const Field = sdk.getComponent('elements.Field');

    return (
        <Field
            className={props.className}
            name="username" // make it a little easier for browser's remember-password
            key="email_input"
            type="text"
            label={_t("Email")}
            placeholder="joe@example.com"
            value={props.username}
            onChange={props.onUsernameChanged}
            onBlur={props.onUsernameBlur}
            disabled={props.disableSubmit}
            autoFocus={props.autoFocus}
        />
    );
}

interface IMXIDLoginFieldProps {
    autoFocus: boolean;
    className?: string;
    username: string;
    onUsernameChanged?: (newUsername: string) => void;
    onUsernameBlur?: (username: string) => void;
    disableSubmit?: boolean;
}

/** UI component that renders the MXID login field. */
function MXIDLoginField(props: IMXIDLoginFieldProps) {
    const Field = sdk.getComponent('elements.Field');

    return (
        <Field
            className={props.className}
            name="username" // make it a little easier for browser's remember-password
            key="username_input"
            type="text"
            label={_t("Username")}
            value={props.username}
            onChange={props.onUsernameChanged}
            onBlur={props.onUsernameBlur}
            disabled={props.disableSubmit}
            autoFocus={props.autoFocus}
        />
    );
}

interface IForgotPasswordProps {
    disabled: boolean;
    onForgotPasswordClick: (event?: ButtonEvent) => void;
}

function ForgotPassword(props: IForgotPasswordProps) {
    return (
        <span>
            {_t('Not sure of your password? <a>Set a new one</a>', {}, {
                a: sub => (
                    <AccessibleButton
                        className="mx_Login_forgot"
                        disabled={props.disabled}
                        kind="link"
                        onClick={props.onForgotPasswordClick}
                    >
                        {sub}
                    </AccessibleButton>
                ),
            })}
        </span>
    );
}

interface ILoginTypeSelectorProps {
    onLoginTypeChange: (event: React.ChangeEvent) => void;
    loginType: string;
    disableSubmit?: boolean;
}

function LoginTypeSelector(props: ILoginTypeSelectorProps) {
    const Field = sdk.getComponent('elements.Field');

    return (
        <div className="mx_Login_type_container">
            <label className="mx_Login_type_label">{_t('Sign in with')}</label>
            <Field
                element="select"
                value={props.loginType}
                onChange={props.onLoginTypeChange}
                disabled={props.disableSubmit}
            >
                <option
                    key={LOGIN_FIELD_MXID}
                    value={LOGIN_FIELD_MXID}
                >
                    {_t('Username')}
                </option>
                <option
                    key={LOGIN_FIELD_EMAIL}
                    value={LOGIN_FIELD_EMAIL}
                >
                    {_t('Email address')}
                </option>
                <option
                    key={LOGIN_FIELD_PHONE}
                    value={LOGIN_FIELD_PHONE}
                >
                    {_t('Phone')}
                </option>
            </Field>
        </div>
    );
}

/** Check the password form for any errors. */
function getErrors({ loginType, username, phoneNumber, password }: { loginType: LoginType, username: string, phoneNumber: string, password: string }) {
    if (!password) {
        return _t('The password field must not be blank.');
    }

    switch (loginType) {
        case LOGIN_FIELD_EMAIL:
            return username ? null : _t('The email field must not be blank.');
        case LOGIN_FIELD_MXID:
            return username ? null : _t('The username field must not be blank.');
        case LOGIN_FIELD_PHONE:
            return phoneNumber ? null : _t('The phone number field must not be blank.');
    }
}
