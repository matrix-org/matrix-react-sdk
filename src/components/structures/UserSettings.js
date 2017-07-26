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
const React = require('react');
const ReactDOM = require('react-dom');
const sdk = require('../../index');
const MatrixClientPeg = require("../../MatrixClientPeg");
const PlatformPeg = require("../../PlatformPeg");
const Modal = require('../../Modal');
const dis = require("../../dispatcher");
import sessionStore from '../../stores/SessionStore';
import Promise from 'bluebird';
const packageJson = require('../../../package.json');
const UserSettingsStore = require('../../UserSettingsStore');
const CallMediaHandler = require('../../CallMediaHandler');
const GeminiScrollbar = require('react-gemini-scrollbar');
const Email = require('../../email');
const AddThreepid = require('../../AddThreepid');
const SdkConfig = require('../../SdkConfig');
import Analytics from '../../Analytics';
import AccessibleButton from '../views/elements/AccessibleButton';
import { _t } from '../../languageHandler';
import * as languageHandler from '../../languageHandler';
import * as FormattingUtils from '../../utils/FormattingUtils';

// if this looks like a release, use the 'version' from package.json; else use
// the git sha. Prepend version with v, to look like riot-web version
const REACT_SDK_VERSION = 'dist' in packageJson ? packageJson.version : packageJson.gitHead || '<local>';

// Simple method to help prettify GH Release Tags and Commit Hashes.
const semVerRegex = /^v?(\d+\.\d+\.\d+(?:-rc.+)?)(?:-(?:\d+-g)?([0-9a-fA-F]+))?(?:-dirty)?$/i;
const gHVersionLabel = function(repo, token='') {
    const match = token.match(semVerRegex);
    let url;
    if (match && match[1]) { // basic semVer string possibly with commit hash
        url = (match.length > 1 && match[2])
            ? `https://github.com/${repo}/commit/${match[2]}`
            : `https://github.com/${repo}/releases/tag/v${match[1]}`;
    } else {
        url = `https://github.com/${repo}/commit/${token.split('-')[0]}`;
    }
    return <a target="_blank" rel="noopener" href={url}>{token}</a>;
};

// Enumerate some simple 'flip a bit' UI settings (if any).
// 'id' gives the key name in the im.vector.web.settings account data event
// 'label' is how we describe it in the UI.
// Warning: Each "label" string below must be added to i18n/strings/en_EN.json,
// since they will be translated when rendered.
const SETTINGS_LABELS = [
    {
        id: 'autoplayGifsAndVideos',
        label: 'Autoplay GIFs and videos',
    },
    {
        id: 'hideReadReceipts',
        label: 'Hide read receipts',
    },
    {
        id: 'dontSendTypingNotifications',
        label: "Don't send typing notifications",
    },
    {
        id: 'alwaysShowTimestamps',
        label: 'Always show message timestamps',
    },
    {
        id: 'showTwelveHourTimestamps',
        label: 'Show timestamps in 12 hour format (e.g. 2:30pm)',
    },
    {
        id: 'hideJoinLeaves',
        label: 'Hide join/leave messages (invites/kicks/bans unaffected)',
    },
    {
        id: 'useCompactLayout',
        label: 'Use compact timeline layout',
    },
    {
        id: 'hideRedactions',
        label: 'Hide removed messages',
    },
    {
        id: 'enableSyntaxHighlightLanguageDetection',
        label: 'Enable automatic language detection for syntax highlighting',
    },
    {
        id: 'MessageComposerInput.autoReplaceEmoji',
        label: 'Automatically replace plain text Emoji',
    },
/*
    {
        id: 'useFixedWidthFont',
        label: 'Use fixed width font',
    },
*/
];

const ANALYTICS_SETTINGS_LABELS = [
    {
        id: 'analyticsOptOut',
        label: 'Opt out of analytics',
        fn: function(checked) {
            Analytics[checked ? 'disable' : 'enable']();
        },
    },
];

const WEBRTC_SETTINGS_LABELS = [
    {
        id: 'webRtcForceTURN',
        label: 'Disable Peer-to-Peer for 1:1 calls',
    },
];

// Warning: Each "label" string below must be added to i18n/strings/en_EN.json,
// since they will be translated when rendered.
const CRYPTO_SETTINGS_LABELS = [
    {
        id: 'blacklistUnverifiedDevices',
        label: 'Never send encrypted messages to unverified devices from this device',
        fn: function(checked) {
            MatrixClientPeg.get().setGlobalBlacklistUnverifiedDevices(checked);
        },
    },
    // XXX: this is here for documentation; the actual setting is managed via RoomSettings
    // {
    //     id: 'blacklistUnverifiedDevicesPerRoom'
    //     label: 'Never send encrypted messages to unverified devices in this room',
    // }
];

// Enumerate the available themes, with a nice human text label.
// 'id' gives the key name in the im.vector.web.settings account data event
// 'value' is the value for that key in the event
// 'label' is how we describe it in the UI.
//
// XXX: Ideally we would have a theme manifest or something and they'd be nicely
// packaged up in a single directory, and/or located at the application layer.
// But for now for expedience we just hardcode them here.
const THEMES = [
    {
        id: 'theme',
        label: 'Light theme',
        value: 'light',
    },
    {
        id: 'theme',
        label: 'Dark theme',
        value: 'dark',
    },
];

