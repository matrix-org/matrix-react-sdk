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

'use strict';

import React from 'react';
import { _t, _tJsx } from '../../../languageHandler';
import * as languageHandler from '../../../languageHandler';
import sdk from '../../../index';
import Login from '../../../Login';
import UserSettingsStore from '../../../UserSettingsStore';
import PlatformPeg from '../../../PlatformPeg';

// For validating phone numbers without country codes
const PHONE_NUMBER_REGEX = /^[0-9\(\)\-\s]*$/;

/**
 * A wire component which glues together login UI components and Login logic
 */
module.exports = React.createClass({
    displayName: 'Login',

    propTypes: {
        onLoggedIn: React.PropTypes.func.isRequired,

        enableGuest: React.PropTypes.bool,

        customHsUrl: React.PropTypes.string,
        customIsUrl: React.PropTypes.string,
        defaultHsUrl: React.PropTypes.string,
        defaultIsUrl: React.PropTypes.string,
        // Secondary HS which we try to log into if the user is using
        // the default HS but login fails. Useful for migrating to a
        // different home server without confusing users.
        fallbackHsUrl: React.PropTypes.string,

        defaultDeviceDisplayName: React.PropTypes.string,

        // login shouldn't know or care how registration is done.
        onRegisterClick: React.PropTypes.func.isRequired,

        // login shouldn't care how password recovery is done.
        onForgotPasswordClick: React.PropTypes.func,
        onCancelClick: React.PropTypes.func,
    },

    getInitialState: function() {
        return {
            busy: false,
            errorText: null,
            loginIncorrect: false,
            enteredHomeserverUrl: this.props.customHsUrl || this.props.defaultHsUrl,
            enteredIdentityServerUrl: this.props.customIsUrl || this.props.defaultIsUrl,

            // used for preserving form values when changing homeserver
            username: "",
            phoneCountry: null,
            phoneNumber: "",
            currentFlow: "m.login.password",
        };
    },

    componentWillMount: function() {
        this._unmounted = false;

        // map from login step type to a function which will render a control
        // letting you do that login type
        this._stepRendererMap = {
            'io.kamax.google.oauth2': this._renderGoogleAuthentication,
            //'m.login.password': this._renderPasswordStep,
            //'m.login.cas': this._renderCasStep,
        };

        this._initLoginLogic();
    },

    componentWillUnmount: function() {
        this._unmounted = true;
    },

    onPasswordLogin: function(username, phoneCountry, phoneNumber, password) {
        this.setState({
            busy: true,
            errorText: null,
            loginIncorrect: false,
        });

        this._loginLogic.loginViaPassword(
            username, phoneCountry, phoneNumber, password,
        ).then((data) => {
            this.props.onLoggedIn(data);
        }, (error) => {
            if(this._unmounted) {
                return;
            }
            let errorText;

            // Some error strings only apply for logging in
            const usingEmail = username.indexOf("@") > 0;
            if (error.httpStatus == 400 && usingEmail) {
                errorText = _t('This Home Server does not support login using email address.');
            } else if (error.httpStatus === 401 || error.httpStatus === 403) {
                errorText = _t('Incorrect username and/or password.');
            } else {
                // other errors, not specific to doing a password login
                errorText = this._errorTextFromError(error);
            }

            this.setState({
                errorText: errorText,
                // 401 would be the sensible status code for 'incorrect password'
                // but the login API gives a 403 https://matrix.org/jira/browse/SYN-744
                // mentions this (although the bug is for UI auth which is not this)
                // We treat both as an incorrect password
                loginIncorrect: error.httpStatus === 401 || error.httpStatus == 403,
            });
        }).finally(() => {
            if(this._unmounted) {
                return;
            }
            this.setState({
                busy: false,
            });
        }).done();
    },

    onCasLogin: function() {
      this._loginLogic.redirectToCas();
    },

    _onLoginAsGuestClick: function() {
        const self = this;
        self.setState({
            busy: true,
            errorText: null,
            loginIncorrect: false,
        });

        this._loginLogic.loginAsGuest().then(function(data) {
            self.props.onLoggedIn(data);
        }, function(error) {
            let errorText;
            if (error.httpStatus === 403) {
                errorText = _t("Guest access is disabled on this Home Server.");
            } else {
                errorText = self._errorTextFromError(error);
            }
            self.setState({
                errorText: errorText,
                loginIncorrect: false,
            });
        }).finally(function() {
            self.setState({
                busy: false,
            });
        }).done();
    },

    onUsernameChanged: function(username) {
        this.setState({ username: username });
    },

    onPhoneCountryChanged: function(phoneCountry) {
        this.setState({ phoneCountry: phoneCountry });
    },

    onPhoneNumberChanged: function(phoneNumber) {
        // Validate the phone number entered
        if (!PHONE_NUMBER_REGEX.test(phoneNumber)) {
            this.setState({ errorText: _t('The phone number entered looks invalid') });
            return;
        }

        this.setState({
            phoneNumber: phoneNumber,
            errorText: null,
        });
    },

    onServerConfigChange: function(config) {
        const self = this;
        const newState = {
            errorText: null, // reset err messages
        };
        if (config.hsUrl !== undefined) {
            newState.enteredHomeserverUrl = config.hsUrl;
        }
        if (config.isUrl !== undefined) {
            newState.enteredIdentityServerUrl = config.isUrl;
        }
        this.setState(newState, function() {
            self._initLoginLogic(config.hsUrl || null, config.isUrl);
        });
    },

    _initLoginLogic: function(hsUrl, isUrl) {
        const self = this;
        hsUrl = hsUrl || this.state.enteredHomeserverUrl;
        isUrl = isUrl || this.state.enteredIdentityServerUrl;

        const fallbackHsUrl = hsUrl == this.props.defaultHsUrl ? this.props.fallbackHsUrl : null;

        const loginLogic = new Login(hsUrl, isUrl, fallbackHsUrl, {
            defaultDeviceDisplayName: this.props.defaultDeviceDisplayName,
        });
        this._loginLogic = loginLogic;

        this.setState({
            enteredHomeserverUrl: hsUrl,
            enteredIdentityServerUrl: isUrl,
            busy: true,
            loginIncorrect: false,
        });

        loginLogic.getFlows().then((flows) => {
            // look for a flow where we understand all of the steps.
            for (let i = 0; i < flows.length; i++ ) {
                if (!this._isSupportedFlow(flows[i])) {
                    continue;
                }

                // we just pick the first flow where we support all the
                // steps. (we don't have a UI for multiple logins so let's skip
                // that for now).
                loginLogic.chooseFlow(i);
                this.setState({
                    currentFlow: this._getCurrentFlowStep(),
                });
                return;
            }
            // we got to the end of the list without finding a suitable
            // flow.
            this.setState({
                errorText: _t(
                    "This homeserver doesn't offer any login flows which are " +
                        "supported by this client.",
                ),
            });
        }, function(err) {
            self.setState({
                errorText: self._errorTextFromError(err),
                loginIncorrect: false,
            });
        }).finally(function() {
            self.setState({
                busy: false,
            });
        }).done();
    },

    _isSupportedFlow: function(flow) {
        // technically the flow can have multiple steps, but no one does this
        // for login and loginLogic doesn't support it so we can ignore it.
        if (!this._stepRendererMap[flow.type]) {
            console.log("Skipping flow", flow, "due to unsupported login type", flow.type);
            return false;
        }
        return true;
    },

    _getCurrentFlowStep: function() {
        return this._loginLogic ? this._loginLogic.getCurrentFlowStep() : null;
    },

    _errorTextFromError(err) {
        let errCode = err.errcode;
        if (!errCode && err.httpStatus) {
            errCode = "HTTP " + err.httpStatus;
        }

        let errorText = _t("Error: Problem communicating with the given homeserver.") +
                (errCode ? " (" + errCode + ")" : "");

        if (err.cors === 'rejected') {
            if (window.location.protocol === 'https:' &&
                (this.state.enteredHomeserverUrl.startsWith("http:") ||
                 !this.state.enteredHomeserverUrl.startsWith("http"))
            ) {
                errorText = <span>
                    { _tJsx("Can't connect to homeserver via HTTP when an HTTPS URL is in your browser bar. " +
                            "Either use HTTPS or <a>enable unsafe scripts</a>.",
                      /<a>(.*?)<\/a>/,
                      (sub) => { return <a href="https://www.google.com/search?&q=enable%20unsafe%20scripts">{ sub }</a>; },
                    ) }
                </span>;
            } else {
                errorText = <span>
                    { _tJsx("Can't connect to homeserver - please check your connectivity, ensure your <a>homeserver's SSL certificate</a> is trusted, and that a browser extension is not blocking requests.",
                      /<a>(.*?)<\/a>/,
                      (sub) => { return <a href={this.state.enteredHomeserverUrl}>{ sub }</a>; },
                    ) }
                </span>;
            }
        }

        return errorText;
    },

    componentForStep: function(step) {
        if (!step) {
            return null;
        }

        const stepRenderer = this._stepRendererMap[step];

        if (stepRenderer) {
            return stepRenderer();
        }

        return null;
    },

    _renderPasswordStep: function() {
        const PasswordLogin = sdk.getComponent('login.PasswordLogin');
        return (
            <PasswordLogin
               onSubmit={this.onPasswordLogin}
               initialUsername={this.state.username}
               initialPhoneCountry={this.state.phoneCountry}
               initialPhoneNumber={this.state.phoneNumber}
               onUsernameChanged={this.onUsernameChanged}
               onPhoneCountryChanged={this.onPhoneCountryChanged}
               onPhoneNumberChanged={this.onPhoneNumberChanged}
               onForgotPasswordClick={this.props.onForgotPasswordClick}
               loginIncorrect={this.state.loginIncorrect}
               hsUrl={this.state.enteredHomeserverUrl}
               />
        );
    },

    _renderCasStep: function() {
        const CasLogin = sdk.getComponent('login.CasLogin');
        return (
            <CasLogin onSubmit={this.onCasLogin} />
        );
    },

    _renderGoogleAuthentication: function() {
        const GoogleLogin = sdk.getComponent('login.GoogleAuthLogin');
        return (
            <GoogleLogin onSubmit={this.onGoogleLogin} onSuccess={this.onGoogleSuccess} onFailure={this.onGoogleFailure} />
        );
    },

    onGoogleSuccess: function (emailAddr, tokenId) {
        this._loginLogic.loginWithGoogle(emailAddr, tokenId).then((data) => {
            this.props.onLoggedIn(data);
        }, (error) => {
            if(this._unmounted) {
                return;
            }
            let errorText;

            errorText = this._errorTextFromError(error);

            this.setState({
                errorText: errorText,
                // 401 would be the sensible status code for 'incorrect password'
                // but the login API gives a 403 https://matrix.org/jira/browse/SYN-744
                // mentions this (although the bug is for UI auth which is not this)
                // We treat both as an incorrect password
                loginIncorrect: error.httpStatus === 401 || error.httpStatus == 403,
            });
        }).finally(() => {
            if(this._unmounted) {
                return;
            }
            this.setState({
                busy: false,
            });
        }).done();
    },

    onGoogleFailure: function () {
        this.setState({errorText: "Failed to login with Google!"});
    },

    _onLanguageChange: function(newLang) {
        if(languageHandler.getCurrentLanguage() !== newLang) {
            UserSettingsStore.setLocalSetting('language', newLang);
            PlatformPeg.get().reload();
        }
    },

    _renderLanguageSetting: function() {
        const LanguageDropdown = sdk.getComponent('views.elements.LanguageDropdown');
        return <div className="mx_Login_language_div">
            <LanguageDropdown onOptionChange={this._onLanguageChange}
                          className="mx_Login_language"
                          value={languageHandler.getCurrentLanguage()}
            />
        </div>;
    },

    render: function() {
        const Loader = sdk.getComponent("elements.Spinner");
        const LoginHeader = sdk.getComponent("login.LoginHeader");
        const LoginFooter = sdk.getComponent("login.LoginFooter");
        const ServerConfig = sdk.getComponent("login.ServerConfig");
        const loader = this.state.busy ? <div className="mx_Login_loader"><Loader /></div> : null;

        let loginAsGuestJsx;
        if (this.props.enableGuest) {
            loginAsGuestJsx =
                <a className="mx_Login_create" onClick={this._onLoginAsGuestClick} href="#">
                    { _t('Login as guest') }
                </a>;
        }

        let returnToAppJsx;
        if (this.props.onCancelClick) {
            returnToAppJsx =
                <a className="mx_Login_create" onClick={this.props.onCancelClick} href="#">
                    { _t('Return to app') }
                </a>;
        }

        return (
            <div className="mx_Login">
                <div className="mx_Login_box">
                    <LoginHeader />
                    <div>
                        <h2>{ _t('Sign in') }
                            { loader }
                        </h2>
                        { this.componentForStep(this.state.currentFlow) }
                        <div className="mx_Login_error">
                                { this.state.errorText }
                        </div>
                        <a className="mx_Login_create" onClick={this.props.onRegisterClick} href="#">
                            { _t('Create an account') }
                        </a>
                        {/* loginAsGuestJsx */}
                        { returnToAppJsx }
                        { this._renderLanguageSetting() }
                        <LoginFooter />
                    </div>
                </div>
            </div>
        );
    },
});
