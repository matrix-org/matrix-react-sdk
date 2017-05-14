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

import q from 'q';

var React = require('react');
import _t from 'counterpart';
var Matrix = require("matrix-js-sdk");
import request from 'browser-request';

var MatrixClientPeg = require("../../MatrixClientPeg");
var PlatformPeg = require("../../PlatformPeg");
var SdkConfig = require("../../SdkConfig");
var ContextualMenu = require("./ContextualMenu");
var RoomListSorter = require("../../RoomListSorter");
var UserActivity = require("../../UserActivity");
var Presence = require("../../Presence");
var dis = require("../../dispatcher");
import UserSettingsStore from '../../UserSettingsStore';

var Modal = require("../../Modal");
var Tinter = require("../../Tinter");
var sdk = require('../../index');
var Rooms = require('../../Rooms');
var linkifyMatrix = require("../../linkify-matrix");
var Lifecycle = require('../../Lifecycle');
var PageTypes = require('../../PageTypes');

var createRoom = require("../../createRoom");
import * as UDEHandler from '../../UnknownDeviceErrorHandler';

module.exports = React.createClass({
    displayName: 'MatrixChat',

    propTypes: {
        config: React.PropTypes.object,
        ConferenceHandler: React.PropTypes.any,
        onNewScreen: React.PropTypes.func,
        registrationUrl: React.PropTypes.string,
        enableGuest: React.PropTypes.bool,

        // the queryParams extracted from the [real] query-string of the URI
        realQueryParams: React.PropTypes.object,

        // the initial queryParams extracted from the hash-fragment of the URI
        startingFragmentQueryParams: React.PropTypes.object,

        // called when the session load completes
        onLoadCompleted: React.PropTypes.func,

        // Represents the screen to display as a result of parsing the initial
        // window.location
        initialScreenAfterLogin: React.PropTypes.shape({
            screen: React.PropTypes.string.isRequired,
            params: React.PropTypes.object,
        }),

        // displayname, if any, to set on the device when logging
        // in/registering.
        defaultDeviceDisplayName: React.PropTypes.string,

        // A function that makes a registration URL
        makeRegistrationUrl: React.PropTypes.func.isRequired,
    },

    childContextTypes: {
        appConfig: React.PropTypes.object,
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
        var s = {
            loading: true,
            screen: undefined,
            screenAfterLogin: this.props.initialScreenAfterLogin,

            // Stashed guest credentials if the user logs out
            // whilst logged in as a guest user (so they can change
            // their mind & log back in)
            guestCreds: null,

            // What the LoggedInView would be showing if visible
            page_type: null,

            // If we are viewing a room by alias, this contains the alias
            currentRoomAlias: null,

            // The ID of the room we're viewing. This is either populated directly
            // in the case where we view a room by ID or by RoomView when it resolves
            // what ID an alias points at.
            currentRoomId: null,

            // If we're trying to just view a user ID (i.e. /user URL), this is it
            viewUserId: null,

            loggedIn: false,
            loggingIn: false,
            collapse_lhs: false,
            collapse_rhs: false,
            ready: false,
            width: 10000,
            sideOpacity: 1.0,
            middleOpacity: 1.0,

            version: null,
            newVersion: null,
            hasNewVersion: false,
            newVersionReleaseNotes: null,

            // The username to default to when upgrading an account from a guest
            upgradeUsername: null,
            // The access token we had for our guest account, used when upgrading to a normal account
            guestAccessToken: null,

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
            onLoadCompleted: () => {},
        };
    },

    getCurrentHsUrl: function() {
        if (this.state.register_hs_url) {
            return this.state.register_hs_url;
        } else if (MatrixClientPeg.get()) {
            return MatrixClientPeg.get().getHomeserverUrl();
        }
        else if (window.localStorage && window.localStorage.getItem("mx_hs_url")) {
            return window.localStorage.getItem("mx_hs_url");
        }
        else {
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
        }
        else if (window.localStorage && window.localStorage.getItem("mx_is_url")) {
            return window.localStorage.getItem("mx_is_url");
        }
        else {
            return this.getDefaultIsUrl();
        }
    },

    getDefaultIsUrl() {
        return this.props.config.default_is_url || "https://vector.im";
    },

    componentWillMount: function() {
        SdkConfig.put(this.props.config);

        // Used by _viewRoom before getting state from sync
        this.firstSyncComplete = false;
        this.firstSyncPromise = q.defer();

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
    },

    componentDidMount: function() {
        this.dispatcherRef = dis.register(this.onAction);
        UDEHandler.startListening();

        this.focusComposer = false;
        window.addEventListener("focus", this.onFocus);

        // this can technically be done anywhere but doing this here keeps all
        // the routing url path logic together.
        if (this.onAliasClick) {
            linkifyMatrix.onAliasClick = this.onAliasClick;
        }
        if (this.onUserClick) {
            linkifyMatrix.onUserClick = this.onUserClick;
        }

        window.addEventListener('resize', this.handleResize);
        this.handleResize();

        if (this.props.config.teamServerConfig &&
            this.props.config.teamServerConfig.teamServerURL
        ) {
            Lifecycle.initRtsClient(this.props.config.teamServerConfig.teamServerURL);
        }

        // the extra q() ensures that synchronous exceptions hit the same codepath as
        // asynchronous ones.
        q().then(() => {
            return Lifecycle.loadSession({
                realQueryParams: this.props.realQueryParams,
                fragmentQueryParams: this.props.startingFragmentQueryParams,
                enableGuest: this.props.enableGuest,
                guestHsUrl: this.getCurrentHsUrl(),
                guestIsUrl: this.getCurrentIsUrl(),
                defaultDeviceDisplayName: this.props.defaultDeviceDisplayName,
            });
        }).catch((e) => {
            console.error("Unable to load session", e);
        }).done(()=>{
            // stuff this through the dispatcher so that it happens
            // after the on_logged_in action.
            dis.dispatch({action: 'load_completed'});
        });
    },

    componentWillUnmount: function() {
        Lifecycle.stopMatrixClient();
        dis.unregister(this.dispatcherRef);
        UDEHandler.stopListening();
        window.removeEventListener("focus", this.onFocus);
        window.removeEventListener('resize', this.handleResize);
    },

    componentDidUpdate: function() {
        if (this.focusComposer) {
            dis.dispatch({action: 'focus_composer'});
            this.focusComposer = false;
        }
    },

    setStateForNewScreen: function(state) {
        const newState = {
            screen: undefined,
            viewUserId: null,
            loggedIn: false,
            ready: false,
            upgradeUsername: null,
            guestAccessToken: null,
       };
       Object.assign(newState, state);
       this.setState(newState);
    },

    onAction: function(payload) {
        const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
        const QuestionDialog = sdk.getComponent("dialogs.QuestionDialog");
        var roomIndexDelta = 1;

        var self = this;
        switch (payload.action) {
            case 'logout':
                Lifecycle.logout();
                break;
            case 'start_registration':
                const params = payload.params || {};
                this.setStateForNewScreen({
                    screen: 'register',
                    // these params may be undefined, but if they are,
                    // unset them from our state: we don't want to
                    // resume a previous registration session if the
                    // user just clicked 'register'
                    register_client_secret: params.client_secret,
                    register_session_id: params.session_id,
                    register_hs_url: params.hs_url,
                    register_is_url: params.is_url,
                    register_id_sid: params.sid,
                });
                this.notifyNewScreen('register');
                break;
            case 'start_login':
                if (MatrixClientPeg.get() &&
                    MatrixClientPeg.get().isGuest()
                ) {
                    this.setState({
                        guestCreds: MatrixClientPeg.getCredentials(),
                    });
                }
                this.setStateForNewScreen({
                    screen: 'login',
                });
                this.notifyNewScreen('login');
                break;
            case 'start_post_registration':
                this.setState({ // don't clobber loggedIn status
                    screen: 'post_registration'
                });
                break;
            case 'start_upgrade_registration':
                // also stash our credentials, then if we restore the session,
                // we can just do it the same way whether we started upgrade
                // registration or explicitly logged out
                this.setStateForNewScreen({
                    guestCreds: MatrixClientPeg.getCredentials(),
                    screen: "register",
                    upgradeUsername: MatrixClientPeg.get().getUserIdLocalpart(),
                    guestAccessToken: MatrixClientPeg.get().getAccessToken(),
                });

                // stop the client: if we are syncing whilst the registration
                // is completed in another browser, we'll be 401ed for using
                // a guest access token for a non-guest account.
                // It will be restarted in onReturnToGuestClick
                Lifecycle.stopMatrixClient();

                this.notifyNewScreen('register');
                break;
            case 'start_password_recovery':
                if (this.state.loggedIn) return;
                this.setStateForNewScreen({
                    screen: 'forgot_password',
                });
                this.notifyNewScreen('forgot_password');
                break;
            case 'leave_room':
                const roomToLeave = MatrixClientPeg.get().getRoom(payload.room_id);
                Modal.createDialog(QuestionDialog, {
                    title: _t('Leave room'),
                    description: _t('Are you sure you want to leave the room %(RoomName)s?', {RoomName: roomToLeave.name}),
                    button: "OK",
                    onFinished: (should_leave) => {
                        if (should_leave) {
                            const d = MatrixClientPeg.get().leave(payload.room_id);

                            // FIXME: controller shouldn't be loading a view :(
                            const Loader = sdk.getComponent("elements.Spinner");
                            const modal = Modal.createDialog(Loader, null, 'mx_Dialog_spinner');

                            d.then(() => {
                                modal.close();
                                if (this.currentRoomId === payload.room_id) {
                                    dis.dispatch({action: 'view_next_room'});
                                }
                            }, (err) => {
                                modal.close();
                                console.error("Failed to leave room " + payload.room_id + " " + err);
                                Modal.createDialog(ErrorDialog, {
                                    title: _t('Failed to leave room'),
                                    description: (err && err.message ? err.message : _t('Server may be unavailable, overloaded, or you hit a bug') + '.'),
                                    button: _t("OK"),
                                });
                            });
                        }
                    }
                });
                break;
            case 'reject_invite':
                Modal.createDialog(QuestionDialog, {
                    title: _t('Reject invitation'),
                    description: _t('Are you sure you want to reject the invitation?'),
                    button: "OK",
                    onFinished: (confirm) => {
                        if (confirm) {
                            // FIXME: controller shouldn't be loading a view :(
                            const Loader = sdk.getComponent("elements.Spinner");
                            const modal = Modal.createDialog(Loader, null, 'mx_Dialog_spinner');

                            MatrixClientPeg.get().leave(payload.room_id).done(() => {
                                modal.close();
                                if (this.currentRoomId === payload.room_id) {
                                    dis.dispatch({action: 'view_next_room'});
                                }
                            }, (err) => {
                                modal.close();
                                Modal.createDialog(ErrorDialog, {
                                    title:  _t('Failed to reject invitation'),
                                    description: err.toString(),
                                    button: _t("OK"),
                                });
                            });
                        }
                    }
                });
                break;
            case 'view_user':
                // FIXME: ugly hack to expand the RightPanel and then re-dispatch.
                if (this.state.collapse_rhs) {
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
                roomIndexDelta = -1;
            case 'view_next_room':
                var allRooms = RoomListSorter.mostRecentActivityFirst(
                    MatrixClientPeg.get().getRooms()
                );
                var roomIndex = -1;
                for (var i = 0; i < allRooms.length; ++i) {
                    if (allRooms[i].roomId == this.state.currentRoomId) {
                        roomIndex = i;
                        break;
                    }
                }
                roomIndex = (roomIndex + roomIndexDelta) % allRooms.length;
                if (roomIndex < 0) roomIndex = allRooms.length - 1;
                this._viewRoom({ room_id: allRooms[roomIndex].roomId });
                break;
            case 'view_indexed_room':
                var allRooms = RoomListSorter.mostRecentActivityFirst(
                    MatrixClientPeg.get().getRooms()
                );
                var roomIndex = payload.roomIndex;
                if (allRooms[roomIndex]) {
                    this._viewRoom({ room_id: allRooms[roomIndex].roomId });
                }
                break;
            case 'view_user_settings':
                this._setPage(PageTypes.UserSettings);
                this.notifyNewScreen('settings');
                break;
            case 'view_create_room':
                //this._setPage(PageTypes.CreateRoom);
                //this.notifyNewScreen('new');

                var TextInputDialog = sdk.getComponent("dialogs.TextInputDialog");
                Modal.createDialog(TextInputDialog, {
                    title: _t('Create Room'),
                    description: _t('Room name (optional)'),
                    button: _t('Create Room'),
                    onFinished: (should_create, name) => {
                        if (should_create) {
                            const createOpts = {};
                            if (name) createOpts.name = name;
                            createRoom({createOpts}).done();
                        }
                    }
                });
                break;
            case 'view_room_directory':
                this._setPage(PageTypes.RoomDirectory);
                this.notifyNewScreen('directory');
                break;
            case 'view_home_page':
                if (!this._teamToken) {
                    dis.dispatch({action: 'view_room_directory'});
                    return;
                }
                this._setPage(PageTypes.HomePage);
                this.notifyNewScreen('home');
                break;
            case 'view_create_chat':
                this._createChat();
                break;
            case 'view_invite':
                this._invite(payload.roomId);
                break;
            case 'notifier_enabled':
                this.forceUpdate();
                break;
            case 'hide_left_panel':
                this.setState({
                    collapse_lhs: true,
                });
                break;
            case 'show_left_panel':
                this.setState({
                    collapse_lhs: false,
                });
                break;
            case 'hide_right_panel':
                this.setState({
                    collapse_rhs: true,
                });
                break;
            case 'show_right_panel':
                this.setState({
                    collapse_rhs: false,
                });
                break;
            case 'ui_opacity':
                this.setState({
                    sideOpacity: payload.sideOpacity,
                    middleOpacity: payload.middleOpacity,
                });
                break;
            case 'set_theme':
                this._onSetTheme(payload.value);
                break;
            case 'on_logging_in':
                this.setState({loggingIn: true});
                break;
            case 'on_logged_in':
                this._onLoggedIn(payload.teamToken);
                break;
            case 'on_logged_out':
                this._onLoggedOut();
                break;
            case 'will_start_client':
                this._onWillStartClient();
                break;
            case 'load_completed':
                this._onLoadCompleted();
                break;
            case 'new_version':
                this.onVersion(
                    payload.currentVersion, payload.newVersion,
                    payload.releaseNotes
                );
                break;
        }
    },

    _setPage: function(pageType) {
        this.setState({
            page_type: pageType,
        });
    },

    // switch view to the given room
    //
    // @param {Object} room_info Object containing data about the room to be joined
    // @param {string=} room_info.room_id ID of the room to join. One of room_id or room_alias must be given.
    // @param {string=} room_info.room_alias Alias of the room to join. One of room_id or room_alias must be given.
    // @param {boolean=} room_info.auto_join If true, automatically attempt to join the room if not already a member.
    // @param {boolean=} room_info.show_settings Makes RoomView show the room settings dialog.
    // @param {string=} room_info.event_id ID of the event in this room to show: this will cause a switch to the
    //                                    context of that particular event.
    // @param {Object=} room_info.third_party_invite Object containing data about the third party
    //                                    we received to join the room, if any.
    // @param {string=} room_info.third_party_invite.inviteSignUrl 3pid invite sign URL
    // @param {string=} room_info.third_party_invite.invitedEmail The email address the invite was sent to
    // @param {Object=} room_info.oob_data Object of additional data about the room
    //                               that has been passed out-of-band (eg.
    //                               room name and avatar from an invite email)
    _viewRoom: function(room_info) {
        this.focusComposer = true;

        var newState = {
            initialEventId: room_info.event_id,
            highlightedEventId: room_info.event_id,
            initialEventPixelOffset: undefined,
            page_type: PageTypes.RoomView,
            thirdPartyInvite: room_info.third_party_invite,
            roomOobData: room_info.oob_data,
            currentRoomAlias: room_info.room_alias,
            autoJoin: room_info.auto_join,
        };

        if (!room_info.room_alias) {
            newState.currentRoomId = room_info.room_id;
        }

        // if we aren't given an explicit event id, look for one in the
        // scrollStateMap.
        //
        // TODO: do this in RoomView rather than here
        if (!room_info.event_id && this.refs.loggedInView) {
            var scrollState = this.refs.loggedInView.getScrollStateForRoom(room_info.room_id);
            if (scrollState) {
                newState.initialEventId = scrollState.focussedEvent;
                newState.initialEventPixelOffset = scrollState.pixelOffset;
            }
        }

        // Wait for the first sync to complete so that if a room does have an alias,
        // it would have been retrieved.
        let waitFor = q(null);
        if (!this.firstSyncComplete) {
            if (!this.firstSyncPromise) {
                console.warn('Cannot view a room before first sync. room_id:', room_info.room_id);
                return;
            }
            waitFor = this.firstSyncPromise.promise;
        }

        waitFor.done(() => {
            let presentedId = room_info.room_alias || room_info.room_id;
            const room = MatrixClientPeg.get().getRoom(room_info.room_id);
            if (room) {
                const theAlias = Rooms.getDisplayAliasForRoom(room);
                if (theAlias) presentedId = theAlias;

                // Store this as the ID of the last room accessed. This is so that we can
                // persist which room is being stored across refreshes and browser quits.
                if (localStorage) {
                    localStorage.setItem('mx_last_room_id', room.roomId);
                }
            }

            if (room_info.event_id) {
                presentedId += "/" + room_info.event_id;
            }
            this.notifyNewScreen('room/' + presentedId);
            newState.ready = true;
            this.setState(newState);
        });
    },

    _createChat: function() {
        var ChatInviteDialog = sdk.getComponent("dialogs.ChatInviteDialog");
        Modal.createDialog(ChatInviteDialog, {
            title: _t('Start a chat'),
            description: _t("Who would you like to communicate with?"),
            placeholder: _t("Email, name or matrix ID"),
            button: _t("Start Chat")
        });
    },

    _invite: function(roomId) {
        var ChatInviteDialog = sdk.getComponent("dialogs.ChatInviteDialog");
        Modal.createDialog(ChatInviteDialog, {
            title: _t('Invite new room members'),
            description: _t('Who would you like to add to this room?'),
            button: _t('Send Invites'),
            placeholder: _t("Email, name or matrix ID"),
            roomId: roomId,
        });
    },

    /**
     * Called when the sessionloader has finished
     */
    _onLoadCompleted: function() {
        this.props.onLoadCompleted();
        this.setState({loading: false});

        // Show screens (like 'register') that need to be shown without _onLoggedIn
        // being called. 'register' needs to be routed here when the email confirmation
        // link is clicked on.
        if (this.state.screenAfterLogin &&
            ['register'].indexOf(this.state.screenAfterLogin.screen) !== -1) {
            this._showScreenAfterLogin();
        }
    },

    /**
     * Called whenever someone changes the theme
     */
    _onSetTheme: function(theme) {
        if (!theme) {
            theme = 'light';
        }

        // look for the stylesheet elements.
        // styleElements is a map from style name to HTMLLinkElement.
        var styleElements = Object.create(null);
        var i, a;
        for (i = 0; (a = document.getElementsByTagName("link")[i]); i++) {
            var href = a.getAttribute("href");
            // shouldn't we be using the 'title' tag rather than the href?
            var match = href.match(/^bundles\/.*\/theme-(.*)\.css$/);
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

        Object.values(styleElements).forEach((a) => {
            a.disabled = true;
        });
        styleElements[theme].disabled = false;

        if (theme === 'dark') {
            // abuse the tinter to change all the SVG's #fff to #2d2d2d
            // XXX: obviously this shouldn't be hardcoded here.
            Tinter.tintSvgWhite('#2d2d2d');
        }
        else {
            Tinter.tintSvgWhite('#ffffff');
        }
    },

    /**
     * Called when a new logged in session has started
     */
    _onLoggedIn: function(teamToken) {
        this.setState({
            guestCreds: null,
            loggedIn: true,
            loggingIn: false,
        });

        if (teamToken) {
            // A team member has logged in, not a guest
            this._teamToken = teamToken;
            dis.dispatch({action: 'view_home_page'});
        } else if (this._is_registered) {
            // The user has just logged in after registering
            dis.dispatch({action: 'view_user_settings'});
        } else {
            this._showScreenAfterLogin();
        }
    },

    _showScreenAfterLogin: function() {
        // If screenAfterLogin is set, use that, then null it so that a second login will
        // result in view_home_page, _user_settings or _room_directory
        if (this.state.screenAfterLogin && this.state.screenAfterLogin.screen) {
            this.showScreen(
                this.state.screenAfterLogin.screen,
                this.state.screenAfterLogin.params
            );
            this.notifyNewScreen(this.state.screenAfterLogin.screen);
            this.setState({screenAfterLogin: null});
        } else if (localStorage && localStorage.getItem('mx_last_room_id')) {
            // Before defaulting to directory, show the last viewed room
            dis.dispatch({
                action: 'view_room',
                room_id: localStorage.getItem('mx_last_room_id'),
            });
        } else if (this._teamToken) {
            // Team token might be set if we're a guest.
            // Guests do not call _onLoggedIn with a teamToken
            dis.dispatch({action: 'view_home_page'});
        } else {
            dis.dispatch({action: 'view_room_directory'});
        }
    },

    /**
     * Called when the session is logged out
     */
    _onLoggedOut: function() {
        this.notifyNewScreen('login');
        this.setStateForNewScreen({
            loggedIn: false,
            ready: false,
            collapse_lhs: false,
            collapse_rhs: false,
            currentRoomAlias: null,
            currentRoomId: null,
            page_type: PageTypes.RoomDirectory,
        });
        this._teamToken = null;
    },

    /**
     * Called just before the matrix client is started
     * (useful for setting listeners)
     */
    _onWillStartClient() {
        var self = this;
        var cli = MatrixClientPeg.get();

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
            if (!self.refs.loggedInView) {
                return true;
            }
            return self.refs.loggedInView.canResetTimelineInRoom(roomId);
        });

        cli.on('sync', function(state, prevState) {
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
            dis.dispatch({
                action: 'incoming_call',
                call: call
            });
        });
        cli.on('Session.logged_out', function(call) {
            var ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
            Modal.createDialog(ErrorDialog, {
                title: _t('Signed Out'),
                description: _t('For security, this session has been signed out. Please sign in again.'),
                button: _t("OK"),
            });
            dis.dispatch({
                action: 'logout'
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
    },

    onFocus: function(ev) {
        dis.dispatch({action: 'focus_composer'});
    },

    showScreen: function(screen, params) {
        if (screen == 'register') {
            dis.dispatch({
                action: 'start_registration',
                params: params
            });
        } else if (screen == 'login') {
            dis.dispatch({
                action: 'start_login',
                params: params
            });
        } else if (screen == 'forgot_password') {
            dis.dispatch({
                action: 'start_password_recovery',
                params: params
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
        } else if (screen == 'directory') {
            dis.dispatch({
                action: 'view_room_directory',
            });
        } else if (screen == 'post_registration') {
            dis.dispatch({
                action: 'start_post_registration',
            });
        } else if (screen.indexOf('room/') == 0) {
            var segments = screen.substring(5).split('/');
            var roomString = segments[0];
            var eventId = segments[1]; // undefined if no event id given

            // FIXME: sort_out caseConsistency
            var third_party_invite = {
                inviteSignUrl: params.signurl,
                invitedEmail: params.email,
            };
            var oob_data = {
                name: params.room_name,
                avatarUrl: params.room_avatar_url,
                inviterName: params.inviter_name,
            };

            var payload = {
                action: 'view_room',
                event_id: eventId,
                third_party_invite: third_party_invite,
                oob_data: oob_data,
            };
            if (roomString[0] == '#') {
                payload.room_alias = roomString;
            } else {
                payload.room_id = roomString;
            }

            // we can't view a room unless we're logged in
            // (a guest account is fine)
            if (this.state.loggedIn) {
                dis.dispatch(payload);
            }
        } else if (screen.indexOf('user/') == 0) {
            var userId = screen.substring(5);
            this.setState({ viewUserId: userId });
            this._setPage(PageTypes.UserView);
            this.notifyNewScreen('user/' + userId);
            var member = new Matrix.RoomMember(null, userId);
            if (member) {
                dis.dispatch({
                    action: 'view_user',
                    member: member,
                });
            }
        }
        else {
            console.info("Ignoring showScreen for '%s'", screen);
        }
    },

    notifyNewScreen: function(screen) {
        if (this.props.onNewScreen) {
            this.props.onNewScreen(screen);
        }
    },

    onAliasClick: function(event, alias) {
        event.preventDefault();
        dis.dispatch({action: 'view_room', room_alias: alias});
    },

    onUserClick: function(event, userId) {
        event.preventDefault();

        var member = new Matrix.RoomMember(null, userId);
        if (!member) { return; }
        dis.dispatch({
            action: 'view_user',
            member: member,
        });
    },

    onLogoutClick: function(event) {
        dis.dispatch({
            action: 'logout'
        });
        event.stopPropagation();
        event.preventDefault();
    },

    handleResize: function(e) {
        var hideLhsThreshold = 1000;
        var showLhsThreshold = 1000;
        var hideRhsThreshold = 820;
        var showRhsThreshold = 820;

        if (this.state.width > hideLhsThreshold && window.innerWidth <= hideLhsThreshold) {
            dis.dispatch({ action: 'hide_left_panel' });
        }
        if (this.state.width <= showLhsThreshold && window.innerWidth > showLhsThreshold) {
            dis.dispatch({ action: 'show_left_panel' });
        }
        if (this.state.width > hideRhsThreshold && window.innerWidth <= hideRhsThreshold) {
            dis.dispatch({ action: 'hide_right_panel' });
        }
        if (this.state.width <= showRhsThreshold && window.innerWidth > showRhsThreshold) {
            dis.dispatch({ action: 'show_right_panel' });
        }

        this.setState({width: window.innerWidth});
    },

    onRoomCreated: function(room_id) {
        dis.dispatch({
            action: "view_room",
            room_id: room_id,
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

    onReturnToGuestClick: function() {
        // reanimate our guest login
        if (this.state.guestCreds) {
            Lifecycle.setLoggedIn(this.state.guestCreds);
            this.setState({guestCreds: null});
        }
    },

    onRegistered: function(credentials, teamToken) {
        // teamToken may not be truthy
        this._teamToken = teamToken;
        this._is_registered = true;
        Lifecycle.setLoggedIn(credentials);
    },

    onFinishPostRegistration: function() {
        // Don't confuse this with "PageType" which is the middle window to show
        this.setState({
            screen: undefined
        });
        this.showScreen("settings");
    },

    onVersion: function(current, latest, releaseNotes) {
        this.setState({
            version: current,
            newVersion: latest,
            hasNewVersion: current !== latest,
            newVersionReleaseNotes: releaseNotes,
        });
    },

    updateStatusIndicator: function(state, prevState) {
        var notifCount = 0;

        var rooms = MatrixClientPeg.get().getRooms();
        for (var i = 0; i < rooms.length; ++i) {
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

        document.title = `Riot ${state === "ERROR" ? " [offline]" : ""}${notifCount > 0 ? ` [${notifCount}]` : ""}`;
    },

    onUserSettingsClose: function() {
        // XXX: use browser history instead to find the previous room?
        // or maintain a this.state.pageHistory in _setPage()?
        if (this.state.currentRoomId) {
            dis.dispatch({
                action: 'view_room',
                room_id: this.state.currentRoomId,
            });
        }
        else {
            dis.dispatch({
                action: 'view_room_directory',
            });
        }
    },

    onRoomIdResolved: function(room_id) {
        // It's the RoomView's resposibility to look up room aliases, but we need the
        // ID to pass into things like the Member List, so the Room View tells us when
        // its done that resolution so we can display things that take a room ID.
        this.setState({currentRoomId: room_id});
    },

    _makeRegistrationUrl: function(params) {
        if (this.props.startingFragmentQueryParams.referrer) {
            params.referrer = this.props.startingFragmentQueryParams.referrer;
        }
        return this.props.makeRegistrationUrl(params);
    },

    render: function() {
        // `loading` might be set to false before `loggedIn = true`, causing the default
        // (`<Login>`) to be visible for a few MS (say, whilst a request is in-flight to
        // the RTS). So in the meantime, use `loggingIn`, which is true between
        // actions `on_logging_in` and `on_logged_in`.
        if (this.state.loading || this.state.loggingIn) {
            const Spinner = sdk.getComponent('elements.Spinner');
            return (
                <div className="mx_MatrixChat_splash">
                    <Spinner />
                </div>
            );
        }
        // needs to be before normal PageTypes as you are logged in technically
        else if (this.state.screen == 'post_registration') {
            const PostRegistration = sdk.getComponent('structures.login.PostRegistration');
            return (
                <PostRegistration
                    onComplete={this.onFinishPostRegistration} />
            );
        } else if (this.state.loggedIn && this.state.ready) {
            /* for now, we stuff the entirety of our props and state into the LoggedInView.
             * we should go through and figure out what we actually need to pass down, as well
             * as using something like redux to avoid having a billion bits of state kicking around.
             */
            const LoggedInView = sdk.getComponent('structures.LoggedInView');
            return (
               <LoggedInView ref="loggedInView" matrixClient={MatrixClientPeg.get()}
                    onRoomIdResolved={this.onRoomIdResolved}
                    onRoomCreated={this.onRoomCreated}
                    onUserSettingsClose={this.onUserSettingsClose}
                    teamToken={this._teamToken}
                    {...this.props}
                    {...this.state}
                />
            );
        } else if (this.state.loggedIn) {
            // we think we are logged in, but are still waiting for the /sync to complete
            const Spinner = sdk.getComponent('elements.Spinner');
            return (
                <div className="mx_MatrixChat_splash">
                    <Spinner />
                    <a href="#" className="mx_MatrixChat_splashButtons" onClick={ this.onLogoutClick }>
                    { _t('Logout') }
                    </a>
                </div>
            );
        } else if (this.state.screen == 'register') {
            const Registration = sdk.getComponent('structures.login.Registration');
            return (
                <Registration
                    clientSecret={this.state.register_client_secret}
                    sessionId={this.state.register_session_id}
                    idSid={this.state.register_id_sid}
                    email={this.props.startingFragmentQueryParams.email}
                    referrer={this.props.startingFragmentQueryParams.referrer}
                    username={this.state.upgradeUsername}
                    guestAccessToken={this.state.guestAccessToken}
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
                    onCancelClick={this.state.guestCreds ? this.onReturnToGuestClick : null}
                    />
            );
        } else if (this.state.screen == 'forgot_password') {
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
        } else {
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
                    onCancelClick={this.state.guestCreds ? this.onReturnToGuestClick : null}
                />
            );
        }
    }
});
