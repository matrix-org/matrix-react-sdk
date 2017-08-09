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
        var self = this;
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
                busy: false
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
        var self = this;
        let newState = {
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
        var self = this;
        hsUrl = hsUrl || this.state.enteredHomeserverUrl;
        isUrl = isUrl || this.state.enteredIdentityServerUrl;

        var fallbackHsUrl = hsUrl == this.props.defaultHsUrl ? this.props.fallbackHsUrl : null;

        var loginLogic = new Login(hsUrl, isUrl, fallbackHsUrl, {
            defaultDeviceDisplayName: this.props.defaultDeviceDisplayName,
        });
        this._loginLogic = loginLogic;

        this.setState({
            enteredHomeserverUrl: hsUrl,
            enteredIdentityServerUrl: isUrl,
            busy: true,
            loginIncorrect: false,
        });

        loginLogic.getFlows().then(function(flows) {
            // old behaviour was to always use the first flow without presenting
            // options. This works in most cases (we don't have a UI for multiple
            // logins so let's skip that for now).
            loginLogic.chooseFlow(0);
            self.setState({
                currentFlow: self._getCurrentFlowStep(),
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
                      (sub) => { return <a href="https://www.google.com/search?&q=enable%20unsafe%20scripts">{ sub }</a>; }
                    )}
                </span>;
            } else {
                errorText = <span>
                    { _tJsx("Can't connect to homeserver - please check your connectivity, ensure your <a>homeserver's SSL certificate</a> is trusted, and that a browser extension is not blocking requests.",
                      /<a>(.*?)<\/a>/,
                      (sub) => { return <a href={this.state.enteredHomeserverUrl}>{ sub }</a>; }
                    )}
                </span>;
            }
        }

        return errorText;
    },

    componentForStep: function(step) {
        switch (step) {
            case 'm.login.password':
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
                    />
                );
            case 'm.login.cas':
                const CasLogin = sdk.getComponent('login.CasLogin');
                return (
                    <CasLogin onSubmit={this.onCasLogin} />
                );
            default:
                if (!step) {
                    return;
                }
                return (
                    <div>
                    { _t('Sorry, this homeserver is using a login which is not recognised ')}({step})
                    </div>
                );
        }
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

        var loginAsGuestJsx;
        if (this.props.enableGuest) {
            loginAsGuestJsx =
                <a className="mx_Login_create" onClick={this._onLoginAsGuestClick} href="#">
                    { _t('Login as guest')}
                </a>;
        }

        var returnToAppJsx;
        if (this.props.onCancelClick) {
            returnToAppJsx =
                <a className="mx_Login_create" onClick={this.props.onCancelClick} href="#">
                    { _t('Return to app')}
                </a>;
        }

        return (
            <div className="mx_Login">
                <div className="mx_Login_box">
                    <LoginHeader />
                    <div>
                        <h2>{ _t('Sign in')}
                            { loader }
                        </h2>
                        { this.componentForStep(this.state.currentFlow) }
                        <ServerConfig ref="serverConfig"
                            withToggleButton={true}
                            customHsUrl={this.props.customHsUrl}
                            customIsUrl={this.props.customIsUrl}
                            defaultHsUrl={this.props.defaultHsUrl}
                            defaultIsUrl={this.props.defaultIsUrl}
                            onServerConfigChange={this.onServerConfigChange}
                            delayTimeMs={1000}/>
                        <div className="mx_Login_error">
                                { this.state.errorText }
                        </div>
                        <a className="mx_Login_create" onClick={this.props.onRegisterClick} href="#">
                            { _t('Create an account')}
                        </a>
                        { loginAsGuestJsx }
                        { returnToAppJsx }
                        { this._renderLanguageSetting() }
                        <LoginFooter />
                    </div>
                </div>
            </div>
        );
    }
});