module.exports = React.createClass({
    displayName: 'UserSettings',

    propTypes: {
        onClose: React.PropTypes.func,
        // The brand string given when creating email pushers
        brand: React.PropTypes.string,

        // True to show the 'labs' section of experimental features
        enableLabs: React.PropTypes.bool,

        // The base URL to use in the referral link. Defaults to window.location.origin.
        referralBaseUrl: React.PropTypes.string,

        // Team token for the referral link. If falsy, the referral section will
        // not appear
        teamToken: React.PropTypes.string,
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
            threepids: [],
            phase: "UserSettings.LOADING", // LOADING, DISPLAY
            email_add_pending: false,
            vectorVersion: undefined,
            rejectingInvites: false,
            mediaDevices: null,
        };
    },

    componentWillMount: function() {
        this._unmounted = false;
        this._addThreepid = null;

        if (PlatformPeg.get()) {
            Promise.resolve().then(() => {
                return PlatformPeg.get().getAppVersion();
            }).done((appVersion) => {
                if (this._unmounted) return;
                this.setState({
                    vectorVersion: appVersion,
                });
            }, (e) => {
                console.log("Failed to fetch app version", e);
            });
        }

        this._refreshMediaDevices();

        // Bulk rejecting invites:
        // /sync won't have had time to return when UserSettings re-renders from state changes, so getRooms()
        // will still return rooms with invites. To get around this, add a listener for
        // membership updates and kick the UI.
        MatrixClientPeg.get().on("RoomMember.membership", this._onInviteStateChange);

        dis.dispatch({
            action: 'ui_opacity',
            sideOpacity: 0.3,
            middleOpacity: 0.3,
        });
        this._refreshFromServer();

        const syncedSettings = UserSettingsStore.getSyncedSettings();
        if (!syncedSettings.theme) {
            syncedSettings.theme = 'light';
        }
        this._syncedSettings = syncedSettings;

        this._localSettings = UserSettingsStore.getLocalSettings();

        if (PlatformPeg.get().isElectron()) {
            const {ipcRenderer} = require('electron');

            ipcRenderer.on('settings', this._electronSettings);
            ipcRenderer.send('settings_get');
        }

        this.setState({
            language: languageHandler.getCurrentLanguage(),
        });

        this._sessionStore = sessionStore;
        this._sessionStoreToken = this._sessionStore.addListener(
            this._setStateFromSessionStore,
        );
        this._setStateFromSessionStore();
    },

    componentDidMount: function() {
        this.dispatcherRef = dis.register(this.onAction);
        this._me = MatrixClientPeg.get().credentials.userId;
    },

    componentWillUnmount: function() {
        this._unmounted = true;
        dis.dispatch({
            action: 'ui_opacity',
            sideOpacity: 1.0,
            middleOpacity: 1.0,
        });
        dis.unregister(this.dispatcherRef);
        const cli = MatrixClientPeg.get();
        if (cli) {
            cli.removeListener("RoomMember.membership", this._onInviteStateChange);
        }

        if (PlatformPeg.get().isElectron()) {
            const {ipcRenderer} = require('electron');
            ipcRenderer.removeListener('settings', this._electronSettings);
        }
    },

    // `UserSettings` assumes that the client peg will not be null, so give it some
    // sort of assurance here by only allowing a re-render if the client is truthy.
    //
    // This is required because `UserSettings` maintains its own state and if this state
    // updates (e.g. during _setStateFromSessionStore) after the client peg has been made
    // null (during logout), then it will attempt to re-render and throw errors.
    shouldComponentUpdate: function() {
        return Boolean(MatrixClientPeg.get());
    },

    _setStateFromSessionStore: function() {
        this.setState({
            userHasGeneratedPassword: Boolean(this._sessionStore.getCachedPassword()),
        });
    },

    _electronSettings: function(ev, settings) {
        this.setState({ electron_settings: settings });
    },

    _refreshMediaDevices: function() {
        Promise.resolve().then(() => {
            return CallMediaHandler.getDevices();
        }).then((mediaDevices) => {
            // console.log("got mediaDevices", mediaDevices, this._unmounted);
            if (this._unmounted) return;
            this.setState({
                mediaDevices,
                activeAudioInput: this._localSettings['webrtc_audioinput'],
                activeVideoInput: this._localSettings['webrtc_videoinput'],
            });
        });
    },

    _refreshFromServer: function() {
        const self = this;
        Promise.all([
            UserSettingsStore.loadProfileInfo(), UserSettingsStore.loadThreePids(),
        ]).done(function(resps) {
            self.setState({
                avatarUrl: resps[0].avatar_url,
                threepids: resps[1].threepids,
                phase: "UserSettings.DISPLAY",
            });
        }, function(error) {
            const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
            console.error("Failed to load user settings: " + error);
            Modal.createDialog(ErrorDialog, {
                title: _t("Can't load user settings"),
                description: ((error && error.message) ? error.message : _t("Server may be unavailable or overloaded")),
            });
        });
    },

    onAction: function(payload) {
        if (payload.action === "notifier_enabled") {
            this.forceUpdate();
        }
    },

    onAvatarPickerClick: function(ev) {
        if (this.refs.file_label) {
            this.refs.file_label.click();
        }
    },

    onAvatarSelected: function(ev) {
        const self = this;
        const changeAvatar = this.refs.changeAvatar;
        if (!changeAvatar) {
            console.error("No ChangeAvatar found to upload image to!");
            return;
        }
        changeAvatar.onFileSelected(ev).done(function() {
            // dunno if the avatar changed, re-check it.
            self._refreshFromServer();
        }, function(err) {
            // const errMsg = (typeof err === "string") ? err : (err.error || "");
            console.error("Failed to set avatar: " + err);
            const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
            Modal.createDialog(ErrorDialog, {
                title: _t("Failed to set avatar."),
                description: ((err && err.message) ? err.message : _t("Operation failed")),
            });
        });
    },

    onLogoutClicked: function(ev) {
        const QuestionDialog = sdk.getComponent("dialogs.QuestionDialog");
        Modal.createDialog(QuestionDialog, {
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
                    if (this.props.onFinished) {
                        this.props.onFinished();
                    }
                }
            },
        });
    },

    onPasswordChangeError: function(err) {
        let errMsg = err.error || "";
        if (err.httpStatus === 403) {
            errMsg = _t("Failed to change password. Is your password correct?");
        } else if (err.httpStatus) {
            errMsg += ` (HTTP status ${err.httpStatus})`;
        }
        const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
        console.error("Failed to change password: " + errMsg);
        Modal.createDialog(ErrorDialog, {
            title: _t("Error"),
            description: errMsg,
        });
    },

    onPasswordChanged: function() {
        const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
        Modal.createDialog(ErrorDialog, {
            title: _t("Success"),
            description: _t(
                "Your password was successfully changed. You will not receive " +
                "push notifications on other devices until you log back in to them",
            ) + ".",
        });
        dis.dispatch({action: 'password_changed'});
    },

    onEnableNotificationsChange: function(event) {
        UserSettingsStore.setEnableNotifications(event.target.checked);
    },

    _onAddEmailEditFinished: function(value, shouldSubmit) {
        if (!shouldSubmit) return;
        this._addEmail();
    },

    _addEmail: function() {
        const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
        const QuestionDialog = sdk.getComponent("dialogs.QuestionDialog");

        const emailAddress = this.refs.add_email_input.value;
        if (!Email.looksValid(emailAddress)) {
            Modal.createDialog(ErrorDialog, {
                title: _t("Invalid Email Address"),
                description: _t("This doesn't appear to be a valid email address"),
            });
            return;
        }
        this._addThreepid = new AddThreepid();
        // we always bind emails when registering, so let's do the
        // same here.
        this._addThreepid.addEmailAddress(emailAddress, true).done(() => {
            Modal.createDialog(QuestionDialog, {
                title: _t("Verification Pending"),
                description: _t(
                    "Please check your email and click on the link it contains. Once this " +
                    "is done, click continue.",
                ),
                button: _t('Continue'),
                onFinished: this.onEmailDialogFinished,
            });
        }, (err) => {
            this.setState({email_add_pending: false});
            console.error("Unable to add email address " + emailAddress + " " + err);
            Modal.createDialog(ErrorDialog, {
                title: _t("Unable to add email address"),
                description: ((err && err.message) ? err.message : _t("Operation failed")),
            });
        });
        ReactDOM.findDOMNode(this.refs.add_email_input).blur();
        this.setState({email_add_pending: true});
    },

    onRemoveThreepidClicked: function(threepid) {
        const QuestionDialog = sdk.getComponent("dialogs.QuestionDialog");
        Modal.createDialog(QuestionDialog, {
            title: _t("Remove Contact Information?"),
            description: _t("Remove %(threePid)s?", { threePid: threepid.address }),
            button: _t('Remove'),
            onFinished: (submit) => {
                if (submit) {
                    this.setState({
                        phase: "UserSettings.LOADING",
                    });
                    MatrixClientPeg.get().deleteThreePid(threepid.medium, threepid.address).then(() => {
                        return this._refreshFromServer();
                    }).catch((err) => {
                        const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
                        console.error("Unable to remove contact information: " + err);
                        Modal.createDialog(ErrorDialog, {
                            title: _t("Unable to remove contact information"),
                            description: ((err && err.message) ? err.message : _t("Operation failed")),
                        });
                    }).done();
                }
            },
        });
    },

    onEmailDialogFinished: function(ok) {
        if (ok) {
            this.verifyEmailAddress();
        } else {
            this.setState({email_add_pending: false});
        }
    },

    verifyEmailAddress: function() {
        this._addThreepid.checkEmailLinkClicked().done(() => {
            this._addThreepid = null;
            this.setState({
                phase: "UserSettings.LOADING",
            });
            this._refreshFromServer();
            this.setState({email_add_pending: false});
        }, (err) => {
            this.setState({email_add_pending: false});
            if (err.errcode == 'M_THREEPID_AUTH_FAILED') {
                const QuestionDialog = sdk.getComponent("dialogs.QuestionDialog");
                const message = _t("Unable to verify email address.") + " " +
                    _t("Please check your email and click on the link it contains. Once this is done, click continue.");
                Modal.createDialog(QuestionDialog, {
                    title: _t("Verification Pending"),
                    description: message,
                    button: _t('Continue'),
                    onFinished: this.onEmailDialogFinished,
                });
            } else {
                const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
                console.error("Unable to verify email address: " + err);
                Modal.createDialog(ErrorDialog, {
                    title: _t("Unable to verify email address."),
                    description: ((err && err.message) ? err.message : _t("Operation failed")),
                });
            }
        });
    },

    _onDeactivateAccountClicked: function() {
        const DeactivateAccountDialog = sdk.getComponent("dialogs.DeactivateAccountDialog");
        Modal.createDialog(DeactivateAccountDialog, {});
    },

    _onBugReportClicked: function() {
        const BugReportDialog = sdk.getComponent("dialogs.BugReportDialog");
        if (!BugReportDialog) {
            return;
        }
        Modal.createDialog(BugReportDialog, {});
    },

    _onClearCacheClicked: function() {
        if (!PlatformPeg.get()) return;

        MatrixClientPeg.get().stopClient();
        MatrixClientPeg.get().store.deleteAllData().done(() => {
            PlatformPeg.get().reload();
        });
    },

    _onInviteStateChange: function(event, member, oldMembership) {
        if (member.userId === this._me && oldMembership === "invite") {
            this.forceUpdate();
        }
    },

    _onRejectAllInvitesClicked: function(rooms, ev) {
        this.setState({
            rejectingInvites: true,
        });
        // reject the invites
        const promises = rooms.map((room) => {
            return MatrixClientPeg.get().leave(room.roomId).catch((e) => {
                // purposefully drop errors to the floor: we'll just have a non-zero number on the UI
                // after trying to reject all the invites.
            });
        });
        Promise.all(promises).then(() => {
            this.setState({
                rejectingInvites: false,
            });
        });
    },

    _onExportE2eKeysClicked: function() {
        Modal.createDialogAsync(
            (cb) => {
                require.ensure(['../../async-components/views/dialogs/ExportE2eKeysDialog'], () => {
                    cb(require('../../async-components/views/dialogs/ExportE2eKeysDialog'));
                }, "e2e-export");
            }, {
                matrixClient: MatrixClientPeg.get(),
            },
        );
    },

    _onImportE2eKeysClicked: function() {
        Modal.createDialogAsync(
            (cb) => {
                require.ensure(['../../async-components/views/dialogs/ImportE2eKeysDialog'], () => {
                    cb(require('../../async-components/views/dialogs/ImportE2eKeysDialog'));
                }, "e2e-export");
            }, {
                matrixClient: MatrixClientPeg.get(),
            },
        );
    },

    _renderReferral: function() {
        const teamToken = this.props.teamToken;
        if (!teamToken) {
            return null;
        }
        if (typeof teamToken !== 'string') {
            console.warn('Team token not a string');
            return null;
        }
        const href = (this.props.referralBaseUrl || window.location.origin) +
            `/#/register?referrer=${this._me}&team_token=${teamToken}`;
        return (
            <div>
                <h3>Referral</h3>
                <div className="mx_UserSettings_section">
                    {_t("Refer a friend to Riot:")} <a href={href}>{href}</a>
                </div>
            </div>
        );
    },

    onLanguageChange: function(newLang) {
        if(this.state.language !== newLang) {
            UserSettingsStore.setLocalSetting('language', newLang);
            this.setState({
                language: newLang,
            });
            PlatformPeg.get().reload();
        }
    },

    _renderLanguageSetting: function() {
        const LanguageDropdown = sdk.getComponent('views.elements.LanguageDropdown');
        return <div>
            <label htmlFor="languageSelector">{_t('Interface Language')}</label>
            <LanguageDropdown ref="language" onOptionChange={this.onLanguageChange}
                          className="mx_UserSettings_language"
                          value={this.state.language}
            />
        </div>;
    },

    _renderUserInterfaceSettings: function() {
        // TODO: this ought to be a separate component so that we don't need
        // to rebind the onChange each time we render
        const onChange = (e) =>
            UserSettingsStore.setLocalSetting('autocompleteDelay', + e.target.value);
        return (
            <div>
                <h3>{ _t("User Interface") }</h3>
                <div className="mx_UserSettings_section">
                    { this._renderUrlPreviewSelector() }
                    { SETTINGS_LABELS.map( this._renderSyncedSetting ) }
                    { THEMES.map( this._renderThemeSelector ) }
                    <table>
                        <tbody>
                        <tr>
                            <td><strong>{_t('Autocomplete Delay (ms):')}</strong></td>
                            <td>
                                <input
                                    type="number"
                                    defaultValue={UserSettingsStore.getLocalSetting('autocompleteDelay', 200)}
                                    onChange={onChange}
                                />
                            </td>
                        </tr>
                        </tbody>
                    </table>
                    { this._renderLanguageSetting() }
                </div>
            </div>
        );
    },

    _renderUrlPreviewSelector: function() {
        return <div className="mx_UserSettings_toggle">
            <input id="urlPreviewsDisabled"
                   type="checkbox"
                   defaultChecked={ UserSettingsStore.getUrlPreviewsDisabled() }
                   onChange={ this._onPreviewsDisabledChanged }
            />
            <label htmlFor="urlPreviewsDisabled">
                { _t("Disable inline URL previews by default") }
            </label>
        </div>;
    },

    _onPreviewsDisabledChanged: function(e) {
         UserSettingsStore.setUrlPreviewsDisabled(e.target.checked);
    },

    _renderSyncedSetting: function(setting) {
        // TODO: this ought to be a separate component so that we don't need
        // to rebind the onChange each time we render

        const onChange = (e) => {
            UserSettingsStore.setSyncedSetting(setting.id, e.target.checked);
            if (setting.fn) setting.fn(e.target.checked);
        };

        return <div className="mx_UserSettings_toggle" key={ setting.id }>
            <input id={ setting.id }
                   type="checkbox"
                   defaultChecked={ this._syncedSettings[setting.id] }
                   onChange={ onChange }
            />
            <label htmlFor={ setting.id }>
                { _t(setting.label) }
            </label>
        </div>;
    },

    _renderThemeSelector: function(setting) {
        // TODO: this ought to be a separate component so that we don't need
        // to rebind the onChange each time we render
        const onChange = (e) => {
            if (e.target.checked) {
                UserSettingsStore.setSyncedSetting(setting.id, setting.value);
            }
            dis.dispatch({
                action: 'set_theme',
                value: setting.value,
            });
        };
        return <div className="mx_UserSettings_toggle" key={ setting.id + "_" + setting.value }>
            <input id={ setting.id + "_" + setting.value }
                   type="radio"
                   name={ setting.id }
                   value={ setting.value }
                   defaultChecked={ this._syncedSettings[setting.id] === setting.value }
                   onChange={ onChange }
            />
            <label htmlFor={ setting.id + "_" + setting.value }>
                { setting.label }
            </label>
        </div>;
    },

    _renderCryptoInfo: function() {
        const client = MatrixClientPeg.get();
        const deviceId = client.deviceId;
        let identityKey = client.getDeviceEd25519Key();
        if (!identityKey) {
             identityKey = _t("<not supported>");
        } else {
            identityKey = FormattingUtils.formatCryptoKey(identityKey);
        }

        let importExportButtons = null;

        if (client.isCryptoEnabled) {
            importExportButtons = (
                <div className="mx_UserSettings_importExportButtons">
                    <AccessibleButton className="mx_UserSettings_button"
                            onClick={this._onExportE2eKeysClicked}>
                        { _t("Export E2E room keys") }
                    </AccessibleButton>
                    <AccessibleButton className="mx_UserSettings_button"
                            onClick={this._onImportE2eKeysClicked}>
                        { _t("Import E2E room keys") }
                    </AccessibleButton>
                </div>
            );
        }
        return (
            <div>
                <h3>{ _t("Cryptography") }</h3>
                <div className="mx_UserSettings_section mx_UserSettings_cryptoSection">
                    <ul>
                        <li><label>{_t("Device ID:")}</label>
                            <span><code>{deviceId}</code></span></li>
                        <li><label>{_t("Device key:")}</label>
                            <span><code><b>{identityKey}</b></code></span></li>
                    </ul>
                    { importExportButtons }
                </div>
                <div className="mx_UserSettings_section">
                    { CRYPTO_SETTINGS_LABELS.map( this._renderLocalSetting ) }
                </div>
            </div>
        );
    },

    _renderLocalSetting: function(setting) {
        // TODO: this ought to be a separate component so that we don't need
        // to rebind the onChange each time we render
        const onChange = (e) => {
            UserSettingsStore.setLocalSetting(setting.id, e.target.checked);
            if (setting.fn) setting.fn(e.target.checked);
        };

        return <div className="mx_UserSettings_toggle" key={ setting.id }>
            <input id={ setting.id }
                   type="checkbox"
                   defaultChecked={ this._localSettings[setting.id] }
                   onChange={ onChange }
            />
            <label htmlFor={ setting.id }>
                { _t(setting.label) }
            </label>
        </div>;
    },

    _renderDevicesPanel: function() {
        const DevicesPanel = sdk.getComponent('settings.DevicesPanel');
        return (
            <div>
                <h3>{_t("Devices")}</h3>
                <DevicesPanel className="mx_UserSettings_section"/>
            </div>
        );
    },

    _renderBugReport: function() {
        if (!SdkConfig.get().bug_report_endpoint_url) {
            return <div />;
        }
        return (
            <div>
                <h3>{ _t("Bug Report") }</h3>
                <div className="mx_UserSettings_section">
                    <p>{ _t("Found a bug?") }</p>
                    <button className="mx_UserSettings_button danger"
                        onClick={this._onBugReportClicked}>{_t('Report it')}
                    </button>
                </div>
            </div>
        );
    },

    _renderAnalyticsControl: function() {
        if (!SdkConfig.get().piwik) return <div/>;

        return <div>
            <h3>{ _t('Analytics') }</h3>
            <div className="mx_UserSettings_section">
                {_t('Riot collects anonymous analytics to allow us to improve the application.')}
                {ANALYTICS_SETTINGS_LABELS.map( this._renderLocalSetting )}
            </div>
        </div>;
    },

    _renderLabs: function() {
        // default to enabled if undefined
        if (this.props.enableLabs === false) return null;
        UserSettingsStore.doTranslations();

        const features = UserSettingsStore.LABS_FEATURES.map((feature) => {
            // TODO: this ought to be a separate component so that we don't need
            // to rebind the onChange each time we render
            const onChange = (e) => {
                UserSettingsStore.setFeatureEnabled(feature.id, e.target.checked);
                this.forceUpdate();
            };

            return (
                <div key={feature.id} className="mx_UserSettings_toggle">
                    <input
                        type="checkbox"
                        id={feature.id}
                        name={feature.id}
                        defaultChecked={ UserSettingsStore.isFeatureEnabled(feature.id) }
                        onChange={ onChange }
                    />
                    <label htmlFor={feature.id}>{feature.name}</label>
                </div>
            );
        });
        return (
            <div>
                <h3>{ _t("Labs") }</h3>
                <div className="mx_UserSettings_section">
                    <p>{ _t("These are experimental features that may break in unexpected ways") }. { _t("Use with caution") }.</p>
                    {features}
                </div>
            </div>
        );
    },

    _renderDeactivateAccount: function() {
        return <div>
            <h3>{ _t("Deactivate Account") }</h3>
                <div className="mx_UserSettings_section">
                    <AccessibleButton className="mx_UserSettings_button danger"
                        onClick={this._onDeactivateAccountClicked}> { _t("Deactivate my account") }
                    </AccessibleButton>
                </div>
        </div>;
    },

    _renderClearCache: function() {
        return <div>
            <h3>{ _t("Clear Cache") }</h3>
                <div className="mx_UserSettings_section">
                    <AccessibleButton className="mx_UserSettings_button danger"
                        onClick={this._onClearCacheClicked}>
                        { _t("Clear Cache and Reload") }
                    </AccessibleButton>
                </div>
        </div>;
    },

    _renderCheckUpdate: function() {
        const platform = PlatformPeg.get();
        if ('canSelfUpdate' in platform && platform.canSelfUpdate() && 'startUpdateCheck' in platform) {
            return <div>
                <h3>{_t('Updates')}</h3>
                <div className="mx_UserSettings_section">
                    <AccessibleButton className="mx_UserSettings_button" onClick={platform.startUpdateCheck}>
                        {_t('Check for update')}
                    </AccessibleButton>
                </div>
            </div>;
        }
        return <div />;
    },

    _renderBulkOptions: function() {
        const invitedRooms = MatrixClientPeg.get().getRooms().filter((r) => {
            return r.hasMembershipState(this._me, "invite");
        });
        if (invitedRooms.length === 0) {
            return null;
        }

        const Spinner = sdk.getComponent("elements.Spinner");

        let reject = <Spinner />;
        if (!this.state.rejectingInvites) {
            // bind() the invited rooms so any new invites that may come in as this button is clicked
            // don't inadvertently get rejected as well.
            const onClick = this._onRejectAllInvitesClicked.bind(this, invitedRooms);
            reject = (
                <AccessibleButton className="mx_UserSettings_button danger"
                onClick={onClick}>
                    {_t("Reject all %(invitedRooms)s invites", {invitedRooms: invitedRooms.length})}
                </AccessibleButton>
            );
        }

        return <div>
            <h3>{ _t("Bulk Options") }</h3>
                <div className="mx_UserSettings_section">
                    {reject}
                </div>
        </div>;
    },

    _renderElectronSettings: function() {
        const settings = this.state.electron_settings;
        if (!settings) return;

        return <div>
            <h3>{ _t('Desktop specific') }</h3>
            <div className="mx_UserSettings_section">
                <div className="mx_UserSettings_toggle">
                    <input type="checkbox"
                           name="auto-launch"
                           defaultChecked={settings['auto-launch']}
                           onChange={this._onAutoLaunchChanged}
                    />
                    <label htmlFor="auto-launch">{_t('Start automatically after system login')}</label>
                </div>
            </div>
        </div>;
    },

    _onAutoLaunchChanged: function(e) {
        const {ipcRenderer} = require('electron');
        ipcRenderer.send('settings_set', 'auto-launch', e.target.checked);
    },

    _mapWebRtcDevicesToSpans: function(devices) {
        return devices.map((device) => <span key={device.deviceId}>{device.label}</span>);
    },

    _setAudioInput: function(deviceId) {
        this.setState({activeAudioInput: deviceId});
        CallMediaHandler.setAudioInput(deviceId);
    },

    _setVideoInput: function(deviceId) {
        this.setState({activeVideoInput: deviceId});
        CallMediaHandler.setVideoInput(deviceId);
    },

    _requestMediaPermissions: function(event) {
        const getUserMedia = (
            window.navigator.getUserMedia || window.navigator.webkitGetUserMedia || window.navigator.mozGetUserMedia
        );
        if (getUserMedia) {
            return getUserMedia.apply(window.navigator, [
                { video: true, audio: true },
                this._refreshMediaDevices,
                function() {
                    const ErrorDialog = sdk.getComponent('dialogs.ErrorDialog');
                    Modal.createDialog(ErrorDialog, {
                        title: _t('No media permissions'),
                        description: _t('You may need to manually permit Riot to access your microphone/webcam'),
                    });
                },
            ]);
        }
    },

    _renderWebRtcDeviceSettings: function() {
        if (this.state.mediaDevices === false) {
            return (
                <p className="mx_UserSettings_link" onClick={this._requestMediaPermissions}>
                    {_t('Missing Media Permissions, click here to request.')}
                </p>
            );
        } else if (!this.state.mediaDevices) return;

        const Dropdown = sdk.getComponent('elements.Dropdown');

        let microphoneDropdown = <p>{_t('No Microphones detected')}</p>;
        let webcamDropdown = <p>{_t('No Webcams detected')}</p>;

        const defaultOption = {
            deviceId: '',
            label: _t('Default Device'),
        };

        const audioInputs = this.state.mediaDevices.audioinput.slice(0);
        if (audioInputs.length > 0) {
            let defaultInput = '';
            if (!audioInputs.some((input) => input.deviceId === 'default')) {
                audioInputs.unshift(defaultOption);
            } else {
                defaultInput = 'default';
            }

            microphoneDropdown = <div>
                <h4>{_t('Microphone')}</h4>
                <Dropdown
                    className="mx_UserSettings_webRtcDevices_dropdown"
                    value={this.state.activeAudioInput || defaultInput}
                    onOptionChange={this._setAudioInput}>
                    {this._mapWebRtcDevicesToSpans(audioInputs)}
                </Dropdown>
            </div>;
        }

        const videoInputs = this.state.mediaDevices.videoinput.slice(0);
        if (videoInputs.length > 0) {
            let defaultInput = '';
            if (!videoInputs.some((input) => input.deviceId === 'default')) {
                videoInputs.unshift(defaultOption);
            } else {
                defaultInput = 'default';
            }

            webcamDropdown = <div>
                <h4>{_t('Camera')}</h4>
                <Dropdown
                    className="mx_UserSettings_webRtcDevices_dropdown"
                    value={this.state.activeVideoInput || defaultInput}
                    onOptionChange={this._setVideoInput}>
                    {this._mapWebRtcDevicesToSpans(videoInputs)}
                </Dropdown>
            </div>;
        }

        return <div>
                {microphoneDropdown}
                {webcamDropdown}
        </div>;
    },

    _renderWebRtcSettings: function() {
        return <div>
            <h3>{_t('VoIP')}</h3>
            <div className="mx_UserSettings_section">
                { WEBRTC_SETTINGS_LABELS.map(this._renderLocalSetting) }
                { this._renderWebRtcDeviceSettings() }
            </div>
        </div>;
    },

    _showSpoiler: function(event) {
        const target = event.target;
        target.innerHTML = target.getAttribute('data-spoiler');

        const range = document.createRange();
        range.selectNodeContents(target);

        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    },

    nameForMedium: function(medium) {
        if (medium === 'msisdn') return _t('Phone');
        if (medium === 'email') return _t('Email');
        return medium[0].toUpperCase() + medium.slice(1);
    },

    presentableTextForThreepid: function(threepid) {
        if (threepid.medium === 'msisdn') {
            return '+' + threepid.address;
        } else {
            return threepid.address;
        }
    },

    render: function() {
        const Loader = sdk.getComponent("elements.Spinner");
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
        const SimpleRoomHeader = sdk.getComponent('rooms.SimpleRoomHeader');
        const ChangeDisplayName = sdk.getComponent("views.settings.ChangeDisplayName");
        const ChangePassword = sdk.getComponent("views.settings.ChangePassword");
        const ChangeAvatar = sdk.getComponent('settings.ChangeAvatar');
        const Notifications = sdk.getComponent("settings.Notifications");
        const EditableText = sdk.getComponent('elements.EditableText');

        const avatarUrl = (
            this.state.avatarUrl ? MatrixClientPeg.get().mxcUrlToHttp(this.state.avatarUrl) : null
        );

        const threepidsSection = this.state.threepids.map((val, pidIndex) => {
            const id = "3pid-" + val.address;
            // TODO: make a separate component to avoid having to rebind onClick
            // each time we render
            const onRemoveClick = (e) => this.onRemoveThreepidClicked(val);
            return (
                <div className="mx_UserSettings_profileTableRow" key={pidIndex}>
                    <div className="mx_UserSettings_profileLabelCell">
                        <label htmlFor={id}>{this.nameForMedium(val.medium)}</label>
                    </div>
                    <div className="mx_UserSettings_profileInputCell">
                        <input type="text" key={val.address} id={id}
                            value={this.presentableTextForThreepid(val)} disabled
                        />
                    </div>
                    <div className="mx_UserSettings_threepidButton mx_filterFlipColor">
                        <img src="img/cancel-small.svg" width="14" height="14" alt={ _t("Remove") }
                            onClick={onRemoveClick} />
                    </div>
                </div>
            );
        });
        let addEmailSection;
        if (this.state.email_add_pending) {
            addEmailSection = <Loader key="_email_add_spinner" />;
        } else {
            addEmailSection = (
                <div className="mx_UserSettings_profileTableRow" key="_newEmail">
                    <div className="mx_UserSettings_profileLabelCell">
                        <label>{_t('Email')}</label>
                    </div>
                    <div className="mx_UserSettings_profileInputCell">
                        <EditableText
                            ref="add_email_input"
                            className="mx_UserSettings_editable"
                            placeholderClassName="mx_UserSettings_threepidPlaceholder"
                            placeholder={ _t("Add email address") }
                            blurToCancel={ false }
                            onValueChanged={ this._onAddEmailEditFinished } />
                    </div>
                    <div className="mx_UserSettings_threepidButton mx_filterFlipColor">
                         <img src="img/plus.svg" width="14" height="14" alt={_t("Add")} onClick={this._addEmail} />
                    </div>
                </div>
            );
        }
        const AddPhoneNumber = sdk.getComponent('views.settings.AddPhoneNumber');
        const addMsisdnSection = (
            <AddPhoneNumber key="_addMsisdn" onThreepidAdded={this._refreshFromServer} />
        );
        threepidsSection.push(addEmailSection);
        threepidsSection.push(addMsisdnSection);

        const accountJsx = (
                <ChangePassword
                        className="mx_UserSettings_accountTable"
                        rowClassName="mx_UserSettings_profileTableRow"
                        rowLabelClassName="mx_UserSettings_profileLabelCell"
                        rowInputClassName="mx_UserSettings_profileInputCell"
                        buttonClassName="mx_UserSettings_button mx_UserSettings_changePasswordButton"
                        onError={this.onPasswordChangeError}
                        onFinished={this.onPasswordChanged} />
        );

        let notificationArea;
        if (this.state.threepids !== undefined) {
            notificationArea = (<div>
                <h3>{ _t("Notifications") }</h3>

                <div className="mx_UserSettings_section">
                    <Notifications threepids={this.state.threepids} brand={this.props.brand} />
                </div>
            </div>);
        }

        const olmVersion = MatrixClientPeg.get().olmVersion;
        // If the olmVersion is not defined then either crypto is disabled, or
        // we are using a version old version of olm. We assume the former.
        let olmVersionString = "<not-enabled>";
        if (olmVersion !== undefined) {
            olmVersionString = `${olmVersion[0]}.${olmVersion[1]}.${olmVersion[2]}`;
        }

        return (
            <div className="mx_UserSettings">
                <SimpleRoomHeader
                    title={ _t("Settings") }
                    onCancelClick={ this.props.onClose }
                />

                <GeminiScrollbar className="mx_UserSettings_body"
                                 autoshow={true}>

                <h3>{ _t("Profile") }</h3>

                <div className="mx_UserSettings_section">
                    <div className="mx_UserSettings_profileTable">
                        <div className="mx_UserSettings_profileTableRow">
                            <div className="mx_UserSettings_profileLabelCell">
                                <label htmlFor="displayName">{ _t('Display name') }</label>
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
                                <img src="img/camera.svg" className="mx_filterFlipColor"
                                    alt={ _t("Upload avatar") } title={ _t("Upload avatar") }
                                    width="17" height="15" />
                            </label>
                            <input id="avatarInput" type="file" onChange={this.onAvatarSelected}/>
                        </div>
                    </div>
                </div>

                <h3>{ _t("Account") }</h3>

                <div className="mx_UserSettings_section cadcampoHide">
                    <AccessibleButton className="mx_UserSettings_logout mx_UserSettings_button" onClick={this.onLogoutClicked}>
                        { _t("Sign out") }
                    </AccessibleButton>
                    { this.state.userHasGeneratedPassword ?
                        <div className="mx_UserSettings_passwordWarning">
                            { _t("To return to your account in future you need to set a password") }
                        </div> : null
                    }

                    {accountJsx}
                </div>

                {this._renderReferral()}

                {notificationArea}

                {this._renderUserInterfaceSettings()}
                {this._renderLabs()}
                {this._renderWebRtcSettings()}
                {this._renderDevicesPanel()}
                {this._renderCryptoInfo()}
                {this._renderBulkOptions()}
                {this._renderBugReport()}

                {PlatformPeg.get().isElectron() && this._renderElectronSettings()}

                {this._renderAnalyticsControl()}

                <h3>{ _t("Advanced") }</h3>

                <div className="mx_UserSettings_section">
                    <div className="mx_UserSettings_advanced">
                        { _t("Logged in as:") } {this._me}
                    </div>
                    <div className="mx_UserSettings_advanced">
                        {_t('Access Token:')}
                        <span className="mx_UserSettings_advanced_spoiler"
                                onClick={this._showSpoiler}
                                data-spoiler={ MatrixClientPeg.get().getAccessToken() }>
                            &lt;{ _t("click to reveal") }&gt;
                        </span>
                    </div>
                    <div className="mx_UserSettings_advanced">
                        { _t("Homeserver is") } { MatrixClientPeg.get().getHomeserverUrl() }
                    </div>
                    <div className="mx_UserSettings_advanced">
                        { _t("Identity Server is") } { MatrixClientPeg.get().getIdentityServerUrl() }
                    </div>
                    <div className="mx_UserSettings_advanced">
                        {_t('matrix-react-sdk version:')} {(REACT_SDK_VERSION !== '<local>')
                            ? gHVersionLabel('matrix-org/matrix-react-sdk', REACT_SDK_VERSION)
                            : REACT_SDK_VERSION
                        }<br/>
                        {_t('riot-web version:')} {(this.state.vectorVersion !== undefined)
                            ? gHVersionLabel('vector-im/riot-web', this.state.vectorVersion)
                            : 'unknown'
                        }<br/>
                        { _t("olm version:") } {olmVersionString}<br/>
                    </div>
                </div>

                {this._renderCheckUpdate()}

                {this._renderClearCache()}

                {this._renderDeactivateAccount()}

                </GeminiScrollbar>
            </div>
        );
    },
});
