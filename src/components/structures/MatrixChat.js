/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 Vector Creations Ltd
Copyright 2017 New Vector Ltd

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

import Promise from 'bluebird';

import React from 'react';
import PropTypes from 'prop-types';
import Matrix from "matrix-js-sdk";

import Analytics from "../../Analytics";
import MatrixClientPeg from "../../MatrixClientPeg";
import PlatformPeg from "../../PlatformPeg";
import SdkConfig from "../../SdkConfig";
import * as RoomListSorter from "../../RoomListSorter";
import dis from "../../dispatcher";

import Modal from "../../Modal";
import Tinter from "../../Tinter";
import sdk from '../../index';
import { showStartChatInviteDialog, showRoomInviteDialog } from '../../RoomInvite';
import * as Rooms from '../../Rooms';
import linkifyMatrix from "../../linkify-matrix";
import * as Lifecycle from '../../Lifecycle';
// LifecycleStore is not used but does listen to and dispatch actions
require('../../stores/LifecycleStore');
import PageTypes from '../../PageTypes';

import createRoom from "../../createRoom";
import KeyRequestHandler from '../../KeyRequestHandler';
import { _t, getCurrentLanguage } from '../../languageHandler';
import SettingsStore, {SettingLevel} from "../../settings/SettingsStore";

/** constants for MatrixChat.state.view */
const VIEWS = {
    // a special initial state which is only used at startup, while we are
    // trying to re-animate a matrix client or register as a guest.
    LOADING: 0,

    // we are showing the login view
    LOGIN: 1,

    // we are showing the registration view
    REGISTER: 2,

    // completeing the registration flow
    POST_REGISTRATION: 3,

    // showing the 'forgot password' view
    FORGOT_PASSWORD: 4,

    // we have valid matrix credentials (either via an explicit login, via the
    // initial re-animation/guest registration, or via a registration), and are
    // now setting up a matrixclient to talk to it. This isn't an instant
    // process because (a) we need to clear out indexeddb, and (b) we need to
    // talk to the team server; while it is going on we show a big spinner.
    LOGGING_IN: 5,

    // we are logged in with an active matrix client.
    LOGGED_IN: 6,
};

// Actions that are redirected through the onboarding process prior to being
// re-dispatched. NOTE: some actions are non-trivial and would require
// re-factoring to be included in this list in future.
const ONBOARDING_FLOW_STARTERS = [
    'view_user_settings',
    'view_create_chat',
    'view_create_room',
    'view_create_group',
];

