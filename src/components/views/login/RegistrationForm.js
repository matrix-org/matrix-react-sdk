/*
Copyright (C) 2018 Kamax Sàrl
https://www.kamax.io/

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

This file incorporates work covered by the following copyright and
permission notice:

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
import { field_input_incorrect } from '../../../UiEffects';
import sdk from '../../../index';
import Modal from '../../../Modal';
import { _t } from '../../../languageHandler';

import GoogleAuthLogin from "./GoogleAuthLogin";

const FIELD_USERNAME = 'field_username';

/**
 * A pure UI component which displays a registration form.
 */
module.exports = React.createClass({
    displayName: 'RegistrationForm',

    propTypes: {
        // Values pre-filled in the input boxes when the component loads
        onError: React.PropTypes.func,
        onRegisterClick: React.PropTypes.func.isRequired, // onRegisterClick(Object) => ?Promise
    },

    getDefaultProps: function() {
        return {
            onError: function(e) {
                console.error(e);
            },
        };
    },

    getInitialState: function() {
        return {
            fieldValid: {},
            googleDetails: {id: null, token: null},
            selectedTeam: null,
            // The ISO2 country code selected in the phone number entry
            phoneCountry: this.props.defaultPhoneCountry,
        };
    },

    onSubmit: function(ev) {
        ev.preventDefault();

        // validate everything, in reverse order so
        // the error that ends up being displayed
        // is the one from the first invalid field.
        // It's not super ideal that this just calls
        // onError once for each invalid field.

        if(this.state.googleDetails.token === null) {
            this.props.onError("RegistrationForm.NO_GOOGLE");
            return;
        }

        const self = this;
        if (this.allFieldsValid()) {
            self._doSubmit(ev);
        }
    },

    _doSubmit: function(ev) {
        const promise = this.props.onRegisterClick({
            googleId: this.state.googleDetails.id,
            googleToken: this.state.googleDetails.token,
        });

        if (promise) {
            ev.target.disabled = true;
            promise.finally(function() {
                ev.target.disabled = false;
            });
        }
    },

    /**
     * Returns true if all fields were valid last time
     * they were validated.
     */
    allFieldsValid: function() {
        const keys = Object.keys(this.state.fieldValid);
        for (let i = 0; i < keys.length; ++i) {
            if (this.state.fieldValid[keys[i]] == false) {
                return false;
            }
        }
        return true;
    },

    validateField: function(field_id) {
        switch (field_id) {
            case FIELD_USERNAME:
                // XXX: SPEC-1
                var username = this.refs.username.value.trim();
                if (encodeURIComponent(username) != username) {
                    this.markFieldValid(
                        field_id,
                        false,
                        "RegistrationForm.ERR_USERNAME_INVALID",
                    );
                } else if (username == '') {
                    this.markFieldValid(
                        field_id,
                        false,
                        "RegistrationForm.ERR_USERNAME_BLANK",
                    );
                } else {
                    this.markFieldValid(field_id, true);
                }
                break;
        }
    },

    markFieldValid: function(field_id, val, error_code) {
        const fieldValid = this.state.fieldValid;
        fieldValid[field_id] = val;
        this.setState({fieldValid: fieldValid});
        if (!val) {
            field_input_incorrect(this.fieldElementById(field_id));
            this.props.onError(error_code);
        }
    },

    fieldElementById(field_id) {
        switch (field_id) {
            case FIELD_USERNAME:
                return this.refs.username;
        }
    },

    _classForField: function(field_id, ...baseClasses) {
        let cls = baseClasses.join(' ');
        if (this.state.fieldValid[field_id] === false) {
            if (cls) cls += ' ';
            cls += 'error';
        }
        return cls;
    },

    onGoogleSuccess(id, token, profile) {
      this.setState({
          googleDetails: {id, token, profile}
      });
    },

    onGoogleFailure(errmsg) {
        console.warn(errmsg);
        this.props.onError("RegistrationForm.SAD_GOOGLE");
    },

    render: function() {
        const self = this;

        const registerButton = (
            <input className="mx_Login_submit" type="submit" value={_t("Register")} />
        );

        const placeholderUserName = _t("User name");
        let googleAuth;
        if (this.state.googleDetails.id === null) {
            googleAuth = (<GoogleAuthLogin onSuccess={this.onGoogleSuccess} onFailure={this.onGoogleFailure}></GoogleAuthLogin>)
        } else {
            googleAuth = (<p>You are connected as <b>{this.state.googleDetails.profile.getEmail()}</b></p>)
        }

        return (
            <div>
                <form onSubmit={this.onSubmit}>
                    { googleAuth }
                    <br />
                    { registerButton }
                </form>
            </div>
        );
    },
});
