/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 Vector Creations Ltd
Copyright 2018, 2019 New Vector Ltd

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

import Matrix from 'matrix-js-sdk';

import Promise from 'bluebird';
import React from 'react';
import PropTypes from 'prop-types';

import sdk from '../../../index';
import { _t, _td } from '../../../languageHandler';
import { messageForResourceLimitError } from '../../../utils/ErrorUtils';
import * as ServerType from '../../views/auth/ServerTypeSelector';
import Tchap from '../../../Tchap';
import TchapStrongPassword from '../../../TchapStrongPassword';

const MIN_PASSWORD_LENGTH = 8;

// Phases
// Show the appropriate registration flow(s) for the server
const PHASE_REGISTRATION = 1;

// Enable phases for registration
const PHASES_ENABLED = true;

module.exports = React.createClass({
    displayName: 'Registration',

    propTypes: {
        onLoggedIn: PropTypes.func.isRequired,
        clientSecret: PropTypes.string,
        sessionId: PropTypes.string,
        makeRegistrationUrl: PropTypes.func.isRequired,
        idSid: PropTypes.string,
        // The default server name to use when the user hasn't specified
        // one. If set, `defaultHsUrl` and `defaultHsUrl` were derived for this
        // via `.well-known` discovery. The server name is used instead of the
        // HS URL when talking about "your account".
        defaultServerName: PropTypes.string,
        // An error passed along from higher up explaining that something
        // went wrong when finding the defaultHsUrl.
        defaultServerDiscoveryError: PropTypes.string,
        customHsUrl: PropTypes.string,
        customIsUrl: PropTypes.string,
        defaultHsUrl: PropTypes.string,
        defaultIsUrl: PropTypes.string,
        skipServerDetails: PropTypes.bool,
        brand: PropTypes.string,
        email: PropTypes.string,
        // registration shouldn't know or care how login is done.
        onLoginClick: PropTypes.func.isRequired,
        onServerConfigChange: PropTypes.func.isRequired,
    },

    getInitialState: function() {
        const serverType = ServerType.getTypeFromHsUrl(this.props.customHsUrl);

        return {
            busy: false,
            errorText: null,
            // We remember the values entered by the user because
            // the registration form will be unmounted during the
            // course of registration, but if there's an error we
            // want to bring back the registration form with the
            // values the user entered still in it. We can keep
            // them in this component's state since this component
            // persist for the duration of the registration process.
            formVals: {
                email: this.props.email,
            },
            // true if we're waiting for the user to complete
            // user-interactive auth
            // If we've been given a session ID, we're resuming
            // straight back into UI auth
            doingUIAuth: Boolean(this.props.sessionId),
            serverType,
            hsUrl: this.props.customHsUrl,
            isUrl: this.props.customIsUrl,
            // Phase of the overall registration dialog.
            phase: PHASE_REGISTRATION,
            flows: null,
        };
    },

    componentWillMount: function() {
        this._unmounted = false;
        this._replaceClient();
    },

    _replaceClient: async function() {
        this.setState({
            errorText: null,
        });
        this._matrixClient = Matrix.createClient({
            baseUrl: this.state.hsUrl,
            idBaseUrl: this.state.isUrl,
        });
        try {
            await this._makeRegisterRequest({});
            // This should never succeed since we specified an empty
            // auth object.
            console.log("Expecting 401 from register request but got success!");
        } catch (e) {
            if (e.httpStatus === 401) {
                this.setState({
                    flows: e.data.flows,
                });
            } else if (e.httpStatus === 403 && e.errcode === "M_UNKNOWN") {
                this.setState({
                    errorText: _t("Registration has been disabled on this homeserver."),
                });
            } else {
                this.setState({
                    errorText: _t("Unable to query for supported registration methods."),
                });
            }
        }
    },

    onFormSubmit: function(formVals) {
        Tchap.discoverPlatform(formVals.email)
            .then(hs => {
                TchapStrongPassword.validatePassword(hs, formVals.password).then(isValidPassword => {
                    if (!isValidPassword) {
                        this.setState({
                            hsUrl: hs,
                            isUrl: hs,
                            errorText: _t('This password is too weak. It must include a lower-case letter, an upper-case letter, a number and a symbol and be at a minimum 8 characters in length.'),
                        });
                    } else {
                        this.setState({
                            hsUrl: hs,
                            isUrl: hs,
                            errorText: "",
                            busy: true,
                            formVals: formVals,
                            doingUIAuth: true,
                        });
                        this._replaceClient();
                    }
                });
            }).catch(err =>{
                console.error(err);
                let errorText;
                if (err === "ERR_UNREACHABLE_HOMESERVER") {
                    errorText = _t('Unreachable Homeserver');
                } else {
                    errorText = err;
                }
                this.setState({
                    errorText: errorText,
                });
        });
    },

    _onUIAuthFinished: async function(success, response, extra) {
        if (!success) {
            const msg = response.message || response.toString();
            this.setState({
                busy: false,
                doingUIAuth: false,
                errorText: msg,
            });
            return;
        }

        this.setState({
            // we're still busy until we get unmounted: don't show the registration form again
            busy: true,
            doingUIAuth: false,
        });

        const cli = await this.props.onLoggedIn({
            userId: response.user_id,
            deviceId: response.device_id,
            homeserverUrl: this._matrixClient.getHomeserverUrl(),
            identityServerUrl: this._matrixClient.getIdentityServerUrl(),
            accessToken: response.access_token,
        });

        this._setupPushers(cli);
    },

    _setupPushers: function(matrixClient) {
        if (!this.props.brand) {
            return Promise.resolve();
        }
        return matrixClient.getPushers().then((resp)=>{
            const pushers = resp.pushers;
            for (let i = 0; i < pushers.length; ++i) {
                if (pushers[i].kind === 'email') {
                    const emailPusher = pushers[i];
                    emailPusher.data = { brand: this.props.brand };
                    matrixClient.setPusher(emailPusher).done(() => {
                        console.log("Set email branding to " + this.props.brand);
                    }, (error) => {
                        console.error("Couldn't set email branding: " + error);
                    });
                }
            }
        }, (error) => {
            console.error("Couldn't get pushers: " + error);
        });
    },

    onFormValidationChange: function(fieldErrors) {
        // `fieldErrors` is an object mapping field IDs to error codes when there is an
        // error or `null` for no error, so the values array will be something like:
        // `[ null, "RegistrationForm.ERR_PASSWORD_MISSING", null]`
        // Find the first non-null error code and show that.
        const errCode = Object.values(fieldErrors).find(value => !!value);
        if (!errCode) {
            this.setState({
                errorText: null,
            });
            return;
        }

        let errMsg;
        switch (errCode) {
            case "RegistrationForm.ERR_PASSWORD_MISSING":
                errMsg = _t('Missing password.');
                break;
            case "RegistrationForm.ERR_PASSWORD_MISMATCH":
                errMsg = _t('Passwords don\'t match.');
                break;
            case "RegistrationForm.ERR_PASSWORD_LENGTH":
                errMsg = _t('Password too short (min %(MIN_PASSWORD_LENGTH)s).', {MIN_PASSWORD_LENGTH});
                break;
            case "RegistrationForm.ERR_EMAIL_INVALID":
                errMsg = _t('This doesn\'t look like a valid email address.');
                break;
            case "RegistrationForm.ERR_MISSING_EMAIL":
                errMsg = _t('An email address is required to register on this homeserver.');
                break;
            default:
                console.error("Unknown error code: %s", errCode);
                errMsg = _t('An unknown error occurred.');
                break;
        }
        this.setState({
            errorText: errMsg,
        });
    },

    onLoginClick: function(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        this.props.onLoginClick();
    },

    onGoToFormClicked(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        this._replaceClient();
        this.setState({
            busy: false,
            doingUIAuth: false,
            phase: PHASE_REGISTRATION,
        });
    },

    _makeRegisterRequest: function(auth) {
        // Only send the bind params if we're sending username / pw params
        // (Since we need to send no params at all to use the ones saved in the
        // session).
        const bindThreepids = this.state.formVals.password ? {
            email: true,
            msisdn: true,
        } : {};

        return this._matrixClient.register(
            undefined,
            this.state.formVals.password,
            undefined, // session id: included in the auth dict already
            auth,
            bindThreepids,
            null,
        );
    },

    _getUIAuthInputs: function() {
        return {
            emailAddress: this.state.formVals.email,
        };
    },

    renderRegisterComponent() {
        if (PHASES_ENABLED && this.state.phase !== PHASE_REGISTRATION) {
            return null;
        }

        const InteractiveAuth = sdk.getComponent('structures.InteractiveAuth');
        const Spinner = sdk.getComponent('elements.Spinner');
        const RegistrationForm = sdk.getComponent('auth.RegistrationForm');

        if (this.state.doingUIAuth) {
            return <InteractiveAuth
                matrixClient={this._matrixClient}
                makeRequest={this._makeRegisterRequest}
                onAuthFinished={this._onUIAuthFinished}
                inputs={this._getUIAuthInputs()}
                makeRegistrationUrl={this.props.makeRegistrationUrl}
                sessionId={this.props.sessionId}
                clientSecret={this.props.clientSecret}
                emailSid={this.props.idSid}
                poll={true}
            />;
        } else if (this.state.busy || !this.state.flows) {
            return <div className="mx_AuthBody_spinner">
                <Spinner />
            </div>;
        } else {
            return <RegistrationForm
                defaultUsername={this.state.formVals.username}
                defaultEmail={this.state.formVals.email}
                defaultPassword={this.state.formVals.password}
                minPasswordLength={MIN_PASSWORD_LENGTH}
                onValidationChange={this.onFormValidationChange}
                onRegisterClick={this.onFormSubmit}
                onEditServerDetailsClick={null}
                flows={this.state.flows}
                hsName={null}
                hsUrl={this.state.hsUrl}
            />;
        }
    },

    render: function() {
        const AuthHeader = sdk.getComponent('auth.AuthHeader');
        const AuthBody = sdk.getComponent("auth.AuthBody");
        const AuthPage = sdk.getComponent('auth.AuthPage');

        let errorText;
        const err = this.state.errorText || this.props.defaultServerDiscoveryError;
        if (err) {
            errorText = <div className="mx_Login_error">{ err }</div>;
        }

        const signIn = <a className="mx_AuthBody_changeFlow" onClick={this.onLoginClick} href="#">
            { _t('Sign in instead') }
        </a>;

        // Only show the 'go back' button if you're not looking at the form
        let goBack;
        if ((PHASES_ENABLED && this.state.phase !== PHASE_REGISTRATION) || this.state.doingUIAuth) {
            goBack = <a className="mx_AuthBody_changeFlow" onClick={this.onGoToFormClicked} href="#">
                { _t('Go back') }
            </a>;
        }

        return (
            <AuthPage>
                <AuthHeader />
                <AuthBody>
                    <h2>{ _t('Create your account') }</h2>
                    { errorText }
                    { this.renderRegisterComponent() }
                    { goBack }
                    { signIn }
                </AuthBody>
            </AuthPage>
        );
    },
});
