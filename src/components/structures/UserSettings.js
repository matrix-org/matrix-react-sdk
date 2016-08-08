/*
Copyright 2015, 2016 OpenMarket Ltd

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
var React = require('react');
var ReactDOM = require('react-dom');
var sdk = require('../../index');
var MatrixClientPeg = require("../../MatrixClientPeg");
var Modal = require('../../Modal');
var dis = require("../../dispatcher");
var q = require('q');
var package_json = require('../../../package.json');
var UserSettingsStore = require('../../UserSettingsStore');
var GeminiScrollbar = require('react-gemini-scrollbar');
var Email = require('../../email');
var AddThreepid = require('../../AddThreepid');

const LABS_FEATURES = [
    {
        name: 'Rich Text Editor',
        id: 'rich_text_editor'
    },
    {
        name: 'End-to-End Encryption',
        id: 'e2e_encryption'
    },
    {
        name: 'Integration Management',
        id: 'integration_management'
    },
];

// if this looks like a release, use the 'version' from package.json; else use
// the git sha.
const REACT_SDK_VERSION =
      'dist' in package_json ? package_json.version : package_json.gitHead || "<local>";

module.exports = React.createClass({
    displayName: 'UserSettings',

    propTypes: {
        version: React.PropTypes.string,
        onClose: React.PropTypes.func,
        // The brand string given when creating email pushers
        brand: React.PropTypes.string,

        // True to show the 'labs' section of experimental features
        enableLabs: React.PropTypes.bool,
    },

    getDefaultProps: function() {
        return {
            onClose: function() {},
            enableLabs: true,
        };
    },

    getInitialState: function() {
        return {
            avatarUrl: null,
            threePids: [],
            phase: "UserSettings.LOADING", // LOADING, DISPLAY
            email_add_pending: false,
        };
    },

    componentWillMount: function() {
        dis.dispatch({
            action: 'ui_opacity',
            sideOpacity: 0.3,
            middleOpacity: 0.3,
        });
        this._refreshFromServer();
    },

    componentDidMount: function() {
        this.dispatcherRef = dis.register(this.onAction);
        this._me = MatrixClientPeg.get().credentials.userId;
    },

    componentWillUnmount: function() {
        dis.dispatch({
            action: 'ui_opacity',
            sideOpacity: 1.0,
            middleOpacity: 1.0,
        });
        dis.unregister(this.dispatcherRef);
    },

    _refreshFromServer: function() {
        var self = this;
        q.all([
            UserSettingsStore.loadProfileInfo(), UserSettingsStore.loadThreePids()
        ]).done(function(resps) {
            self.setState({
                avatarUrl: resps[0].avatar_url,
                threepids: resps[1].threepids,
                phase: "UserSettings.DISPLAY",
            });
        }, function(error) {
            var ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
            Modal.createDialog(ErrorDialog, {
                title: "Can't load user settings",
                description: error.toString()
            });
        });
    },

    onAction: function(payload) {
        if (payload.action === "notifier_enabled") {
            this.forceUpdate();
        }
    },

    onAvatarPickerClick: function(ev) {
        if (MatrixClientPeg.get().isGuest()) {
            var NeedToRegisterDialog = sdk.getComponent("dialogs.NeedToRegisterDialog");
            Modal.createDialog(NeedToRegisterDialog, {
                title: "Please Register",
                description: "Guests can't set avatars. Please register.",
            });
            return;
        }

        if (this.refs.file_label) {
            this.refs.file_label.click();
        }
    },

    onAvatarSelected: function(ev) {
        var self = this;
        var changeAvatar = this.refs.changeAvatar;
        if (!changeAvatar) {
            console.error("No ChangeAvatar found to upload image to!");
            return;
        }
        changeAvatar.onFileSelected(ev).done(function() {
            // dunno if the avatar changed, re-check it.
            self._refreshFromServer();
        }, function(err) {
            var errMsg = (typeof err === "string") ? err : (err.error || "");
            var ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
            Modal.createDialog(ErrorDialog, {
                title: "Error",
                description: "Failed to set avatar. " + errMsg
            });
        });
    },

    onLogoutClicked: function(ev) {
        var LogoutPrompt = sdk.getComponent('dialogs.LogoutPrompt');
        this.logoutModal = Modal.createDialog(LogoutPrompt);
    },

    onPasswordChangeError: function(err) {
        var errMsg = err.error || "";
        if (err.httpStatus === 403) {
            errMsg = "Failed to change password. Is your password correct?";
        }
        else if (err.httpStatus) {
            errMsg += ` (HTTP status ${err.httpStatus})`;
        }
        var ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
        Modal.createDialog(ErrorDialog, {
            title: "Error",
            description: errMsg
        });
    },

    onPasswordChanged: function() {
        var ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
        Modal.createDialog(ErrorDialog, {
            title: "Success",
            description: `Your password was successfully changed. You will not
                          receive push notifications on other devices until you
                          log back in to them.`
        });
    },

    onUpgradeClicked: function() {
        dis.dispatch({
            action: "start_upgrade_registration"
        });
    },

    onEnableNotificationsChange: function(event) {
        UserSettingsStore.setEnableNotifications(event.target.checked);
    },

    onAddThreepidClicked: function(value, shouldSubmit) {
        if (!shouldSubmit) return;
        var ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
        var QuestionDialog = sdk.getComponent("dialogs.QuestionDialog");

        var email_address = this.refs.add_threepid_input.value;
        if (!Email.looksValid(email_address)) {
            Modal.createDialog(ErrorDialog, {
                title: "Invalid Email Address",
                description: "This doesn't appear to be a valid email address",
            });
            return;
        }
        this.add_threepid = new AddThreepid();
        // we always bind emails when registering, so let's do the
        // same here.
        this.add_threepid.addEmailAddress(email_address, true).done(() => {
            Modal.createDialog(QuestionDialog, {
                title: "Verification Pending",
                description: "Please check your email and click on the link it contains. Once this is done, click continue.",
                button: 'Continue',
                onFinished: this.onEmailDialogFinished,
            });
        }, (err) => {
            this.setState({email_add_pending: false});
            Modal.createDialog(ErrorDialog, {
                title: "Unable to add email address",
                description: err.message
            });
        });
        ReactDOM.findDOMNode(this.refs.add_threepid_input).blur();
        this.setState({email_add_pending: true});
    },

    onEmailDialogFinished: function(ok) {
        if (ok) {
            this.verifyEmailAddress();
        } else {
            this.setState({email_add_pending: false});
        }
    },

    verifyEmailAddress: function() {
        this.add_threepid.checkEmailLinkClicked().done(() => {
            this.add_threepid = undefined;
            this.setState({
                phase: "UserSettings.LOADING",
            });
            this._refreshFromServer();
            this.setState({email_add_pending: false});
        }, (err) => {
            this.setState({email_add_pending: false});
            if (err.errcode == 'M_THREEPID_AUTH_FAILED') {
                var QuestionDialog = sdk.getComponent("dialogs.QuestionDialog");
                var message = "Unable to verify email address. "
                message += "Please check your email and click on the link it contains. Once this is done, click continue."
                Modal.createDialog(QuestionDialog, {
                    title: "Verification Pending",
                    description: message,
                    button: 'Continue',
                    onFinished: this.onEmailDialogFinished,
                });
            } else {
                var ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
                Modal.createDialog(ErrorDialog, {
                    title: "Unable to verify email address",
                    description: err.toString(),
                });
            }
        });
    },

    _onDeactivateAccountClicked: function() {
        const DeactivateAccountDialog = sdk.getComponent("dialogs.DeactivateAccountDialog");
        Modal.createDialog(DeactivateAccountDialog, {});
    },

    _renderUserInterfaceSettings: function() {
        var client = MatrixClientPeg.get();

        var settingsLabels = [
        /*
            {
                id: 'alwaysShowTimestamps',
                label: 'Always show message timestamps',
            },
            {
                id: 'showTwelveHourTimestamps',
                label: 'Show timestamps in 12 hour format (e.g. 2:30pm)',
            },
            {
                id: 'useCompactLayout',
                label: 'Use compact timeline layout',
            },
            {
                id: 'useFixedWidthFont',
                label: 'Use fixed width font',
            },
        */
        ];

        var syncedSettings = UserSettingsStore.getSyncedSettings();

        return (
            <div>
                <h3>User Interface</h3>
                <div className="mx_UserSettings_section">
                    <div className="mx_UserSettings_toggle">
                        <input id="urlPreviewsDisabled"
                               type="checkbox"
                               defaultChecked={ UserSettingsStore.getUrlPreviewsDisabled() }
                               onChange={ e => UserSettingsStore.setUrlPreviewsDisabled(e.target.checked) }
                        />
                        <label htmlFor="urlPreviewsDisabled">
                            Disable inline URL previews by default
                        </label>
                    </div>
                </div>
                { settingsLabels.forEach( setting => {
                    <div className="mx_UserSettings_toggle">
                        <input id={ setting.id }
                               type="checkbox"
                               defaultChecked={ syncedSettings[setting.id] }
                               onChange={ e => UserSettingsStore.setSyncedSetting(setting.id, e.target.checked) }
                        />
                        <label htmlFor={ setting.id }>
                            { settings.label }
                        </label>
                    </div>
                })}
            </div>
        );
    },

    _renderCryptoInfo: function() {
        if (!UserSettingsStore.isFeatureEnabled("e2e_encryption")) {
            return null;
        }

        var client = MatrixClientPeg.get();
        var deviceId = client.deviceId;
        var olmKey = client.getDeviceEd25519Key() || "<not supported>";
        return (
            <div>
                <h3>Cryptography</h3>
                <div className="mx_UserSettings_section">
                    <ul>
                        <li>Device ID: {deviceId}</li>
                        <li>Device key: {olmKey}</li>
                    </ul>
                </div>
            </div>
        );
    },

    _renderDevicesPanel: function() {
        if (!UserSettingsStore.isFeatureEnabled("e2e_encryption")) {
            return null;
        }
        var DevicesPanel = sdk.getComponent('settings.DevicesPanel');
        return (
            <div>
                <h3>Devices</h3>
                <DevicesPanel className="mx_UserSettings_section" />
            </div>
        );
    },

    _renderLabs: function () {
        // default to enabled if undefined
        if (this.props.enableLabs === false) return null;

        let features = LABS_FEATURES.map(feature => (
            <div key={feature.id} className="mx_UserSettings_toggle">
                <input
                    type="checkbox"
                    id={feature.id}
                    name={feature.id}
                    defaultChecked={UserSettingsStore.isFeatureEnabled(feature.id)}
                    onChange={e => {
                        UserSettingsStore.setFeatureEnabled(feature.id, e.target.checked);
                        this.forceUpdate();
                    }}/>
                <label htmlFor={feature.id}>{feature.name}</label>
            </div>
        ));
        return (
            <div>
                <h3>Labs</h3>
                <div className="mx_UserSettings_section">
                    <p>These are experimental features that may break in unexpected ways. Use with caution.</p>
                    {features}
                </div>
            </div>
        )
    },

    _renderDeactivateAccount: function() {
        // We can't deactivate a guest account.
        if (MatrixClientPeg.get().isGuest()) return null;

        return <div>
            <h3>Deactivate Account</h3>
                <div className="mx_UserSettings_section">
                    <button className="mx_UserSettings_button danger"
                        onClick={this._onDeactivateAccountClicked}>Deactivate my account
                    </button>
                </div>
        </div>;
    },

    render: function() {
        var self = this;
        var Loader = sdk.getComponent("elements.Spinner");
        switch (this.state.phase) {
            case "UserSettings.LOADING":
                return (
                    <Loader />
                );
            case "UserSettings.DISPLAY":
                break; // quit the switch to return the common state
            default:
                throw new Error("Unknown state.phase => " + this.state.phase);
        }
        // can only get here if phase is UserSettings.DISPLAY
        var SimpleRoomHeader = sdk.getComponent('rooms.SimpleRoomHeader');
        var ChangeDisplayName = sdk.getComponent("views.settings.ChangeDisplayName");
        var ChangePassword = sdk.getComponent("views.settings.ChangePassword");
        var ChangeAvatar = sdk.getComponent('settings.ChangeAvatar');
        var Notifications = sdk.getComponent("settings.Notifications");
        var EditableText = sdk.getComponent('elements.EditableText');

        var avatarUrl = (
            this.state.avatarUrl ? MatrixClientPeg.get().mxcUrlToHttp(this.state.avatarUrl) : null
        );

        var threepidsSection = this.state.threepids.map(function(val, pidIndex) {
            var id = "email-" + val.address;
            return (
                <div className="mx_UserSettings_profileTableRow" key={pidIndex}>
                    <div className="mx_UserSettings_profileLabelCell">
                        <label htmlFor={id}>Email</label>
                    </div>
                    <div className="mx_UserSettings_profileInputCell">
                        <input key={val.address} id={id} value={val.address} disabled />
                    </div>
                </div>
            );
        });
        var addThreepidSection;
        if (this.state.email_add_pending) {
            addThreepidSection = <Loader />;
        } else if (!MatrixClientPeg.get().isGuest()) {
            addThreepidSection = (
                <div className="mx_UserSettings_profileTableRow" key="new">
                    <div className="mx_UserSettings_profileLabelCell">
                    </div>
                    <div className="mx_UserSettings_profileInputCell">
                        <EditableText
                            ref="add_threepid_input"
                            className="mx_UserSettings_editable"
                            placeholderClassName="mx_UserSettings_threepidPlaceholder"
                            placeholder={ "Add email address" }
                            blurToCancel={ false }
                            onValueChanged={ this.onAddThreepidClicked } />
                    </div>
                    <div className="mx_UserSettings_addThreepid">
                         <img src="img/plus.svg" width="14" height="14" alt="Add" onClick={ this.onAddThreepidClicked.bind(this, undefined, true) }/>
                    </div>
                </div>
            );
        }
        threepidsSection.push(addThreepidSection);

        var accountJsx;

        if (MatrixClientPeg.get().isGuest()) {
            accountJsx = (
                <div className="mx_UserSettings_button" onClick={this.onUpgradeClicked}>
                    Create an account
                </div>
            );
        }
        else {
            accountJsx = (
                <ChangePassword
                        className="mx_UserSettings_accountTable"
                        rowClassName="mx_UserSettings_profileTableRow"
                        rowLabelClassName="mx_UserSettings_profileLabelCell"
                        rowInputClassName="mx_UserSettings_profileInputCell"
                        buttonClassName="mx_UserSettings_button mx_UserSettings_changePasswordButton"
                        onError={this.onPasswordChangeError}
                        onFinished={this.onPasswordChanged} />
            );
        }
        var notification_area;
        if (!MatrixClientPeg.get().isGuest() && this.state.threepids !== undefined) {
            notification_area = (<div>
                <h3>Notifications</h3>

                <div className="mx_UserSettings_section">
                    <Notifications threepids={this.state.threepids} brand={this.props.brand} />
                </div>
            </div>);
        }

        return (
            <div className="mx_UserSettings">
                <SimpleRoomHeader title="Settings" onCancelClick={ this.props.onClose }/>

                <GeminiScrollbar className="mx_UserSettings_body"
                                 autoshow={true}>

                <h3>Profile</h3>

                <div className="mx_UserSettings_section">
                    <div className="mx_UserSettings_profileTable">
                        <div className="mx_UserSettings_profileTableRow">
                            <div className="mx_UserSettings_profileLabelCell">
                                <label htmlFor="displayName">Display name</label>
                            </div>
                            <div className="mx_UserSettings_profileInputCell">
                                <ChangeDisplayName />
                            </div>
                        </div>
                        {threepidsSection}
                    </div>

                    <div className="mx_UserSettings_avatarPicker">
                        <div onClick={ this.onAvatarPickerClick }>
                            <ChangeAvatar ref="changeAvatar" initialAvatarUrl={avatarUrl}
                                showUploadSection={false} className="mx_UserSettings_avatarPicker_img"/>
                        </div>
                        <div className="mx_UserSettings_avatarPicker_edit">
                            <label htmlFor="avatarInput" ref="file_label">
                                <img src="img/camera.svg"
                                    alt="Upload avatar" title="Upload avatar"
                                    width="17" height="15" />
                            </label>
                            <input id="avatarInput" type="file" onChange={this.onAvatarSelected}/>
                        </div>
                    </div>
                </div>

                <h3>Account</h3>

                <div className="mx_UserSettings_section">

                    <div className="mx_UserSettings_logout mx_UserSettings_button" onClick={this.onLogoutClicked}>
                        Log out
                    </div>

                    {accountJsx}
                </div>

                {notification_area}

                {this._renderUserInterfaceSettings()}
                {this._renderLabs()}
                {this._renderDevicesPanel()}
                {this._renderCryptoInfo()}

                <h3>Advanced</h3>

                <div className="mx_UserSettings_section">
                    <div className="mx_UserSettings_advanced">
                        Logged in as {this._me}
                    </div>
                    <div className="mx_UserSettings_advanced">
                        Homeserver is { MatrixClientPeg.get().getHomeserverUrl() }
                    </div>
                    <div className="mx_UserSettings_advanced">
                        Identity Server is { MatrixClientPeg.get().getIdentityServerUrl() }
                    </div>
                    <div className="mx_UserSettings_advanced">
                        matrix-react-sdk version: {REACT_SDK_VERSION}<br/>
                        vector-web version: {this.props.version}<br/>
                    </div>
                </div>

                {this._renderDeactivateAccount()}

                </GeminiScrollbar>
            </div>
        );
    }
});
