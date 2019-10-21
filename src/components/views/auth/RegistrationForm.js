/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 Vector Creations Ltd
Copyright 2018 New Vector Ltd

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
import Email from '../../../email';
import Modal from '../../../Modal';
import { _t } from '../../../languageHandler';
import Tchap from "../../../Tchap";

const FIELD_EMAIL = 'field_email';
const FIELD_PASSWORD = 'field_password';
const FIELD_PASSWORD_CONFIRM = 'field_password_confirm';

/**
 * A pure UI component which displays a registration form.
 */
module.exports = React.createClass({
    displayName: 'RegistrationForm',

    propTypes: {
        // Values pre-filled in the input boxes when the component loads
        defaultEmail: PropTypes.string,
        defaultPassword: PropTypes.string,
        minPasswordLength: PropTypes.number,
        onValidationChange: PropTypes.func,
        onRegisterClick: PropTypes.func.isRequired, // onRegisterClick(Object) => ?Promise
        onEditServerDetailsClick: PropTypes.func,
        flows: PropTypes.arrayOf(PropTypes.object).isRequired,
        // This is optional and only set if we used a server name to determine
        // the HS URL via `.well-known` discovery. The server name is used
        // instead of the HS URL when talking about "your account".
        hsName: PropTypes.string,
        hsUrl: PropTypes.string,
        isExtern: PropTypes.bool,
    },

    getDefaultProps: function() {
        return {
            minPasswordLength: 6,
            onValidationChange: console.error,
        };
    },

    getInitialState: function() {
        return {
            // Field error codes by field ID
            fieldErrors: {},
            username: "",
            email: "",
            password: "",
            passwordConfirm: "",
            isExtern: false
        };
    },

    onSubmit: function(ev) {
        ev.preventDefault();

        // validate everything, in reverse order so
        // the error that ends up being displayed
        // is the one from the first invalid field.
        // It's not super ideal that this just calls
        // onValidationChange once for each invalid field.
        this.validateField(FIELD_EMAIL, ev.type);
        this.validateField(FIELD_PASSWORD_CONFIRM, ev.type);
        this.validateField(FIELD_PASSWORD, ev.type);

        const self = this;
        if (this.allFieldsValid()) {
            if (this.state.email == '') {
                const QuestionDialog = sdk.getComponent("dialogs.QuestionDialog");
                Modal.createTrackedDialog('If you don\'t specify an email address...', '', QuestionDialog, {
                    title: _t("Warning!"),
                    description:
                        <div>
                            { _t("If you don't specify an email address, you won't be able to reset your password. " +
                                "Are you sure?") }
                        </div>,
                    button: _t("Continue"),
                    onFinished: function(confirmed) {
                        if (confirmed) {
                            self._doSubmit(ev);
                        }
                    },
                });
            } else {
                self._doSubmit(ev);
            }
        }
    },

    _doSubmit: function(ev) {
        let email = this.state.email.trim();
        email = email.toLowerCase();
        const promise = this.props.onRegisterClick({
            password: this.state.password.trim(),
            email: email,
        });

        if (promise) {
            ev.target.disabled = true;
            promise.finally(function() {
                ev.target.disabled = false;
            });
        }
    },

    /**
     * @returns {boolean} true if all fields were valid last time they were validated.
     */
    allFieldsValid: function() {
        const keys = Object.keys(this.state.fieldErrors);
        for (let i = 0; i < keys.length; ++i) {
            if (this.state.fieldErrors[keys[i]]) {
                return false;
            }
        }
        return true;
    },

    validateField: function(fieldID, eventType) {
        const pwd1 = this.state.password.trim();
        const pwd2 = this.state.passwordConfirm.trim();
        const allowEmpty = eventType === "blur";

        switch (fieldID) {
            case FIELD_EMAIL: {
                const email = this.state.email;
                const emailValid = email === '' || Email.looksValid(email);
                if (email === '') {
                    this.markFieldValid(fieldID, false, "RegistrationForm.ERR_MISSING_EMAIL");
                } else if (!emailValid) {
                    this.markFieldValid(fieldID, emailValid, "RegistrationForm.ERR_EMAIL_INVALID");
                } else {
                    this.markFieldValid(fieldID, true);
                }
                break;
            }
            case FIELD_PASSWORD:
                if (allowEmpty && pwd1 === "") {
                    this.markFieldValid(fieldID, true);
                } else if (pwd1 == '') {
                    this.markFieldValid(
                        fieldID,
                        false,
                        "RegistrationForm.ERR_PASSWORD_MISSING",
                    );
                } else if (pwd1.length < this.props.minPasswordLength) {
                    this.markFieldValid(
                        fieldID,
                        false,
                        "RegistrationForm.ERR_PASSWORD_LENGTH",
                    );
                } else {
                    this.markFieldValid(fieldID, true);
                }
                break;
            case FIELD_PASSWORD_CONFIRM:
                if (allowEmpty && pwd2 === "") {
                    this.markFieldValid(fieldID, true);
                } else {
                    this.markFieldValid(
                        fieldID, pwd1 == pwd2,
                        "RegistrationForm.ERR_PASSWORD_MISMATCH",
                    );
                }
                break;
        }
    },

    markFieldValid: function(fieldID, valid, errorCode) {
        const { fieldErrors } = this.state;
        if (valid) {
            fieldErrors[fieldID] = null;
        } else {
            fieldErrors[fieldID] = errorCode;
        }
        this.setState({
            fieldErrors,
        });
        this.props.onValidationChange(fieldErrors);
    },

    _classForField: function(fieldID, ...baseClasses) {
        let cls = baseClasses.join(' ');
        if (this.state.fieldErrors[fieldID]) {
            if (cls) cls += ' ';
            cls += 'error';
        }
        return cls;
    },

    onEmailBlur(ev) {
        this.setState({
            isExtern: false
        });
        this.validateField(FIELD_EMAIL, ev.type);
        if (Email.looksValid(ev.target.value)) {
            Tchap.discoverPlatform(ev.target.value).then(e => {
                if (Tchap.isUserExternFromServer(e)) {
                    this.setState({
                        isExtern: true
                    });
                }
            });
        }
    },

    onEmailChange(ev) {
        this.setState({
            email: ev.target.value,
        });
    },

    onPasswordBlur(ev) {
        this.validateField(FIELD_PASSWORD, ev.type);
    },

    onPasswordChange(ev) {
        this.setState({
            password: ev.target.value,
        });
    },

    onPasswordConfirmBlur(ev) {
        this.validateField(FIELD_PASSWORD_CONFIRM, ev.type);
    },

    onPasswordConfirmChange(ev) {
        this.setState({
            passwordConfirm: ev.target.value,
        });
    },

    render: function() {
        const Field = sdk.getComponent('elements.Field');
        const registerButton = (
            <input className="mx_Login_submit" type="submit" value={_t("Register")} />
        );

        let warnExternMessage;
        if (this.state.isExtern === true) {
            warnExternMessage = (<div className="mx_AuthBody_fieldRow">{
                _t("Warning: The domain of your email address is not " +
                    "declared in Tchap. If you have received an invitation, " +
                    "you will be able to create a \"guest\" account, allowing " +
                    "only to participate in private exchanges to which you are invited.")
            }</div>);
        }

        return (
            <div>
                <form onSubmit={this.onSubmit}>
                    <div className="mx_AuthBody_fieldRow">
                        <Field
                            className={this._classForField(FIELD_EMAIL)}
                            id="mx_RegistrationForm_email"
                            type="text"
                            label={_t("Email")}
                            defaultValue={this.props.defaultEmail}
                            value={this.state.email}
                            onBlur={this.onEmailBlur}
                            onChange={this.onEmailChange}
                        />
                    </div>
                    { warnExternMessage }
                    <div className="mx_AuthBody_fieldRow">
                        <Field
                            className={this._classForField(FIELD_PASSWORD)}
                            id="mx_RegistrationForm_password"
                            type="password"
                            label={_t("Password")}
                            defaultValue={this.props.defaultPassword}
                            value={this.state.password}
                            onBlur={this.onPasswordBlur}
                            onChange={this.onPasswordChange}
                        />
                        <Field
                            className={this._classForField(FIELD_PASSWORD_CONFIRM)}
                            id="mx_RegistrationForm_passwordConfirm"
                            type="password"
                            label={_t("Confirm")}
                            defaultValue={this.props.defaultPassword}
                            value={this.state.passwordConfirm}
                            onBlur={this.onPasswordConfirmBlur}
                            onChange={this.onPasswordConfirmChange}
                        />
                        <img className="tc_PasswordHelper" src={require('../../../../res/img/question_mark.svg')}
                             width={25} height={25}
                             title={ _t('This password is too weak. It must include a lower-case letter, an upper-case letter, a number and a symbol and be at a minimum 8 characters in length.') } alt={""} />
                    </div>
                    { registerButton }
                </form>
            </div>
        );
    },
});
