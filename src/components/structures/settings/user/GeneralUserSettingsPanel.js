/*
Copyright 2017 Travis Ralston

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

import * as React from "react";
import {_t} from "../../../../languageHandler";
import MatrixClientPeg from "../../../../MatrixClientPeg";
import UserSettingsStore from "../../../../UserSettingsStore";
import sdk from "../../../../index";
import Promise from 'bluebird';
import dis from "../../../../dispatcher";
import Modal from "../../../../Modal";

module.exports = React.createClass({
    displayName: 'GeneralUserSettingsPanel',

    propTypes: {},

    getInitialState: function() {
        return {
            avatarUrl: null,
            original: {},
        };
    },

    componentWillMount: function() {
        this._refreshFromServer();
    },

    _refreshFromServer: function() {
        const self = this;
        Promise.all([
            UserSettingsStore.loadProfileInfo(), UserSettingsStore.loadThreePids(),
        ]).then(function(resps) {
            const originals = self.state.original;
            originals.displayName = resps[0].displayname;
            originals.avatarUrl = resps[0].avatar_url;
            self.setState({
                avatarUrl: resps[0].avatar_url,
                displayName: resps[0].displayname,
                threepids: resps[1].threepids,
                original: originals,
            });
        }).catch(function(error) {
            const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
            console.error("Failed to load user settings: " + error);
            Modal.createTrackedDialog('Can\'t load user settings', '', ErrorDialog, {
                title: _t("Can't load user settings"),
                description: ((error && error.message) ? error.message : _t("Server may be unavailable or overloaded")),
            });
        });
    },

    _onExportE2eKeysClicked: function() {
        Modal.createTrackedDialogAsync('Export E2E Keys', '', (cb) => {
            require.ensure(['../../../../async-components/views/dialogs/ExportE2eKeysDialog'], () => {
                cb(require('../../../../async-components/views/dialogs/ExportE2eKeysDialog'));
            }, "e2e-export");
        }, { matrixClient: MatrixClientPeg.get() });
    },

    onLogoutClick: function() {
        const QuestionDialog = sdk.getComponent("dialogs.QuestionDialog");
        Modal.createTrackedDialog('Logout E2E Export', '', QuestionDialog, {
            title: _t("Sign out"),
            description:
                <div>
                    { _t("For security, logging out will delete any end-to-end " +
                        "encryption keys from this browser. If you want to be able " +
                        "to decrypt your conversation history from future Riot sessions, " +
                        "please export your room keys for safe-keeping.") }.
                </div>,
            button: _t("Sign out"),
            extraButtons: [
                <button key="export" className="mx_Dialog_primary"
                        onClick={this._onExportE2eKeysClicked}>
                    { _t("Export E2E room keys") }
                </button>,
            ],
            onFinished: (confirmed) => {
                if (confirmed) {
                    dis.dispatch({action: 'logout'});
                }
            },
        });
    },

    onAvatarPickerClick: function() {
        if (this.refs.file_label) {
            this.refs.file_label.click();
        }
    },

    onAvatarRemoveClick: function() {
        if (this.refs.changeAvatar) {
            this.refs.changeAvatar.forceAvatarUrl(null);
        }
        this.setState({avatarUrl: null});
    },

    onAvatarSelected: function(ev) {
        const self = this;
        const changeAvatar = this.refs.changeAvatar;
        if (!changeAvatar) {
            console.error("No ChangeAvatar found to upload image to!");
            return;
        }
        changeAvatar.onFileSelected(ev).then(function() {
            // dunno if the avatar changed, re-check it.
            self._refreshFromServer();
        }).catch(function(err) {
            console.error("Failed to set avatar: " + err);
            const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
            Modal.createTrackedDialog('Failed to set avatar', '', ErrorDialog, {
                title: _t("Failed to set avatar."),
                description: ((err && err.message) ? err.message : _t("Operation failed")),
            });
        });
    },

    onDisplayNameChanged: function(ev) {
        this.setState({
            displayName: ev.target.value,
        });
    },

    onPersonalizationCommitted: function() {
        const promises = [];
        const displayNameChanged = this.state.displayName !== this.state.original.displayName;
        const avatarChanged =
            (this.refs.changeAvatar && !this.refs.changeAvatar.isCommitted())
            || (this.state.avatarUrl !== this.state.original.avatarUrl);

        if (avatarChanged) {
            if (this.state.avatarUrl !== null) {
                promises.push(this.refs.changeAvatar.commitAvatar());
            } else {
                promises.push(MatrixClientPeg.get().setAvatarUrl(null));
            }
        }

        if(displayNameChanged) {
            promises.push(MatrixClientPeg.get().setDisplayName(this.state.displayName));
        }

        return Promise.all(promises).then(() => this._refreshFromServer());
    },

    onPersonalizationReverted: function() {
        return this._refreshFromServer();
    },

    renderAvatarPicker: function() {
        const ChangeAvatar = sdk.getComponent('settings.ChangeAvatar');

        const avatarUrl = this.state.avatarUrl ? MatrixClientPeg.get().mxcUrlToHttp(this.state.avatarUrl) : null;

        return (
            <div className="mx_GeneralUserSettingsPanel_avatarOptions">
                <div onClick={this.onAvatarPickerClick}>
                    <ChangeAvatar ref="changeAvatar" initialAvatarUrl={avatarUrl} setImmediate={false}
                                  showUploadSection={false} className="mx_GeneralUserSettingsPanel_avatarImg" />
                    <div className="mx_GeneralUserSettingsPanel_avatarCamera">
                        <img src="img/camera.svg" title={_t("Upload avatar")} width="17" height="15"
                             onClick={this.onAvatarPickerClick} />
                    </div>
                </div>
                <div className="mx_GeneralUserSettingsPanel_avatarRemove" onClick={this.onAvatarRemoveClick}>
                    { _t("remove") }
                </div>

                <label htmlFor="avatarInput" ref="file_label" />
                <input id="avatarInput" type="file" onChange={this.onAvatarSelected} />
            </div>
        );
    },

    renderPersonalizationSection: function() {
        const FieldCommitment = sdk.getComponent('settings.FieldCommitment');
        const displayNameChanged = this.state.displayName !== this.state.original.displayName;
        const avatarChanged =
            (this.refs.changeAvatar && !this.refs.changeAvatar.isCommitted())
            || (this.state.avatarUrl !== this.state.original.avatarUrl);

        const pendingChanges = displayNameChanged || avatarChanged;
        let commitment = null;
        if (pendingChanges) {
            commitment = (
                <FieldCommitment onCommit={this.onPersonalizationCommitted} onRevert={this.onPersonalizationReverted}
                                 attachment="bottom" />
            );
        }

        return (
            <div className="mx_GeneralUserSettingsPanel_personalization">
                { this.renderAvatarPicker() }
                <div className="mx_GeneralUserSettingsPanel_displayName">
                    <label htmlFor="displayName">{ _t("Display Name") }</label>
                    <input type="text" ref="displayName" id="displayName"
                           value={this.state.displayName} onChange={this.onDisplayNameChanged} />
                </div>
                { commitment }
            </div>
        );
    },

    renderFlairSection: function() {
        // TODO: {Travis} Generify GroupUserSettings
        // const GroupUserSettings = sdk.getComponent('groups.GroupUserSettings');
        // return <GroupUserSettings />;
        return (
            <div>
                <h3>Flair</h3>
                <p>This is where flair controls would normally go.</p>
            </div>
        );
    },

    render: function () {
        const spam = [];
        for (let i = 0; i < 25; i++) {
            spam.push(<p key={i}>Spam item {i}</p>);
        }

        return (
            <div className="mx_GeneralUserSettingsPanel">
                <h1>{ _t("Your Account") }</h1>
                <button className="mx_GeneralUserSettingsPanel_button mx_GeneralUserSettingsPanel_logout"
                        onClick={this.onLogoutClick}>
                    { _t("Sign out") }
                </button>

                { this.renderPersonalizationSection() }
                { this.renderFlairSection() }

                {spam}
            </div>
        );
    },
});