export default React.createClass({
    // we export this so that the integration tests can use it :-S
    statics: {
        VIEWS: VIEWS,
    },

    displayName: 'MatrixChat',

    propTypes: {
        config: PropTypes.object,
        ConferenceHandler: PropTypes.any,
        onNewScreen: PropTypes.func,
        registrationUrl: PropTypes.string,
        enableGuest: PropTypes.bool,

        // the queryParams extracted from the [real] query-string of the URI
        realQueryParams: PropTypes.object,

        // the initial queryParams extracted from the hash-fragment of the URI
        startingFragmentQueryParams: PropTypes.object,

        // called when we have completed a token login
        onTokenLoginCompleted: PropTypes.func,

        // Represents the screen to display as a result of parsing the initial
        // window.location
        initialScreenAfterLogin: PropTypes.shape({
            screen: PropTypes.string.isRequired,
            params: PropTypes.object,
        }),

        // displayname, if any, to set on the device when logging
        // in/registering.
        defaultDeviceDisplayName: PropTypes.string,

        // A function that makes a registration URL
        makeRegistrationUrl: PropTypes.func.isRequired,
    },

    childContextTypes: {
        appConfig: PropTypes.object,
    },

    AuxPanel: {
        RoomSettings: "room_settings",
    },

    getChildContext: function() {
        return {
            appConfig: this.props.config,
        };
    },

    getInitialState: function() {
        const s = {
            // the master view we are showing.
            view: VIEWS.LOADING,

            // What the LoggedInView would be showing if visible
            page_type: null,

            // The ID of the room we're viewing. This is either populated directly
            // in the case where we view a room by ID or by RoomView when it resolves
            // what ID an alias points at.
            currentRoomId: null,

            // If we're trying to just view a user ID (i.e. /user URL), this is it
            viewUserId: null,

            collapseLhs: false,
            collapseRhs: false,
            leftDisabled: false,
            middleDisabled: false,
            rightDisabled: false,

            version: null,
            newVersion: null,
            hasNewVersion: false,
            newVersionReleaseNotes: null,
            checkingForUpdate: null,

            // Parameters used in the registration dance with the IS
            register_client_secret: null,
            register_session_id: null,
            register_hs_url: null,
            register_is_url: null,
            register_id_sid: null,
        };
        return s;
    },

    getDefaultProps: function() {
        return {
            realQueryParams: {},
            startingFragmentQueryParams: {},
            config: {},
            onTokenLoginCompleted: () => {},
        };
    },

    getCurrentHsUrl: function() {
        if (this.state.register_hs_url) {
            return this.state.register_hs_url;
        } else if (MatrixClientPeg.get()) {
            return MatrixClientPeg.get().getHomeserverUrl();
        } else if (window.localStorage && window.localStorage.getItem("mx_hs_url")) {
            return window.localStorage.getItem("mx_hs_url");
        } else {
            return this.getDefaultHsUrl();
        }
    },

    getDefaultHsUrl() {
        return this.props.config.default_hs_url || "https://matrix.org";
    },

    getFallbackHsUrl: function() {
        return this.props.config.fallback_hs_url;
    },

    getCurrentIsUrl: function() {
        if (this.state.register_is_url) {
            return this.state.register_is_url;
        } else if (MatrixClientPeg.get()) {
            return MatrixClientPeg.get().getIdentityServerUrl();
        } else if (window.localStorage && window.localStorage.getItem("mx_is_url")) {
            return window.localStorage.getItem("mx_is_url");
        } else {
            return this.getDefaultIsUrl();
        }
    },

    getDefaultIsUrl() {
        return this.props.config.default_is_url || "https://vector.im";
    },

    componentWillMount: function() {
        SdkConfig.put(this.props.config);

        if (!SettingsStore.getValue("analyticsOptOut")) Analytics.enable();

        // Used by _viewRoom before getting state from sync
        this.firstSyncComplete = false;
        this.firstSyncPromise = Promise.defer();

        if (this.props.config.sync_timeline_limit) {
            MatrixClientPeg.opts.initialSyncLimit = this.props.config.sync_timeline_limit;
        }

        // To enable things like riot.im/geektime in a nicer way than rewriting the URL
        // and appending a team token query parameter, use the first path segment to
        // indicate a team, with "public" team tokens stored in the config teamTokenMap.
        let routedTeamToken = null;
        if (this.props.config.teamTokenMap) {
            const teamName = window.location.pathname.split('/')[1];
            if (teamName && this.props.config.teamTokenMap.hasOwnProperty(teamName)) {
                routedTeamToken = this.props.config.teamTokenMap[teamName];
            }
        }

        // Persist the team token across refreshes using sessionStorage. A new window or
        // tab will not persist sessionStorage, but refreshes will.
        if (this.props.startingFragmentQueryParams.team_token) {
            window.sessionStorage.setItem(
                'mx_team_token',
                this.props.startingFragmentQueryParams.team_token,
            );
        }

        // Use the locally-stored team token first, then as a fall-back, check to see if
        // a referral link was used, which will contain a query parameter `team_token`.
        this._teamToken = routedTeamToken ||
            window.localStorage.getItem('mx_team_token') ||
            window.sessionStorage.getItem('mx_team_token');

        // Some users have ended up with "undefined" as their local storage team token,
        // treat that as undefined.
        if (this._teamToken === "undefined") {
            this._teamToken = undefined;
        }

        if (this._teamToken) {
            console.info(`Team token set to ${this._teamToken}`);
        }

        // Set a default HS with query param `hs_url`
        const paramHs = this.props.startingFragmentQueryParams.hs_url;
        if (paramHs) {
            console.log('Setting register_hs_url ', paramHs);
            this.setState({
                register_hs_url: paramHs,
            });
        }

        // a thing to call showScreen with once login completes.  this is kept
        // outside this.state because updating it should never trigger a
        // rerender.
        this._screenAfterLogin = this.props.initialScreenAfterLogin;

        this._windowWidth = 10000;
        this.handleResize();
        window.addEventListener('resize', this.handleResize);

        // check we have the right tint applied for this theme.
        // N.B. we don't call the whole of setTheme() here as we may be
        // racing with the theme CSS download finishing from index.js
        Tinter.tint();
    },

    componentDidMount: function() {
        this.dispatcherRef = dis.register(this.onAction);

        this.focusComposer = false;

        // this can technically be done anywhere but doing this here keeps all
        // the routing url path logic together.
        if (this.onAliasClick) {
            linkifyMatrix.onAliasClick = this.onAliasClick;
        }
        if (this.onUserClick) {
            linkifyMatrix.onUserClick = this.onUserClick;
        }
        if (this.onGroupClick) {
            linkifyMatrix.onGroupClick = this.onGroupClick;
        }

        const teamServerConfig = this.props.config.teamServerConfig || {};
        Lifecycle.initRtsClient(teamServerConfig.teamServerURL);

        // the first thing to do is to try the token params in the query-string
        Lifecycle.attemptTokenLogin(this.props.realQueryParams).then((loggedIn) => {
            if (loggedIn) {
                this.props.onTokenLoginCompleted();

                // don't do anything else until the page reloads - just stay in
                // the 'loading' state.
                return;
            }

            // if the user has followed a login or register link, don't reanimate
            // the old creds, but rather go straight to the relevant page
            const firstScreen = this._screenAfterLogin ?
                this._screenAfterLogin.screen : null;

            if (firstScreen === 'login' ||
                    firstScreen === 'register' ||
                    firstScreen === 'forgot_password') {
                this._showScreenAfterLogin();
                return;
            }

            // the extra Promise.resolve() ensures that synchronous exceptions hit the same codepath as
            // asynchronous ones.
            return Promise.resolve().then(() => {
                return Lifecycle.loadSession({
                    fragmentQueryParams: this.props.startingFragmentQueryParams,
                    enableGuest: this.props.enableGuest,
                    guestHsUrl: this.getCurrentHsUrl(),
                    guestIsUrl: this.getCurrentIsUrl(),
                    defaultDeviceDisplayName: this.props.defaultDeviceDisplayName,
                });
            }).catch((e) => {
                console.error(`Error attempting to load session: ${e}`);
                return false;
            }).then((loadedSession) => {
                if (!loadedSession) {
                    // fall back to showing the login screen
                    dis.dispatch({action: "start_login"});
                }
            });
        }).done();
    },

    componentWillUnmount: function() {
        Lifecycle.stopMatrixClient();
        dis.unregister(this.dispatcherRef);
        window.removeEventListener("focus", this.onFocus);
        window.removeEventListener('resize', this.handleResize);
    },

    componentDidUpdate: function() {
        if (this.focusComposer) {
            dis.dispatch({action: 'focus_composer'});
            this.focusComposer = false;
        }
    },

    setStateForNewView: function(state) {
        if (state.view === undefined) {
            throw new Error("setStateForNewView with no view!");
        }
        const newState = {
            viewUserId: null,
        };
        Object.assign(newState, state);
        this.setState(newState);
    },

    onAction: function(payload) {
        // console.log(`MatrixClientPeg.onAction: ${payload.action}`);
        const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
        const QuestionDialog = sdk.getComponent("dialogs.QuestionDialog");

        // Start the onboarding process for certain actions
        if (MatrixClientPeg.get() && MatrixClientPeg.get().isGuest() &&
            ONBOARDING_FLOW_STARTERS.includes(payload.action)
        ) {
            // This will cause `payload` to be dispatched later, once a
            // sync has reached the "prepared" state. Setting a matrix ID
            // will cause a full login and sync and finally the deferred
            // action will be dispatched.
            dis.dispatch({
                action: 'do_after_sync_prepared',
                deferred_action: payload,
            });
            dis.dispatch({action: 'view_set_mxid'});
            return;
        }

        switch (payload.action) {
            case 'logout':
                Lifecycle.logout();
                break;
            case 'start_registration':
                this._startRegistration(payload.params || {});
                break;
            case 'start_login':
                this.setStateForNewView({
                    view: VIEWS.LOGIN,
                });
                this.notifyNewScreen('login');
                break;
            case 'start_post_registration':
                this.setState({
                    view: VIEWS.POST_REGISTRATION,
                });
                break;
            case 'start_password_recovery':
                this.setStateForNewView({
                    view: VIEWS.FORGOT_PASSWORD,
                });
                this.notifyNewScreen('forgot_password');
                break;
            case 'start_chat':
                createRoom({
                    dmUserId: payload.user_id,
                });
                break;
            case 'leave_room':
                this._leaveRoom(payload.room_id);
                break;
            case 'reject_invite':
                Modal.createTrackedDialog('Reject invitation', '', QuestionDialog, {
                    title: _t('Reject invitation'),
                    description: _t('Are you sure you want to reject the invitation?'),
                    onFinished: (confirm) => {
                        if (confirm) {
                            // FIXME: controller shouldn't be loading a view :(
                            const Loader = sdk.getComponent("elements.Spinner");
                            const modal = Modal.createDialog(Loader, null, 'mx_Dialog_spinner');

                            MatrixClientPeg.get().leave(payload.room_id).done(() => {
                                modal.close();
                                if (this.state.currentRoomId === payload.room_id) {
                                    dis.dispatch({action: 'view_next_room'});
                                }
                            }, (err) => {
                                modal.close();
                                Modal.createTrackedDialog('Failed to reject invitation', '', ErrorDialog, {
                                    title: _t('Failed to reject invitation'),
                                    description: err.toString(),
                                });
                            });
                        }
                    },
                });
                break;
            case 'view_user':
                // FIXME: ugly hack to expand the RightPanel and then re-dispatch.
                if (this.state.collapseRhs) {
                    setTimeout(()=>{
                        dis.dispatch({
                            action: 'show_right_panel',
                        });
                        dis.dispatch({
                            action: 'view_user',
                            member: payload.member,
                        });
                    }, 0);
                }
                break;
            case 'view_room':
                // Takes either a room ID or room alias: if switching to a room the client is already
                // known to be in (eg. user clicks on a room in the recents panel), supply the ID
                // If the user is clicking on a room in the context of the alias being presented
                // to them, supply the room alias. If both are supplied, the room ID will be ignored.
                this._viewRoom(payload);
                break;
            case 'view_prev_room':
                this._viewNextRoom(-1);
                break;
            case 'view_next_room':
                this._viewNextRoom(1);
                break;
            case 'view_indexed_room':
                this._viewIndexedRoom(payload.roomIndex);
                break;
            case 'view_user_settings':
                this._setPage(PageTypes.UserSettings);
                this.notifyNewScreen('settings');
                break;
            case 'view_create_room':
                this._createRoom();
                break;
            case 'view_create_group': {
                const CreateGroupDialog = sdk.getComponent("dialogs.CreateGroupDialog");
                Modal.createTrackedDialog('Create Community', '', CreateGroupDialog);
            }
            break;
            case 'view_room_directory':
                this._setPage(PageTypes.RoomDirectory);
                this.notifyNewScreen('directory');
                break;
            case 'view_my_groups':
                this._setPage(PageTypes.MyGroups);
                this.notifyNewScreen('groups');
                break;
            case 'view_group':
                {
                    const groupId = payload.group_id;
                    this.setState({
                        currentGroupId: groupId,
                        currentGroupIsNew: payload.group_is_new,
                    });
                    this._setPage(PageTypes.GroupView);
                    this.notifyNewScreen('group/' + groupId);
                }
                break;
            case 'view_home_page':
                this._setPage(PageTypes.HomePage);
                this.notifyNewScreen('home');
                break;
            case 'view_set_mxid':
                this._setMxId(payload);
                break;
            case 'view_start_chat_or_reuse':
                this._chatCreateOrReuse(payload.user_id, payload.go_home_on_cancel);
                break;
            case 'view_create_chat':
                showStartChatInviteDialog();
                break;
            case 'view_invite':
                showRoomInviteDialog(payload.roomId);
                break;
            case 'notifier_enabled':
                this.forceUpdate();
                break;
            case 'hide_left_panel':
                this.setState({
                    collapseLhs: true,
                });
                break;
            case 'show_left_panel':
                this.setState({
                    collapseLhs: false,
                });
                break;
            case 'hide_right_panel':
                this.setState({
                    collapseRhs: true,
                });
                break;
            case 'show_right_panel':
                this.setState({
                    collapseRhs: false,
                });
                break;
            case 'panel_disable': {
                this.setState({
                    leftDisabled: payload.leftDisabled || payload.sideDisabled || false,
                    middleDisabled: payload.middleDisabled || false,
                    rightDisabled: payload.rightDisabled || payload.sideDisabled || false,
                });
                break; }
            case 'set_theme':
                this._onSetTheme(payload.value);
                break;
            case 'on_logging_in':
                // We are now logging in, so set the state to reflect that
                // NB. This does not touch 'ready' since if our dispatches
                // are delayed, the sync could already have completed
                this.setStateForNewView({
                    view: VIEWS.LOGGING_IN,
                });
                break;
            case 'on_logged_in':
                this._onLoggedIn(payload.teamToken);
                break;
            case 'on_logged_out':
                this._onLoggedOut();
                break;
            case 'will_start_client':
                this.setState({ready: false}, () => {
                    // if the client is about to start, we are, by definition, not ready.
                    // Set ready to false now, then it'll be set to true when the sync
                    // listener we set below fires.
                    this._onWillStartClient();
                });
                break;
            case 'client_started':
                this._onClientStarted();
                break;
            case 'new_version':
                this.onVersion(
                    payload.currentVersion, payload.newVersion,
                    payload.releaseNotes,
                );
                break;
            case 'check_updates':
                this.setState({ checkingForUpdate: payload.value });
                break;
            case 'send_event':
                this.onSendEvent(payload.room_id, payload.event);
                break;
        }
    },

    _setPage: function(pageType) {
        this.setState({
            page_type: pageType,
        });
    },

    _startRegistration: function(params) {
        const newState = {
            view: VIEWS.REGISTER,
        };

        // Only honour params if they are all present, otherwise we reset
        // HS and IS URLs when switching to registration.
        if (params.client_secret &&
            params.session_id &&
            params.hs_url &&
            params.is_url &&
            params.sid
        ) {
            newState.register_client_secret = params.client_secret;
            newState.register_session_id = params.session_id;
            newState.register_hs_url = params.hs_url;
            newState.register_is_url = params.is_url;
            newState.register_id_sid = params.sid;
        }

        this.setStateForNewView(newState);
        this.notifyNewScreen('register');
    },

    // TODO: Move to RoomViewStore
    _viewNextRoom: function(roomIndexDelta) {
        const allRooms = RoomListSorter.mostRecentActivityFirst(
            MatrixClientPeg.get().getRooms(),
        );
        // If there are 0 rooms or 1 room, view the home page because otherwise
        // if there are 0, we end up trying to index into an empty array, and
        // if there is 1, we end up viewing the same room.
        if (allRooms.length < 2) {
            dis.dispatch({
                action: 'view_home_page',
            });
            return;
        }
        let roomIndex = -1;
        for (let i = 0; i < allRooms.length; ++i) {
            if (allRooms[i].roomId == this.state.currentRoomId) {
                roomIndex = i;
                break;
            }
        }
        roomIndex = (roomIndex + roomIndexDelta) % allRooms.length;
        if (roomIndex < 0) roomIndex = allRooms.length - 1;
        dis.dispatch({
            action: 'view_room',
            room_id: allRooms[roomIndex].roomId,
        });
    },

    // TODO: Move to RoomViewStore
    _viewIndexedRoom: function(roomIndex) {
        const allRooms = RoomListSorter.mostRecentActivityFirst(
            MatrixClientPeg.get().getRooms(),
        );
        if (allRooms[roomIndex]) {
            dis.dispatch({
                action: 'view_room',
                room_id: allRooms[roomIndex].roomId,
            });
        }
    },

    // switch view to the given room
    //
    // @param {Object} roomInfo Object containing data about the room to be joined
    // @param {string=} roomInfo.room_id ID of the room to join. One of room_id or room_alias must be given.
    // @param {string=} roomInfo.room_alias Alias of the room to join. One of room_id or room_alias must be given.
    // @param {boolean=} roomInfo.auto_join If true, automatically attempt to join the room if not already a member.
    // @param {boolean=} roomInfo.show_settings Makes RoomView show the room settings dialog.
    // @param {string=} roomInfo.event_id ID of the event in this room to show: this will cause a switch to the
    //                                    context of that particular event.
    // @param {boolean=} roomInfo.highlighted If true, add event_id to the hash of the URL
    //                                        and alter the EventTile to appear highlighted.
    // @param {Object=} roomInfo.third_party_invite Object containing data about the third party
    //                                    we received to join the room, if any.
    // @param {string=} roomInfo.third_party_invite.inviteSignUrl 3pid invite sign URL
    // @param {string=} roomInfo.third_party_invite.invitedEmail The email address the invite was sent to
    // @param {Object=} roomInfo.oob_data Object of additional data about the room
    //                               that has been passed out-of-band (eg.
    //                               room name and avatar from an invite email)
    _viewRoom: function(roomInfo) {
        this.focusComposer = true;

        const newState = {
            currentRoomId: roomInfo.room_id || null,
            page_type: PageTypes.RoomView,
            thirdPartyInvite: roomInfo.third_party_invite,
            roomOobData: roomInfo.oob_data,
        };

        if (roomInfo.room_alias) {
            console.log(
                `Switching to room alias ${roomInfo.room_alias} at event ` +
                roomInfo.event_id,
            );
        } else {
            console.log(`Switching to room id ${roomInfo.room_id} at event ` +
                roomInfo.event_id,
            );
        }

        // Wait for the first sync to complete so that if a room does have an alias,
        // it would have been retrieved.
        let waitFor = Promise.resolve(null);
        if (!this.firstSyncComplete) {
            if (!this.firstSyncPromise) {
                console.warn('Cannot view a room before first sync. room_id:', roomInfo.room_id);
                return;
            }
            waitFor = this.firstSyncPromise.promise;
        }

        waitFor.done(() => {
            let presentedId = roomInfo.room_alias || roomInfo.room_id;
            const room = MatrixClientPeg.get().getRoom(roomInfo.room_id);
            if (room) {
                const theAlias = Rooms.getDisplayAliasForRoom(room);
                if (theAlias) presentedId = theAlias;

                // Store this as the ID of the last room accessed. This is so that we can
                // persist which room is being stored across refreshes and browser quits.
                if (localStorage) {
                    localStorage.setItem('mx_last_room_id', room.roomId);
                }
            }

            if (roomInfo.event_id && roomInfo.highlighted) {
                presentedId += "/" + roomInfo.event_id;
            }
            this.notifyNewScreen('room/' + presentedId);
            newState.ready = true;
            this.setState(newState);
        });
    },

    _setMxId: function(payload) {
        const SetMxIdDialog = sdk.getComponent('views.dialogs.SetMxIdDialog');
        const close = Modal.createTrackedDialog('Set MXID', '', SetMxIdDialog, {
            homeserverUrl: MatrixClientPeg.get().getHomeserverUrl(),
            onFinished: (submitted, credentials) => {
                if (!submitted) {
                    dis.dispatch({
                        action: 'cancel_after_sync_prepared',
                    });
                    if (payload.go_home_on_cancel) {
                        dis.dispatch({
                            action: 'view_home_page',
                        });
                    }
                    return;
                }
                this.onRegistered(credentials);
            },
            onDifferentServerClicked: (ev) => {
                dis.dispatch({action: 'start_registration'});
                close();
            },
            onLoginClick: (ev) => {
                dis.dispatch({action: 'start_login'});
                close();
            },
        }).close;
    },

    _createRoom: function() {
        const CreateRoomDialog = sdk.getComponent('dialogs.CreateRoomDialog');
        Modal.createTrackedDialog('Create Room', '', CreateRoomDialog, {
            onFinished: (shouldCreate, name, noFederate) => {
                if (shouldCreate) {
                    const createOpts = {};
                    if (name) createOpts.name = name;
                    if (noFederate) createOpts.creation_content = {'m.federate': false};
                    createRoom({createOpts}).done();
                }
            },
        });
    },

    _chatCreateOrReuse: function(userId, goHomeOnCancel) {
        if (goHomeOnCancel === undefined) goHomeOnCancel = true;

        const ChatCreateOrReuseDialog = sdk.getComponent(
            'views.dialogs.ChatCreateOrReuseDialog',
        );
        // Use a deferred action to reshow the dialog once the user has registered
        if (MatrixClientPeg.get().isGuest()) {
            // No point in making 2 DMs with welcome bot. This assumes view_set_mxid will
            // result in a new DM with the welcome user.
            if (userId !== this.props.config.welcomeUserId) {
                dis.dispatch({
                    action: 'do_after_sync_prepared',
                    deferred_action: {
                        action: 'view_start_chat_or_reuse',
                        user_id: userId,
                    },
                });
            }
            dis.dispatch({
                action: 'view_set_mxid',
                // If the set_mxid dialog is cancelled, view /home because if the browser
                // was pointing at /user/@someone:domain?action=chat, the URL needs to be
                // reset so that they can revisit /user/.. // (and trigger
                // `_chatCreateOrReuse` again)
                go_home_on_cancel: true,
            });
            return;
        }

        const close = Modal.createTrackedDialog('Chat create or reuse', '', ChatCreateOrReuseDialog, {
            userId: userId,
            onFinished: (success) => {
                if (!success && goHomeOnCancel) {
                    // Dialog cancelled, default to home
                    dis.dispatch({ action: 'view_home_page' });
                }
            },
            onNewDMClick: () => {
                dis.dispatch({
                    action: 'start_chat',
                    user_id: userId,
                });
                // Close the dialog, indicate success (calls onFinished(true))
                close(true);
            },
            onExistingRoomSelected: (roomId) => {
                dis.dispatch({
                    action: 'view_room',
                    room_id: roomId,
                });
                close(true);
            },
        }).close;
    },

    _leaveRoomWarnings: function(roomId) {
        const roomToLeave = MatrixClientPeg.get().getRoom(roomId);
        // Show a warning if there are additional complications.
        const joinRules = roomToLeave.currentState.getStateEvents('m.room.join_rules', '');
        const warnings = [];
        if (joinRules) {
            const rule = joinRules.getContent().join_rule;
            if (rule !== "public") {
                warnings.push((
                    <span className="warning" key="non_public_warning">
                        { _t("This room is not public. You will not be able to rejoin without an invite.") }
                    </span>
                ));
            }
        }
        return warnings;
    },

    _leaveRoom: function(roomId) {
        const QuestionDialog = sdk.getComponent("dialogs.QuestionDialog");
        const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
        const roomToLeave = MatrixClientPeg.get().getRoom(roomId);
        const warnings = this._leaveRoomWarnings(roomId);

        Modal.createTrackedDialog('Leave room', '', QuestionDialog, {
            title: _t("Leave room"),
            description: (
                <span>
                { _t("Are you sure you want to leave the room '%(roomName)s'?", {roomName: roomToLeave.name}) }
                { warnings }
                </span>
            ),
            onFinished: (shouldLeave) => {
                if (shouldLeave) {
                    const d = MatrixClientPeg.get().leave(roomId);

                    // FIXME: controller shouldn't be loading a view :(
                    const Loader = sdk.getComponent("elements.Spinner");
                    const modal = Modal.createDialog(Loader, null, 'mx_Dialog_spinner');

                    d.then(() => {
                        modal.close();
                        if (this.state.currentRoomId === roomId) {
                            dis.dispatch({action: 'view_next_room'});
                        }
                    }, (err) => {
                        modal.close();
                        console.error("Failed to leave room " + roomId + " " + err);
                        Modal.createTrackedDialog('Failed to leave room', '', ErrorDialog, {
                            title: _t("Failed to leave room"),
                            description: (err && err.message ? err.message :
                                _t("Server may be unavailable, overloaded, or you hit a bug.")),
                        });
                    });
                }
            },
        });
    },

    /**
     * Called whenever someone changes the theme
     *
     * @param {string} theme new theme
     */
    _onSetTheme: function(theme) {
        if (!theme) {
            theme = SettingsStore.getValue("theme");
        }

        // look for the stylesheet elements.
        // styleElements is a map from style name to HTMLLinkElement.
        const styleElements = Object.create(null);
        let a;
        for (let i = 0; (a = document.getElementsByTagName("link")[i]); i++) {
            const href = a.getAttribute("href");
            // shouldn't we be using the 'title' tag rather than the href?
            const match = href.match(/^bundles\/.*\/theme-(.*)\.css$/);
            if (match) {
                styleElements[match[1]] = a;
            }
        }

        if (!(theme in styleElements)) {
            throw new Error("Unknown theme " + theme);
        }

        // disable all of them first, then enable the one we want. Chrome only
        // bothers to do an update on a true->false transition, so this ensures
        // that we get exactly one update, at the right time.
        //
        // ^ This comment was true when we used to use alternative stylesheets
        // for the CSS.  Nowadays we just set them all as disabled in index.html
        // and enable them as needed.  It might be cleaner to disable them all
        // at the same time to prevent loading two themes simultaneously and
        // having them interact badly... but this causes a flash of unstyled app
        // which is even uglier.  So we don't.

        styleElements[theme].disabled = false;

        const switchTheme = function() {
            // we re-enable our theme here just in case we raced with another
            // theme set request as per https://github.com/vector-im/riot-web/issues/5601.
            // We could alternatively lock or similar to stop the race, but
            // this is probably good enough for now.
            styleElements[theme].disabled = false;
            Object.values(styleElements).forEach((a) => {
                if (a == styleElements[theme]) return;
                a.disabled = true;
            });
            Tinter.setTheme(theme);
        };

        // turns out that Firefox preloads the CSS for link elements with
        // the disabled attribute, but Chrome doesn't.

        let cssLoaded = false;

        styleElements[theme].onload = () => {
            switchTheme();
        };

        for (let i = 0; i < document.styleSheets.length; i++) {
            const ss = document.styleSheets[i];
            if (ss && ss.href === styleElements[theme].href) {
                cssLoaded = true;
                break;
            }
        }

        if (cssLoaded) {
            styleElements[theme].onload = undefined;
            switchTheme();
        }
    },

    /**
     * Called when a new logged in session has started
     *
     * @param {string} teamToken
     */
    _onLoggedIn: function(teamToken) {
        this.setState({
            view: VIEWS.LOGGED_IN,
        });

        if (teamToken) {
            // A team member has logged in, not a guest
            this._teamToken = teamToken;
            dis.dispatch({action: 'view_home_page'});
        } else if (this._is_registered) {
            this._is_registered = false;

            // Set the display name = user ID localpart
            MatrixClientPeg.get().setDisplayName(
                MatrixClientPeg.get().getUserIdLocalpart(),
            );

            if (this.props.config.welcomeUserId && getCurrentLanguage().startsWith("en")) {
                createRoom({
                    dmUserId: this.props.config.welcomeUserId,
                    // Only view the welcome user if we're NOT looking at a room
                    andView: !this.state.currentRoomId,
                });
                return;
            }
            // The user has just logged in after registering
            dis.dispatch({action: 'view_home_page'});
        } else {
            this._showScreenAfterLogin();
        }
    },

    _showScreenAfterLogin: function() {
        // If screenAfterLogin is set, use that, then null it so that a second login will
        // result in view_home_page, _user_settings or _room_directory
        if (this._screenAfterLogin && this._screenAfterLogin.screen) {
            this.showScreen(
                this._screenAfterLogin.screen,
                this._screenAfterLogin.params,
            );
            this._screenAfterLogin = null;
        } else if (localStorage && localStorage.getItem('mx_last_room_id')) {
            // Before defaulting to directory, show the last viewed room
            dis.dispatch({
                action: 'view_room',
                room_id: localStorage.getItem('mx_last_room_id'),
            });
        } else {
            dis.dispatch({action: 'view_home_page'});
        }
    },

    /**
     * Called when the session is logged out
     */
    _onLoggedOut: function() {
        this.notifyNewScreen('login');
        this.setStateForNewView({
            view: VIEWS.LOGIN,
            ready: false,
            collapseLhs: false,
            collapseRhs: false,
            currentRoomId: null,
            page_type: PageTypes.RoomDirectory,
        });
        this._teamToken = null;
        this._setPageSubtitle();
    },

    /**
     * Called just before the matrix client is started
     * (useful for setting listeners)
     */
    _onWillStartClient() {
        const self = this;

        // reset the 'have completed first sync' flag,
        // since we're about to start the client and therefore about
        // to do the first sync
        this.firstSyncComplete = false;
        this.firstSyncPromise = Promise.defer();
        const cli = MatrixClientPeg.get();

        // Allow the JS SDK to reap timeline events. This reduces the amount of
        // memory consumed as the JS SDK stores multiple distinct copies of room
        // state (each of which can be 10s of MBs) for each DISJOINT timeline. This is
        // particularly noticeable when there are lots of 'limited' /sync responses
        // such as when laptops unsleep.
        // https://github.com/vector-im/riot-web/issues/3307#issuecomment-282895568
        cli.setCanResetTimelineCallback(function(roomId) {
            console.log("Request to reset timeline in room ", roomId, " viewing:", self.state.currentRoomId);
            if (roomId !== self.state.currentRoomId) {
                // It is safe to remove events from rooms we are not viewing.
                return true;
            }
            // We are viewing the room which we want to reset. It is only safe to do
            // this if we are not scrolled up in the view. To find out, delegate to
            // the timeline panel. If the timeline panel doesn't exist, then we assume
            // it is safe to reset the timeline.
            if (!self._loggedInView || !self._loggedInView.child) {
                return true;
            }
            return self._loggedInView.child.canResetTimelineInRoom(roomId);
        });

        cli.on('sync', function(state, prevState) {
            // LifecycleStore and others cannot directly subscribe to matrix client for
            // events because flux only allows store state changes during flux dispatches.
            // So dispatch directly from here. Ideally we'd use a SyncStateStore that
            // would do this dispatch and expose the sync state itself (by listening to
            // its own dispatch).
            dis.dispatch({action: 'sync_state', prevState, state});
            self.updateStatusIndicator(state, prevState);
            if (state === "SYNCING" && prevState === "SYNCING") {
                return;
            }
            console.log("MatrixClient sync state => %s", state);
            if (state !== "PREPARED") { return; }

            self.firstSyncComplete = true;
            self.firstSyncPromise.resolve();

            dis.dispatch({action: 'focus_composer'});
            self.setState({ready: true});
        });
        cli.on('Call.incoming', function(call) {
            // we dispatch this synchronously to make sure that the event
            // handlers on the call are set up immediately (so that if
            // we get an immediate hangup, we don't get a stuck call)
            dis.dispatch({
                action: 'incoming_call',
                call: call,
            }, true);
        });
        cli.on('Session.logged_out', function(call) {
            const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
            Modal.createTrackedDialog('Signed out', '', ErrorDialog, {
                title: _t('Signed Out'),
                description: _t('For security, this session has been signed out. Please sign in again.'),
            });
            dis.dispatch({
                action: 'logout',
            });
        });
        cli.on("accountData", function(ev) {
            if (ev.getType() === 'im.vector.web.settings') {
                if (ev.getContent() && ev.getContent().theme) {
                    dis.dispatch({
                        action: 'set_theme',
                        value: ev.getContent().theme,
                    });
                }
            }
        });

        const krh = new KeyRequestHandler(cli);
        cli.on("crypto.roomKeyRequest", (req) => {
            krh.handleKeyRequest(req);
        });
        cli.on("crypto.roomKeyRequestCancellation", (req) => {
            krh.handleKeyRequestCancellation(req);
        });
        cli.on("Room", (room) => {
            if (MatrixClientPeg.get().isCryptoEnabled()) {
                const blacklistEnabled = SettingsStore.getValueAt(
                    SettingLevel.ROOM_DEVICE,
                    "blacklistUnverifiedDevices",
                    room.roomId,
                    /*explicit=*/true,
                );
                room.setBlacklistUnverifiedDevices(blacklistEnabled);
            }
        });
        cli.on("crypto.warning", (type) => {
            const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
            switch (type) {
                case 'CRYPTO_WARNING_ACCOUNT_MIGRATED':
                    Modal.createTrackedDialog('Crypto migrated', '', ErrorDialog, {
                        title: _t('Cryptography data migrated'),
                        description: _t(
                            "A one-off migration of cryptography data has been performed. "+
                            "End-to-end encryption will not work if you go back to an older "+
                            "version of Riot. If you need to use end-to-end cryptography on "+
                            "an older version, log out of Riot first. To retain message history, "+
                            "export and re-import your keys.",
                        ),
                    });
                    break;
                case 'CRYPTO_WARNING_OLD_VERSION_DETECTED':
                    Modal.createTrackedDialog('Crypto migrated', '', ErrorDialog, {
                        title: _t('Old cryptography data detected'),
                        description: _t(
                            "Data from an older version of Riot has been detected. "+
                            "This will have caused end-to-end cryptography to malfunction "+
                            "in the older version. End-to-end encrypted messages exchanged "+
                            "recently whilst using the older version may not be decryptable "+
                            "in this version. This may also cause messages exchanged with this "+
                            "version to fail. If you experience problems, log out and back in "+
                            "again. To retain message history, export and re-import your keys.",
                        ),
                    });
                    break;
            }
        });
    },

    /**
     * Called shortly after the matrix client has started. Useful for
     * setting up anything that requires the client to be started.
     * @private
     */
    _onClientStarted: function() {
        const cli = MatrixClientPeg.get();

        if (cli.isCryptoEnabled()) {
            const blacklistEnabled = SettingsStore.getValueAt(
                SettingLevel.DEVICE,
                "blacklistUnverifiedDevices",
            );
            cli.setGlobalBlacklistUnverifiedDevices(blacklistEnabled);
        }
    },

    showScreen: function(screen, params) {
        if (screen == 'register') {
            dis.dispatch({
                action: 'start_registration',
                params: params,
            });
        } else if (screen == 'login') {
            dis.dispatch({
                action: 'start_login',
                params: params,
            });
        } else if (screen == 'forgot_password') {
            dis.dispatch({
                action: 'start_password_recovery',
                params: params,
            });
        } else if (screen == 'new') {
            dis.dispatch({
                action: 'view_create_room',
            });
        } else if (screen == 'settings') {
            dis.dispatch({
                action: 'view_user_settings',
            });
        } else if (screen == 'home') {
            dis.dispatch({
                action: 'view_home_page',
            });
        } else if (screen == 'start') {
            this.showScreen('home');
            dis.dispatch({
                action: 'view_set_mxid',
            });
        } else if (screen == 'directory') {
            dis.dispatch({
                action: 'view_room_directory',
            });
        } else if (screen == 'groups') {
            dis.dispatch({
                action: 'view_my_groups',
            });
        } else if (screen == 'post_registration') {
            dis.dispatch({
                action: 'start_post_registration',
            });
        } else if (screen.indexOf('room/') == 0) {
            const segments = screen.substring(5).split('/');
            const roomString = segments[0];
            const eventId = segments[1]; // undefined if no event id given

            // FIXME: sort_out caseConsistency
            const thirdPartyInvite = {
                inviteSignUrl: params.signurl,
                invitedEmail: params.email,
            };
            const oobData = {
                name: params.room_name,
                avatarUrl: params.room_avatar_url,
                inviterName: params.inviter_name,
            };

            const payload = {
                action: 'view_room',
                event_id: eventId,
                // If an event ID is given in the URL hash, notify RoomViewStore to mark
                // it as highlighted, which will propagate to RoomView and highlight the
                // associated EventTile.
                highlighted: Boolean(eventId),
                third_party_invite: thirdPartyInvite,
                oob_data: oobData,
            };
            if (roomString[0] == '#') {
                payload.room_alias = roomString;
            } else {
                payload.room_id = roomString;
            }

            // we can't view a room unless we're logged in
            // (a guest account is fine)
            if (this.state.view === VIEWS.LOGGED_IN) {
                dis.dispatch(payload);
            }
        } else if (screen.indexOf('user/') == 0) {
            const userId = screen.substring(5);

            // Wait for the first sync so that `getRoom` gives us a room object if it's
            // in the sync response
            const waitFor = this.firstSyncPromise ?
                this.firstSyncPromise.promise : Promise.resolve();
            waitFor.then(() => {
                if (params.action === 'chat') {
                    this._chatCreateOrReuse(userId);
                    return;
                }

                this._setPage(PageTypes.UserView);
                this.notifyNewScreen('user/' + userId);
                const member = new Matrix.RoomMember(null, userId);
                dis.dispatch({
                    action: 'view_user',
                    member: member,
                });
            });
        } else if (screen.indexOf('group/') == 0) {
            const groupId = screen.substring(6);

            // TODO: Check valid group ID

            dis.dispatch({
                action: 'view_group',
                group_id: groupId,
            });
        } else {
            console.info("Ignoring showScreen for '%s'", screen);
        }
    },

    notifyNewScreen: function(screen) {
        if (this.props.onNewScreen) {
            this.props.onNewScreen(screen);
        }
        Analytics.trackPageChange();
    },

    onAliasClick: function(event, alias) {
        event.preventDefault();
        dis.dispatch({action: 'view_room', room_alias: alias});
    },

    onUserClick: function(event, userId) {
        event.preventDefault();

        const member = new Matrix.RoomMember(null, userId);
        if (!member) { return; }
        dis.dispatch({
            action: 'view_user',
            member: member,
        });
    },

    onGroupClick: function(event, groupId) {
        event.preventDefault();
        dis.dispatch({action: 'view_group', group_id: groupId});
    },

    onLogoutClick: function(event) {
        dis.dispatch({
            action: 'logout',
        });
        event.stopPropagation();
        event.preventDefault();
    },

    handleResize: function(e) {
        const hideLhsThreshold = 1000;
        const showLhsThreshold = 1000;
        const hideRhsThreshold = 820;
        const showRhsThreshold = 820;

        if (this._windowWidth > hideLhsThreshold && window.innerWidth <= hideLhsThreshold) {
            dis.dispatch({ action: 'hide_left_panel' });
        }
        if (this._windowWidth <= showLhsThreshold && window.innerWidth > showLhsThreshold) {
            dis.dispatch({ action: 'show_left_panel' });
        }
        if (this._windowWidth > hideRhsThreshold && window.innerWidth <= hideRhsThreshold) {
            dis.dispatch({ action: 'hide_right_panel' });
        }
        if (this._windowWidth <= showRhsThreshold && window.innerWidth > showRhsThreshold) {
            dis.dispatch({ action: 'show_right_panel' });
        }

        this._windowWidth = window.innerWidth;
    },

    onRoomCreated: function(roomId) {
        dis.dispatch({
            action: "view_room",
            room_id: roomId,
        });
    },

    onRegisterClick: function() {
        this.showScreen("register");
    },

    onLoginClick: function() {
        this.showScreen("login");
    },

    onForgotPasswordClick: function() {
        this.showScreen("forgot_password");
    },

    onReturnToAppClick: function() {
        // treat it the same as if the user had completed the login
        this._onLoggedIn(null);
    },

    // returns a promise which resolves to the new MatrixClient
    onRegistered: function(credentials, teamToken) {
        // XXX: These both should be in state or ideally store(s) because we risk not
        //      rendering the most up-to-date view of state otherwise.
        // teamToken may not be truthy
        this._teamToken = teamToken;
        this._is_registered = true;
        return Lifecycle.setLoggedIn(credentials);
    },

    onFinishPostRegistration: function() {
        // Don't confuse this with "PageType" which is the middle window to show
        this.setState({
            view: VIEWS.LOGGED_IN,
        });
        this.showScreen("settings");
    },

    onVersion: function(current, latest, releaseNotes) {
        this.setState({
            version: current,
            newVersion: latest,
            hasNewVersion: current !== latest,
            newVersionReleaseNotes: releaseNotes,
            checkingForUpdate: null,
        });
    },

    onSendEvent: function(roomId, event) {
        const cli = MatrixClientPeg.get();
        if (!cli) {
            dis.dispatch({action: 'message_send_failed'});
            return;
        }

        cli.sendEvent(roomId, event.getType(), event.getContent()).done(() => {
            dis.dispatch({action: 'message_sent'});
        }, (err) => {
            dis.dispatch({action: 'message_send_failed'});
        });
    },

    _setPageSubtitle: function(subtitle='') {
        document.title = `Riot ${subtitle}`;
    },

    updateStatusIndicator: function(state, prevState) {
        let notifCount = 0;

        const rooms = MatrixClientPeg.get().getRooms();
        for (let i = 0; i < rooms.length; ++i) {
            if (rooms[i].hasMembershipState(MatrixClientPeg.get().credentials.userId, 'invite')) {
                notifCount++;
            } else if (rooms[i].getUnreadNotificationCount()) {
                // if we were summing unread notifs:
                // notifCount += rooms[i].getUnreadNotificationCount();
                // instead, we just count the number of rooms with notifs.
                notifCount++;
            }
        }

        if (PlatformPeg.get()) {
            PlatformPeg.get().setErrorStatus(state === 'ERROR');
            PlatformPeg.get().setNotificationCount(notifCount);
        }

        let subtitle = '';
        if (state === "ERROR") {
            subtitle += `[${_t("Offline")}] `;
        }
        if (notifCount > 0) {
            subtitle += `[${notifCount}]`;
        }

        this._setPageSubtitle(subtitle);
    },

    onUserSettingsClose: function() {
        // XXX: use browser history instead to find the previous room?
        // or maintain a this.state.pageHistory in _setPage()?
        if (this.state.currentRoomId) {
            dis.dispatch({
                action: 'view_room',
                room_id: this.state.currentRoomId,
            });
        } else {
            dis.dispatch({
                action: 'view_home_page',
            });
        }
    },

    onServerConfigChange(config) {
        const newState = {};
        if (config.hsUrl) {
            newState.register_hs_url = config.hsUrl;
        }
        if (config.isUrl) {
            newState.register_is_url = config.isUrl;
        }
        this.setState(newState);
    },

    _makeRegistrationUrl: function(params) {
        if (this.props.startingFragmentQueryParams.referrer) {
            params.referrer = this.props.startingFragmentQueryParams.referrer;
        }
        return this.props.makeRegistrationUrl(params);
    },

    _collectLoggedInView: function(ref) {
        this._loggedInView = ref;
    },

    render: function() {
        // console.log(`Rendering MatrixChat with view ${this.state.view}`);

        if (this.state.view === VIEWS.LOADING || this.state.view === VIEWS.LOGGING_IN) {
            const Spinner = sdk.getComponent('elements.Spinner');
            return (
                <div className="mx_MatrixChat_splash">
                    <Spinner />
                </div>
            );
        }

        // needs to be before normal PageTypes as you are logged in technically
        if (this.state.view === VIEWS.POST_REGISTRATION) {
            const PostRegistration = sdk.getComponent('structures.login.PostRegistration');
            return (
                <PostRegistration
                    onComplete={this.onFinishPostRegistration} />
            );
        }

        if (this.state.view === VIEWS.LOGGED_IN) {
            // `ready` and `view==LOGGED_IN` may be set before `page_type` (because the
            // latter is set via the dispatcher). If we don't yet have a `page_type`,
            // keep showing the spinner for now.
            if (this.state.ready && this.state.page_type) {
                /* for now, we stuff the entirety of our props and state into the LoggedInView.
                 * we should go through and figure out what we actually need to pass down, as well
                 * as using something like redux to avoid having a billion bits of state kicking around.
                 */
                const LoggedInView = sdk.getComponent('structures.LoggedInView');
                return (
                   <LoggedInView ref={this._collectLoggedInView} matrixClient={MatrixClientPeg.get()}
                        onRoomCreated={this.onRoomCreated}
                        onUserSettingsClose={this.onUserSettingsClose}
                        onRegistered={this.onRegistered}
                        currentRoomId={this.state.currentRoomId}
                        teamToken={this._teamToken}
                        {...this.props}
                        {...this.state}
                    />
                );
            } else {
                // we think we are logged in, but are still waiting for the /sync to complete
                const Spinner = sdk.getComponent('elements.Spinner');
                return (
                    <div className="mx_MatrixChat_splash">
                        <Spinner />
                        <a href="#" className="mx_MatrixChat_splashButtons" onClick={this.onLogoutClick}>
                        { _t('Logout') }
                        </a>
                    </div>
                );
            }
        }

        if (this.state.view === VIEWS.REGISTER) {
            const Registration = sdk.getComponent('structures.login.Registration');
            return (
                <Registration
                    clientSecret={this.state.register_client_secret}
                    sessionId={this.state.register_session_id}
                    idSid={this.state.register_id_sid}
                    email={this.props.startingFragmentQueryParams.email}
                    referrer={this.props.startingFragmentQueryParams.referrer}
                    defaultHsUrl={this.getDefaultHsUrl()}
                    defaultIsUrl={this.getDefaultIsUrl()}
                    brand={this.props.config.brand}
                    teamServerConfig={this.props.config.teamServerConfig}
                    customHsUrl={this.getCurrentHsUrl()}
                    customIsUrl={this.getCurrentIsUrl()}
                    makeRegistrationUrl={this._makeRegistrationUrl}
                    defaultDeviceDisplayName={this.props.defaultDeviceDisplayName}
                    onLoggedIn={this.onRegistered}
                    onLoginClick={this.onLoginClick}
                    onRegisterClick={this.onRegisterClick}
                    onCancelClick={MatrixClientPeg.get() ? this.onReturnToAppClick : null}
                    onServerConfigChange={this.onServerConfigChange}
                    />
            );
        }


        if (this.state.view === VIEWS.FORGOT_PASSWORD) {
            const ForgotPassword = sdk.getComponent('structures.login.ForgotPassword');
            return (
                <ForgotPassword
                    defaultHsUrl={this.getDefaultHsUrl()}
                    defaultIsUrl={this.getDefaultIsUrl()}
                    customHsUrl={this.getCurrentHsUrl()}
                    customIsUrl={this.getCurrentIsUrl()}
                    onComplete={this.onLoginClick}
                    onRegisterClick={this.onRegisterClick}
                    onLoginClick={this.onLoginClick} />
            );
        }

        if (this.state.view === VIEWS.LOGIN) {
            const Login = sdk.getComponent('structures.login.Login');
            return (
                <Login
                    onLoggedIn={Lifecycle.setLoggedIn}
                    onRegisterClick={this.onRegisterClick}
                    defaultHsUrl={this.getDefaultHsUrl()}
                    defaultIsUrl={this.getDefaultIsUrl()}
                    customHsUrl={this.getCurrentHsUrl()}
                    customIsUrl={this.getCurrentIsUrl()}
                    fallbackHsUrl={this.getFallbackHsUrl()}
                    defaultDeviceDisplayName={this.props.defaultDeviceDisplayName}
                    onForgotPasswordClick={this.onForgotPasswordClick}
                    enableGuest={this.props.enableGuest}
                    onCancelClick={MatrixClientPeg.get() ? this.onReturnToAppClick : null}
                    onServerConfigChange={this.onServerConfigChange}
                />
            );
        }

        console.error(`Unknown view ${this.state.view}`);
    },
});
