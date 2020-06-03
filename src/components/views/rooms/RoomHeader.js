/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2019 The Matrix.org Foundation C.I.C.

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

import React, {createRef} from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import classNames from 'classnames';
import * as sdk from '../../../index';
import { _t } from '../../../languageHandler';
import {MatrixClientPeg} from '../../../MatrixClientPeg';
import Modal from "../../../Modal";
import RateLimitedFunc from '../../../ratelimitedfunc';

import { linkifyElement } from '../../../HtmlUtils';
import AccessibleButton from '../elements/AccessibleButton';
import ManageIntegsButton from '../elements/ManageIntegsButton';
import {CancelButton} from './SimpleRoomHeader';
import SettingsStore from "../../../settings/SettingsStore";
import RoomHeaderButtons from '../right_panel/RoomHeaderButtons';
import DMRoomMap from '../../../utils/DMRoomMap';
import E2EIcon from './E2EIcon';
import InviteOnlyIcon from './InviteOnlyIcon';

export default createReactClass({
    displayName: 'RoomHeader',

    propTypes: {
        room: PropTypes.object,
        oobData: PropTypes.object,
        inRoom: PropTypes.bool,
        onSettingsClick: PropTypes.func,
        onPinnedClick: PropTypes.func,
        onSearchClick: PropTypes.func,
        onLeaveClick: PropTypes.func,
        onCancelClick: PropTypes.func,
        e2eStatus: PropTypes.string,
    },

    getDefaultProps: function() {
        return {
            editing: false,
            inRoom: false,
            onCancelClick: null,
        };
    },

    // TODO: [REACT-WARNING] Replace component with real class, use constructor for refs
    UNSAFE_componentWillMount: function() {
        this._topic = createRef();
    },

    componentDidMount: function() {
        const cli = MatrixClientPeg.get();
        cli.on("RoomState.events", this._onRoomStateEvents);
        cli.on("Room.accountData", this._onRoomAccountData);

        // When a room name occurs, RoomState.events is fired *before*
        // room.name is updated. So we have to listen to Room.name as well as
        // RoomState.events.
        if (this.props.room) {
            this.props.room.on("Room.name", this._onRoomNameChange);
        }
    },

    componentDidUpdate: function() {
        if (this._topic.current) {
            linkifyElement(this._topic.current);
        }
    },

    componentWillUnmount: function() {
        if (this.props.room) {
            this.props.room.removeListener("Room.name", this._onRoomNameChange);
        }
        const cli = MatrixClientPeg.get();
        if (cli) {
            cli.removeListener("RoomState.events", this._onRoomStateEvents);
            cli.removeListener("Room.accountData", this._onRoomAccountData);
        }
    },

    _onRoomStateEvents: function(event, state) {
        if (!this.props.room || event.getRoomId() !== this.props.room.roomId) {
            return;
        }

        // redisplay the room name, topic, etc.
        this._rateLimitedUpdate();
    },

    _onRoomAccountData: function(event, room) {
        if (!this.props.room || room.roomId !== this.props.room.roomId) return;
        if (event.getType() !== "im.vector.room.read_pins") return;

        this._rateLimitedUpdate();
    },

    _rateLimitedUpdate: new RateLimitedFunc(function() {
        /* eslint-disable babel/no-invalid-this */
        this.forceUpdate();
    }, 500),

    _onRoomNameChange: function(room) {
        this.forceUpdate();
    },

    onShareRoomClick: function(ev) {
        const ShareDialog = sdk.getComponent("dialogs.ShareDialog");
        Modal.createTrackedDialog('share room dialog', '', ShareDialog, {
            target: this.props.room,
        });
    },

    _hasUnreadPins: function() {
        const currentPinEvent = this.props.room.currentState.getStateEvents("m.room.pinned_events", '');
        if (!currentPinEvent) return false;
        if (currentPinEvent.getContent().pinned && currentPinEvent.getContent().pinned.length <= 0) {
            return false; // no pins == nothing to read
        }

        const readPinsEvent = this.props.room.getAccountData("im.vector.room.read_pins");
        if (readPinsEvent && readPinsEvent.getContent()) {
            const readStateEvents = readPinsEvent.getContent().event_ids || [];
            if (readStateEvents) {
                return !readStateEvents.includes(currentPinEvent.getId());
            }
        }

        // There's pins, and we haven't read any of them
        return true;
    },

    _hasPins: function() {
        const currentPinEvent = this.props.room.currentState.getStateEvents("m.room.pinned_events", '');
        if (!currentPinEvent) return false;

        return !(currentPinEvent.getContent().pinned && currentPinEvent.getContent().pinned.length <= 0);
    },

    render: function() {
        const RoomAvatar = sdk.getComponent("avatars.RoomAvatar");

        let searchStatus = null;
        let cancelButton = null;
        let settingsButton = null;
        let pinnedEventsButton = null;

        const e2eIcon = this.props.e2eStatus ?
            <E2EIcon status={this.props.e2eStatus} /> :
            undefined;

        const dmUserId = DMRoomMap.shared().getUserIdForRoomId(this.props.room.roomId);
        const joinRules = this.props.room && this.props.room.currentState.getStateEvents("m.room.join_rules", "");
        const joinRule = joinRules && joinRules.getContent().join_rule;
        let privateIcon;
        // Don't show an invite-only icon for DMs. Users know they're invite-only.
        if (!dmUserId && joinRule === "invite") {
            privateIcon = <InviteOnlyIcon />;
        }

        if (this.props.onCancelClick) {
            cancelButton = <CancelButton onClick={this.props.onCancelClick} />;
        }

        // don't display the search count until the search completes and
        // gives us a valid (possibly zero) searchCount.
        if (this.props.searchInfo &&
            this.props.searchInfo.searchCount !== undefined &&
            this.props.searchInfo.searchCount !== null) {
            searchStatus = <div className="mx_RoomHeader_searchStatus">&nbsp;
                { _t("(~%(count)s results)", { count: this.props.searchInfo.searchCount }) }
            </div>;
        }

        // XXX: this is a bit inefficient - we could just compare room.name for 'Empty room'...
        let settingsHint = false;
        const members = this.props.room ? this.props.room.getJoinedMembers() : undefined;
        if (members) {
            if (members.length === 1 && members[0].userId === MatrixClientPeg.get().credentials.userId) {
                const nameEvent = this.props.room.currentState.getStateEvents('m.room.name', '');
                if (!nameEvent || !nameEvent.getContent().name) {
                    settingsHint = true;
                }
            }
        }

        let roomName = _t("Join Room");
        if (this.props.oobData && this.props.oobData.name) {
            roomName = this.props.oobData.name;
        } else if (this.props.room) {
            roomName = this.props.room.name;
        }

        const textClasses = classNames('mx_RoomHeader_nametext', { mx_RoomHeader_settingsHint: settingsHint });
        const name =
            <div className="mx_RoomHeader_name" onClick={this.props.onSettingsClick}>
                <div dir="auto" className={textClasses} title={roomName}>{ roomName }</div>
                { searchStatus }
            </div>;

        let topic;
        if (this.props.room) {
            const ev = this.props.room.currentState.getStateEvents('m.room.topic', '');
            if (ev) {
                topic = ev.getContent().topic;
            }
        }
        const topicElement =
            <div className="mx_RoomHeader_topic" ref={this._topic} title={topic} dir="auto">{ topic }</div>;
        const avatarSize = 28;
        let roomAvatar;
        if (this.props.room) {
            roomAvatar = (<RoomAvatar
                room={this.props.room}
                width={avatarSize}
                height={avatarSize}
                oobData={this.props.oobData}
                viewAvatarOnClick={true} />);
        }

        if (this.props.onSettingsClick) {
            settingsButton =
                <AccessibleButton className="mx_RoomHeader_button mx_RoomHeader_settingsButton"
                    onClick={this.props.onSettingsClick}
                    title={_t("Settings")}
                >
                </AccessibleButton>;
        }

        if (this.props.onPinnedClick && SettingsStore.isFeatureEnabled('feature_pinning')) {
            let pinsIndicator = null;
            if (this._hasUnreadPins()) {
                pinsIndicator = (<div className="mx_RoomHeader_pinsIndicator mx_RoomHeader_pinsIndicatorUnread" />);
            } else if (this._hasPins()) {
                pinsIndicator = (<div className="mx_RoomHeader_pinsIndicator" />);
            }

            pinnedEventsButton =
                <AccessibleButton className="mx_RoomHeader_button mx_RoomHeader_pinnedButton"
                                  onClick={this.props.onPinnedClick} title={_t("Pinned Messages")}>
                    { pinsIndicator }
                </AccessibleButton>;
        }

//        var leave_button;
//        if (this.props.onLeaveClick) {
//            leave_button =
//                <div className="mx_RoomHeader_button" onClick={this.props.onLeaveClick} title="Leave room">
//                    <TintableSvg src={require("../../../../res/img/leave.svg")} width="26" height="20"/>
//                </div>;
//        }

        let forgetButton;
        if (this.props.onForgetClick) {
            forgetButton =
                <AccessibleButton className="mx_RoomHeader_button mx_RoomHeader_forgetButton"
                    onClick={this.props.onForgetClick}
                    title={_t("Forget room")}
                >
                </AccessibleButton>;
        }

        let searchButton;
        if (this.props.onSearchClick && this.props.inRoom) {
            searchButton =
                <AccessibleButton className="mx_RoomHeader_button mx_RoomHeader_searchButton"
                    onClick={this.props.onSearchClick}
                    title={_t("Search")}
                >
                </AccessibleButton>;
        }

        let shareRoomButton;
        if (this.props.inRoom) {
            shareRoomButton =
                <AccessibleButton className="mx_RoomHeader_button mx_RoomHeader_shareButton"
                    onClick={this.onShareRoomClick}
                    title={_t('Share room')}
                >
                </AccessibleButton>;
        }

        let manageIntegsButton;
        if (this.props.room && this.props.room.roomId && this.props.inRoom) {
            manageIntegsButton = <ManageIntegsButton
                room={this.props.room}
            />;
        }

        const rightRow =
            <div className="mx_RoomHeader_buttons">
                { settingsButton }
                { pinnedEventsButton }
                { shareRoomButton }
                { manageIntegsButton }
                { forgetButton }
                { searchButton }
            </div>;

        return (
            <div className="mx_RoomHeader light-panel">
                <div className="mx_RoomHeader_wrapper" aria-owns="mx_RightPanel">
                    <div className="mx_RoomHeader_avatar">{ roomAvatar }{ e2eIcon }</div>
                    { privateIcon }
                    { name }
                    { topicElement }
                    { cancelButton }
                    { rightRow }
                    <RoomHeaderButtons />
                </div>
            </div>
        );
    },
});
