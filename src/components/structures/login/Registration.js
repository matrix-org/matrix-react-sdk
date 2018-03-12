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

import Matrix from 'matrix-js-sdk';

import Promise from 'bluebird';
import React from 'react';

import sdk from '../../../index';
import ServerConfig from '../../views/login/ServerConfig';
import MatrixClientPeg from '../../../MatrixClientPeg';
import RegistrationForm from '../../views/login/RegistrationForm';
import RtsClient from '../../../RtsClient';
import { _t } from '../../../languageHandler';

const MIN_PASSWORD_LENGTH = 6;

module.exports = React.createClass({
    displayName: 'Registration',

    propTypes: {
        onLoggedIn: React.PropTypes.func.isRequired,
        clientSecret: React.PropTypes.string,
        sessionId: React.PropTypes.string,
        makeRegistrationUrl: React.PropTypes.func.isRequired,
        idSid: React.PropTypes.string,
        customHsUrl: React.PropTypes.string,
        customIsUrl: React.PropTypes.string,
        defaultHsUrl: React.PropTypes.string,
        defaultIsUrl: React.PropTypes.string,
        brand: React.PropTypes.string,
        email: React.PropTypes.string,
        referrer: React.PropTypes.string,
        teamServerConfig: React.PropTypes.shape({
            // Email address to request new teams
            supportEmail: React.PropTypes.string.isRequired,
            // URL of the riot-team-server to get team configurations and track referrals
            teamServerURL: React.PropTypes.string.isRequired,
        }),
        teamSelected: React.PropTypes.object,

        defaultDeviceDisplayName: React.PropTypes.string,

        // registration shouldn't know or care how login is done.
        onLoginClick: React.PropTypes.func.isRequired,
        onCancelClick: React.PropTypes.func,
    },

    getInitialState: function() {
        return {
            busy: false,
            teamServerBusy: false,
            errorText: null,
            // We remember the values entered by the user because
            // the registration form will be unmounted during the
            // course of registration, but if there's an error we
            // want to bring back the registration form with the
            // values the user entered still in it. We can keep
            // them in this component's state since this component
            // persist for the duration of the registration process.
            formVals: {

            },
            // true if we're waiting for the user to complete
            // user-interactive auth
            // If we've been given a session ID, we're resuming
            // straight back into UI auth
            doingUIAuth: Boolean(this.props.sessionId),
            hsUrl: this.props.customHsUrl,
            isUrl: this.props.customIsUrl,
        };
    },

    componentWillMount: function() {
        this._unmounted = false;

        this._replaceClient();

        if (
            this.props.teamServerConfig &&
            this.props.teamServerConfig.teamServerURL &&
            !this._rtsClient
        ) {
            this._rtsClient = this.props.rtsClient || new RtsClient(this.props.teamServerConfig.teamServerURL);

            this.setState({
                teamServerBusy: true,
            });
            // GET team configurations including domains, names and icons
            this._rtsClient.getTeamsConfig().then((data) => {
                const teamsConfig = {
                    teams: data,
                    supportEmail: this.props.teamServerConfig.supportEmail,
                };
                console.log('Setting teams config to ', teamsConfig);
                this.setState({
                    teamsConfig: teamsConfig,
                    teamServerBusy: false,
                });
            }, (err) => {
                console.error('Error retrieving config for teams', err);
                this.setState({
                    teamServerBusy: false,
                });
            });
        }
    },

    _replaceClient: function() {
        this._matrixClient = Matrix.createClient({
            baseUrl: this.state.hsUrl,
            idBaseUrl: this.state.isUrl,
        });
    },

    onFormSubmit: function(formVals) {
        this.setState({
            errorText: "",
            busy: true,
            formVals: formVals,
            doingUIAuth: true,
        });
    },

    _onUIAuthFinished: function(success, response, extra) {
        if (!success) {
            let msg = response.message || response.toString();
            // can we give a better error message?
            if (response.required_stages && response.required_stages.indexOf('m.login.msisdn') > -1) {
                let msisdn_available = false;
                for (const flow of response.available_flows) {
                    msisdn_available |= flow.stages.indexOf('m.login.msisdn') > -1;
                }
                if (!msisdn_available) {
                    msg = _t('This server does not support authentication with a phone number.');
                }
            }
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

        // Done regardless of `teamSelected`. People registering with non-team emails
        // will just nop. The point of this being we might not have the email address
        // that the user registered with at this stage (depending on whether this
        // is the client they initiated registration).
        let trackPromise = Promise.resolve(null);
        if (this._rtsClient && extra.emailSid) {
            // Track referral if this.props.referrer set, get team_token in order to
            // retrieve team config and see welcome page etc.
            trackPromise = this._rtsClient.trackReferral(
                this.props.referrer || '', // Default to empty string = not referred
                extra.emailSid,
                extra.clientSecret,
            ).then((data) => {
                const teamToken = data.team_token;
                // Store for use /w welcome pages
                window.localStorage.setItem('mx_team_token', teamToken);

                this._rtsClient.getTeam(teamToken).then((team) => {
                    console.log(
                        `User successfully registered with team ${team.name}`,
                    );
                    if (!team.rooms) {
                        return;
                    }
                    // Auto-join rooms
                    team.rooms.forEach((room) => {
                        if (room.auto_join && room.room_id) {
                            console.log(`Auto-joining ${room.room_id}`);
                            MatrixClientPeg.get().joinRoom(room.room_id);
                        }
                    });
                }, (err) => {
                    console.error('Error getting team config', err);
                });

                return teamToken;
            }, (err) => {
                console.error('Error tracking referral', err);
            });
        }

        trackPromise.then((teamToken) => {
            return this.props.onLoggedIn({
                userId: response.user_id,
                deviceId: response.device_id,
                homeserverUrl: this._matrixClient.getHomeserverUrl(),
                identityServerUrl: this._matrixClient.getIdentityServerUrl(),
                accessToken: response.access_token,
            }, teamToken);
        }).then((cli) => {
            return this._setupPushers(cli);
        });
    },

    _setupPushers: function(matrixClient) {
        return Promise.resolve();
    },

    onFormValidationFailed: function(errCode) {
        let errMsg;
        switch (errCode) {
            case "RegistrationForm.NO_GOOGLE":
                errMsg = "You have not signed into Google.";
                break;
            case "RegistrationForm.SAD_GOOGLE":
                errMsg = "There was an error talking to Google.";
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

    onTeamSelected: function(teamSelected) {
        if (!this._unmounted) {
            this.setState({ teamSelected });
        }
    },

    _makeRegisterRequest: function(auth) {
        // Only send the bind params if we're sending username / pw params
        // (Since we need to send no params at all to use the ones saved in the
        // session).
        const bindThreepids = this.state.formVals.password ? {
            email: true,
            msisdn: true,
        } : {};

        auth.type = "io.kamax.google.auth";
        auth.googleId = this.state.formVals.googleId;

        return this._matrixClient.register(
            "",
            this.state.formVals.googleToken,
            undefined, // session id: included in the auth dict already
            auth,
            bindThreepids,
            null,
        );
    },

    _getUIAuthInputs: function() {
        return {

        };
    },

    render: function() {
        const LoginHeader = sdk.getComponent('login.LoginHeader');
        const LoginFooter = sdk.getComponent('login.LoginFooter');
        const InteractiveAuth = sdk.getComponent('structures.InteractiveAuth');
        const Spinner = sdk.getComponent("elements.Spinner");

        let registerBody;
        if (this.state.doingUIAuth) {
            registerBody = (
                <InteractiveAuth
                    matrixClient={this._matrixClient}
                    makeRequest={this._makeRegisterRequest}
                    onAuthFinished={this._onUIAuthFinished}
                    inputs={this._getUIAuthInputs()}
                    makeRegistrationUrl={this.props.makeRegistrationUrl}
                    sessionId={this.props.sessionId}
                    clientSecret={this.props.clientSecret}
                    emailSid={this.props.idSid}
                    poll={true}
                />
            );
        } else if (this.state.busy || this.state.teamServerBusy) {
            registerBody = <Spinner />;
        } else {
            let errorSection;
            if (this.state.errorText) {
                errorSection = <div className="mx_Login_error">{ this.state.errorText }</div>;
            }
            registerBody = (
                <div>
                    <RegistrationForm
                        onError={this.onFormValidationFailed}
                        onRegisterClick={this.onFormSubmit}
                    />
                    { errorSection }
                </div>
            );
        }

        let returnToAppJsx;
        if (this.props.onCancelClick) {
            returnToAppJsx = (
                <a className="mx_Login_create" onClick={this.props.onCancelClick} href="#">
                    { _t('Return to app') }
                </a>
            );
        }
        return (
            <div className="mx_Login">
                <div className="mx_Login_box">
                    <LoginHeader
                        icon={this.state.teamSelected ?
                            this.props.teamServerConfig.teamServerURL + "/static/common/" +
                            this.state.teamSelected.domain + "/icon.png" :
                            null}
                    />
                    <h2>{ _t('Create an account') }</h2>
                    { registerBody }
                    <a className="mx_Login_create" onClick={this.props.onLoginClick} href="#">
                        { _t('I already have an account') }
                    </a>
                    { returnToAppJsx }
                    <LoginFooter />
                </div>
            </div>
        );
    },
});
