/*
Copyright 2015, 2016 OpenMarket Ltd
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

const React = require('react');
import PropTypes from 'prop-types';
const MatrixClientPeg = require("../../../MatrixClientPeg");
const Modal = require("../../../Modal");
const sdk = require("../../../index");

import dis from "../../../dispatcher";
import Promise from 'bluebird';
import AccessibleButton from '../elements/AccessibleButton';
import { _t } from '../../../languageHandler';

import sessionStore from '../../../stores/SessionStore';

module.exports = React.createClass({
    displayName: 'ChangePassword',
    propTypes: {
        onFinished: PropTypes.func,
        onError: PropTypes.func,
        onCheckPassword: PropTypes.func,
        rowClassName: PropTypes.string,
        rowLabelClassName: PropTypes.string,
        rowInputClassName: PropTypes.string,
        buttonClassName: PropTypes.string,
        confirm: PropTypes.bool,
        // Whether to autoFocus the new password input
        autoFocusNewPasswordInput: PropTypes.bool,
    },

    Phases: {
        Edit: "edit",
        Uploading: "uploading",
        Error: "error",
    },

    getDefaultProps: function() {
        return {
            onFinished: function() {},
            onError: function() {},
            onCheckPassword: function(oldPass, newPass, confirmPass) {
                if (newPass !== confirmPass) {
                    return {
                        error: _t("New passwords don't match"),
                    };
                } else if (!newPass || newPass.length === 0) {
                    return {
                        error: _t("Passwords can't be empty"),
                    };
                }
            },
            confirm: true,
        };
    },

    getInitialState: function() {
        return {
            phase: this.Phases.Edit,
            cachedPassword: null,
        };
    },

    componentWillMount: function() {
        this._sessionStore = sessionStore;
        this._sessionStoreToken = this._sessionStore.addListener(
            this._setStateFromSessionStore,
        );

        this._setStateFromSessionStore();
    },

    componentWillUnmount: function() {
        if (this._sessionStoreToken) {
            this._sessionStoreToken.remove();
        }
    },

    _setStateFromSessionStore: function() {
        this.setState({
            cachedPassword: this._sessionStore.getCachedPassword(),
        });
    },

    changePassword: function(oldPassword, newPassword) {
        const cli = MatrixClientPeg.get();

        if (!this.props.confirm) {
            this._changePassword(cli, oldPassword, newPassword);
            return;
        }

        const QuestionDialog = sdk.getComponent("dialogs.QuestionDialog");
        Modal.createTrackedDialog('Change Password', '', QuestionDialog, {
            title: _t("Warning!"),
            description:
                <div>
                    { _t(
                        'Changing password will currently reset any end-to-end encryption keys on all devices, ' +
                        'making encrypted chat history unreadable, unless you first export your room keys ' +
                        'and re-import them afterwards. ' +
                        'In future this will be improved.',
                    ) } (<a href="https://github.com/vector-im/riot-web/issues/2671">https://github.com/vector-im/riot-web/issues/2671</a>)
                </div>,
            button: _t("Continue"),
            extraButtons: [
                <button className="mx_Dialog_primary"
                        onClick={this._onExportE2eKeysClicked}>
                    { _t('Export E2E room keys') }
                </button>,
            ],
            onFinished: (confirmed) => {
                if (confirmed) {
                    this._changePassword(cli, oldPassword, newPassword);
                }
            },
        });
    },

    _changePassword: function(cli, oldPassword, newPassword) {
        const authDict = {
            type: 'm.login.password',
            user: cli.credentials.userId,
            password: oldPassword,
        };

        this.setState({
            phase: this.Phases.Uploading,
        });

        cli.setPassword(authDict, newPassword).then(() => {
            // Notify SessionStore that the user's password was changed
            dis.dispatch({action: 'password_changed'});

            if (this.props.shouldAskForEmail) {
                return this._optionallySetEmail().then((confirmed) => {
                    this.props.onFinished({
                        didSetEmail: confirmed,
                    });
                });
            } else {
                this.props.onFinished();
            }
        }, (err) => {
            this.props.onError(err);
        }).finally(() => {
            this.setState({
                phase: this.Phases.Edit,
            });
        }).done();
    },

    _optionallySetEmail: function() {
        const deferred = Promise.defer();
        // Ask for an email otherwise the user has no way to reset their password
        const SetEmailDialog = sdk.getComponent("dialogs.SetEmailDialog");
        Modal.createTrackedDialog('Do you want to set an email address?', '', SetEmailDialog, {
            title: _t('Do you want to set an email address?'),
            onFinished: (confirmed) => {
                // ignore confirmed, setting an email is optional
                deferred.resolve(confirmed);
            },
        });
        return deferred.promise;
    },

    _onExportE2eKeysClicked: function() {
        Modal.createTrackedDialogAsync('Export E2E Keys', 'Change Password', (cb) => {
            require.ensure(['../../../async-components/views/dialogs/ExportE2eKeysDialog'], () => {
                cb(require('../../../async-components/views/dialogs/ExportE2eKeysDialog'));
            }, "e2e-export");
        }, {
            matrixClient: MatrixClientPeg.get(),
        });
    },

    onClickChange: function(ev) {
        ev.preventDefault();
        const oldPassword = this.state.cachedPassword || this.refs.old_input.value;
        const newPassword = this.refs.new_input.value;
        const confirmPassword = this.refs.confirm_input.value;
        const err = this.props.onCheckPassword(
            oldPassword, newPassword, confirmPassword,
        );
        if (err) {
            this.props.onError(err);
        } else {
            this.changePassword(oldPassword, newPassword);
        }
    },

    render: function() {
        const rowClassName = this.props.rowClassName;
        const rowLabelClassName = this.props.rowLabelClassName;
        const rowInputClassName = this.props.rowInputClassName;
        const buttonClassName = this.props.buttonClassName;

        let currentPassword = null;
        if (!this.state.cachedPassword) {
            currentPassword = <div className={rowClassName}>
                <div className={rowLabelClassName}>
                    <label htmlFor="passwordold">{ _t('Current password') }</label>
                </div>
                <div className={rowInputClassName}>
                    <input id="passwordold" type="password" ref="old_input" />
                </div>
            </div>;
        }

        switch (this.state.phase) {
            case this.Phases.Edit:
                const passwordLabel = this.state.cachedPassword ?
                    _t('Password') : _t('New Password');
                return (
                    <form className={this.props.className} onSubmit={this.onClickChange}>
                        { currentPassword }
                        <div className={rowClassName}>
                            <div className={rowLabelClassName}>
                                <label htmlFor="password1">{ passwordLabel }</label>
                            </div>
                            <div className={rowInputClassName}>
                                <input id="password1" type="password" ref="new_input" autoFocus={this.props.autoFocusNewPasswordInput} />
                            </div>
                        </div>
                        <div className={rowClassName}>
                            <div className={rowLabelClassName}>
                                <label htmlFor="password2">{ _t('Confirm password') }</label>
                            </div>
                            <div className={rowInputClassName}>
                                <input id="password2" type="password" ref="confirm_input" />
                            </div>
                        </div>
                        <AccessibleButton className={buttonClassName}
                                onClick={this.onClickChange}
                                element="button">
                            { _t('Change Password') }
                        </AccessibleButton>
                    </form>
                );
            case this.Phases.Uploading:
                var Loader = sdk.getComponent("elements.Spinner");
                return (
                    <div className="mx_Dialog_content">
                        <Loader />
                    </div>
                );
        }
    },
});
