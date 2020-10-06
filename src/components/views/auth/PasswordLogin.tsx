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

interface Country {
    iso2: string;
    name: string;
    prefix: string;
}

interface IProps {
    onSubmit: (formUsername: string, formPhoneCountry: string, formPhoneNumber: string, password: string) => void;
    onError: (error: null | string) => void;
    onEditServerDetailsClick
    onForgotPasswordClick: (event?: ButtonEvent) => void;
    onUsernameChanged: (newUsername: void) => void;
    onPhoneCountryChanged: (Country: string) => void;
    onPhoneNumberChanged: (newPhoneNumber: string) => void;
    onPasswordChanged: (newPassword: string) => void;
    onUsernameBlur: (username: string) => void;
    onPhoneNumberBlur: (phoneNumber: string) => void;

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
    const [loginType, setLoginType] = React.useState<LoginType>(LOGIN_FIELD_MXID);

    function onUsernameChanged(event) {
        setUsername(event.target.value);
        props.onUsernameChanged?.(event.target.value);
    }

    function onUsernameBlur(ev) {
        props.onUsernameBlur?.(ev.target.value);
    }

    function onLoginTypeChanged(ev: React.ChangeEvent<HTMLInputElement>) {
        const loginType = ev.target.value;
        // Send a null error to clear any error messages.
        props.onError?.(null);
        setLoginType(loginType as LoginType);
        setUsername('');
    }

    function onPhoneCountryChanged(country: Country) {
        setPhoneCountry(country.iso2);
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

        // XXX: Synapse breaks if you send null here:
        const formUsername = (loginType === LOGIN_FIELD_MXID || loginType === LOGIN_FIELD_EMAIL) ? username : null;
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
            password,
        );
    }

    function renderLoginField(loginType, autoFocus) {
        let classes = {};

        switch (loginType) {
            case LOGIN_FIELD_EMAIL:
                classes = { error: props.loginIncorrect && !username };
                return (
                    <EmailLoginField
                        {...props}
                        className={classNames(classes)}
                        username={username}
                        autoFocus={autoFocus}
                        onBlur={onUsernameBlur}
                        onChange={onUsernameChanged}
                    />
                );
            case LOGIN_FIELD_MXID:
                classes = { error: props.loginIncorrect && !username };
                return (
                    <MXIDLoginField
                        {...props}
                        autoFocus={autoFocus}
                        className={classNames(classes)}
                        username={username}
                        onBlur={onUsernameBlur}
                    />
                );
            case LOGIN_FIELD_PHONE: {
                classes = { error: props.loginIncorrect && !phoneNumber };
                return (
                    <PhoneLoginField
                        {...props}
                        username={username}
                        autoFocus={autoFocus}
                        className={classNames(classes)}
                        phoneNumber={phoneNumber}
                        phoneCountry={phoneCountry}
                        onBlur={onPhoneNumberBlur}
                        onPhoneNumberChange={onPhoneNumberChanged}
                        onPhoneCountryChange={onPhoneCountryChanged}
                    />
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
    const loginTypeSelector = !SdkConfig.get().disable_3pid_login && (
        <LoginTypeSelector
            onChange={onLoginTypeChanged}
            loginType={loginType}
            {...props}
        />
    );

    return (
        <div>
            <SignInToText
                serverConfig={props.serverConfig}
                onEditServerDetailsClick={props.onEditServerDetailsClick}
            />
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
                {!!props.onForgotPasswordClick && (
                    <ForgotPassword
                        onClick={onForgotPasswordClick}
                        disabled={props.busy}
                    />
                )}
                {!props.busy && <input className="mx_Login_submit"
                    type="submit"
                    value={_t('Sign in')}
                    disabled={props.disableSubmit}
                />}
            </form>
        </div>
    );
}

PasswordLogin.propTypes = {
    onSubmit: PropTypes.func.isRequired,
    onError: PropTypes.func,
    onEditServerDetailsClick: PropTypes.func,
    onForgotPasswordClick: PropTypes.func,
    initialUsername: PropTypes.string,
    initialPhoneCountry: PropTypes.string,
    initialPhoneNumber: PropTypes.string,
    initialPassword: PropTypes.string,
    onUsernameChanged: PropTypes.func,
    onPhoneCountryChanged: PropTypes.func,
    onPhoneNumberChanged: PropTypes.func,
    onPasswordChanged: PropTypes.func,
    loginIncorrect: PropTypes.bool,
    disableSubmit: PropTypes.bool,
    serverConfig: PropTypes.instanceOf(ValidatedServerConfig).isRequired,
    busy: PropTypes.bool,
};

interface IPhoneLoginFieldProps {
    className?: string;
    onBlur?: (username: string) => void;
    onPhoneNumberChange: (newPhoneNumber: string) => void;
    onPhoneCountryChange: (newPhoneCountry: Country) => void;
    phoneCountry: string;
    disableSubmit?: boolean;
    username: string;
    autoFocus: boolean;
    phoneNumber: string;
}

function PhoneLoginField(props: IPhoneLoginFieldProps) {
    const CountryDropdown = sdk.getComponent('views.auth.CountryDropdown');
    const Field = sdk.getComponent('elements.Field');

    const phoneCountryComponent = (
        <CountryDropdown
            value={props.phoneCountry}
            isSmall={true}
            showPrefix={true}
            onOptionChange={props.onPhoneCountryChange}
            {...props}
        />
    );

    return (
        <Field
            className={props.className}
            name="phoneNumber"
            key="phone_input"
            type="text"
            label={_t("Phone")}
            value={props.phoneNumber}
            prefixComponent={phoneCountryComponent}
            onChange={props.onPhoneNumberChange}
            onBlur={props.onBlur}
            disabled={props.disableSubmit}
            autoFocus={props.autoFocus}
        />
    );
}

interface IEmailLoginFieldProps {
    className?: string;
    onChange?: (newUsername: string) => void;
    onBlur?: (username: string) => void;
    disableSubmit?: boolean;
    username: string;
    autoFocus: boolean;
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
            onChange={props.onChange}
            onBlur={props.onBlur}
            disabled={props.disableSubmit}
            autoFocus={props.autoFocus}
        />
    );
}

interface IMXIDLoginFieldProps {
    autoFocus: boolean;
    className?: string;
    username: string;
    onChange?: (newUsername: string) => void;
    onBlur?: (username: string) => void;
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
            onChange={props.onChange}
            onBlur={props.onBlur}
            disabled={props.disableSubmit}
            autoFocus={props.autoFocus}
        />
    );
}

interface IForgotPasswordProps {
    disabled: boolean;
    onClick: (event?: ButtonEvent) => void;
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
                        onClick={props.onClick}
                    >
                        {sub}
                    </AccessibleButton>
                ),
            })}
        </span>
    );
}

interface ILoginTypeSelectorProps {
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
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
                onChange={props.onChange}
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
function getErrors({
    loginType,
    username,
    phoneNumber,
    password,
}: {
    loginType: LoginType,
    username: string,
    phoneNumber: string,
    password: string
}) {
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
