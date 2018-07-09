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

'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import sdk from '../../../index';
import { _t } from '../../../languageHandler';
import MatrixClientPeg from '../../../MatrixClientPeg';
import Modal from "../../../Modal";
import dis from "../../../dispatcher";
import RateLimitedFunc from '../../../ratelimitedfunc';

import * as linkify from 'linkifyjs';
import linkifyElement from 'linkifyjs/element';
import linkifyMatrix from '../../../linkify-matrix';
import AccessibleButton from '../elements/AccessibleButton';
import ManageIntegsButton from '../elements/ManageIntegsButton';
import {CancelButton} from './SimpleRoomHeader';
import SettingsStore from "../../../settings/SettingsStore";

linkifyMatrix(linkify);

module.exports = React.createClass({
    displayName: 'RoomHeader',

    propTypes: {
        room: PropTypes.object,
        oobData: PropTypes.object,
        editing: PropTypes.bool,
        saving: PropTypes.bool,
        inRoom: PropTypes.bool,
        collapsedRhs: PropTypes.bool,
        onSettingsClick: PropTypes.func,
        onPinnedClick: PropTypes.func,
        onSaveClick: PropTypes.func,
        onSearchClick: PropTypes.func,
        onLeaveClick: PropTypes.func,
        onCancelClick: PropTypes.func,
    },

    getDefaultProps: function() {
        return {
            editing: false,
            inRoom: false,
            onSaveClick: function() {},
            onCancelClick: null,
        };
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
        if (this.refs.topic) {
            linkifyElement(this.refs.topic, linkifyMatrix.options);
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

    onAvatarPickerClick: function(ev) {
        if (this.refs.file_label) {
            this.refs.file_label.click();
        }
    },

    onAvatarSelected: function(ev) {
        const changeAvatar = this.refs.changeAvatar;
        if (!changeAvatar) {
            console.error("No ChangeAvatar found to upload image to!");
            return;
        }
        changeAvatar.onFileSelected(ev).catch(function(err) {
            const errMsg = (typeof err === "string") ? err : (err.error || "");
            const ErrorDialog = sdk.getComponent("dialogs.ErrorDialog");
            console.error("Failed to set avatar: " + errMsg);
            Modal.createTrackedDialog('Failed to set avatar', '', ErrorDialog, {
                title: _t("Error"),
                description: _t("Failed to set avatar."),
            });
        }).done();
    },

    onAvatarRemoveClick: function() {
        MatrixClientPeg.get().sendStateEvent(this.props.room.roomId, 'm.room.avatar', {url: null}, '');
    },

    onShowRhsClick: function(ev) {
        dis.dispatch({ action: 'show_right_panel' });
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

    /**
     * After editing the settings, get the new name for the room
     *
     * @return {?string} newName or undefined if we didn't let the user edit the room name
     */
    getEditedName: function() {
        let newName;
        if (this.refs.nameEditor) {
            newName = this.refs.nameEditor.getRoomName();
        }
        return newName;
    },

    /**
     * After editing the settings, get the new topic for the room
     *
     * @return {?string} newTopic or undefined if we didn't let the user edit the room topic
     */
    getEditedTopic: function() {
        let newTopic;
        if (this.refs.topicEditor) {
            newTopic = this.refs.topicEditor.getTopic();
        }
        return newTopic;
    },

    render: function() {
        const RoomAvatar = sdk.getComponent("avatars.RoomAvatar");
        const ChangeAvatar = sdk.getComponent("settings.ChangeAvatar");
        const TintableSvg = sdk.getComponent("elements.TintableSvg");
        const EmojiText = sdk.getComponent('elements.EmojiText');

        let name = null;
        let searchStatus = null;
        let topicElement = null;
        let cancelButton = null;
        let spinner = null;
        let saveButton = null;
        let settingsButton = null;
        let pinnedEventsButton = null;

        let canSetRoomName;
        let canSetRoomAvatar;
        let canSetRoomTopic;
        if (this.props.editing) {
            // calculate permissions.  XXX: this should be done on mount or something
            const userId = MatrixClientPeg.get().credentials.userId;

            canSetRoomName = this.props.room.currentState.maySendStateEvent('m.room.name', userId);
            canSetRoomAvatar = this.props.room.currentState.maySendStateEvent('m.room.avatar', userId);
            canSetRoomTopic = this.props.room.currentState.maySendStateEvent('m.room.topic', userId);

            saveButton = (
                <AccessibleButton className="mx_RoomHeader_textButton" onClick={this.props.onSaveClick}>
                    { _t("Save") }
                </AccessibleButton>
            );
        }

        if (this.props.onCancelClick) {
            cancelButton = <CancelButton onClick={this.props.onCancelClick} />;
        }

        if (this.props.saving) {
            const Spinner = sdk.getComponent("elements.Spinner");
            spinner = <div className="mx_RoomHeader_spinner"><Spinner /></div>;
        }

        if (canSetRoomName) {
            const RoomNameEditor = sdk.getComponent("rooms.RoomNameEditor");
            name = <RoomNameEditor ref="nameEditor" room={this.props.room} />;
        } else {
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

            const emojiTextClasses = classNames('mx_RoomHeader_nametext', { mx_RoomHeader_settingsHint: settingsHint });
            name =
                <div className="mx_RoomHeader_name" onClick={this.props.onSettingsClick}>
                    <EmojiText dir="auto" element="div" className={emojiTextClasses} title={roomName}>{ roomName }</EmojiText>
                    { searchStatus }
                </div>;
        }

        if (canSetRoomTopic) {
            const RoomTopicEditor = sdk.getComponent("rooms.RoomTopicEditor");
            topicElement = <RoomTopicEditor ref="topicEditor" room={this.props.room} />;
        } else {
            let topic;
            if (this.props.room) {
                const ev = this.props.room.currentState.getStateEvents('m.room.topic', '');
                if (ev) {
                    topic = ev.getContent().topic;
                }
            }
            if (topic) {
                topicElement =
                    <div className="mx_RoomHeader_topic" ref="topic" title={topic} dir="auto">{ topic }</div>;
            }
        }

        let roomAvatar = null;
        if (canSetRoomAvatar) {
            roomAvatar = (
                <div className="mx_RoomHeader_avatarPicker">
                    <div onClick={this.onAvatarPickerClick}>
                        <ChangeAvatar ref="changeAvatar" room={this.props.room} showUploadSection={false} width={48} height={48} />
                    </div>
                    <div className="mx_RoomHeader_avatarPicker_edit">
                        <label htmlFor="avatarInput" ref="file_label">
                            <img src="img/camera.svg"
                                 alt={_t("Upload avatar")} title={_t("Upload avatar")}
                                 width="17" height="15" />
                        </label>
                        <input id="avatarInput" type="file" onChange={this.onAvatarSelected} />
                    </div>
                    <div className="mx_RoomHeader_avatarPicker_remove" onClick={this.onAvatarRemoveClick}>
                        <img src="img/cancel.svg"
                            className="mx_filterFlipColor"
                            width="10"
                            alt={_t("Remove avatar")}
                            title={_t("Remove avatar")} />
                    </div>
                </div>
            );
        } else if (this.props.room || (this.props.oobData && this.props.oobData.name)) {
            roomAvatar = (
                <RoomAvatar room={this.props.room} width={48} height={48} oobData={this.props.oobData}
                    viewAvatarOnClick={true} />
            );
        }

        if (this.props.onSettingsClick) {
            settingsButton =
                <AccessibleButton className="mx_RoomHeader_button" onClick={this.props.onSettingsClick} title={_t("Settings")}>
                    <TintableSvg src="img/icons-settings-room.svg" width="16" height="16" />
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
                    <TintableSvg src="img/icons-pin.svg" width="16" height="16" />
                </AccessibleButton>;
        }

//        var leave_button;
//        if (this.props.onLeaveClick) {
//            leave_button =
//                <div className="mx_RoomHeader_button" onClick={this.props.onLeaveClick} title="Leave room">
//                    <TintableSvg src="img/leave.svg" width="26" height="20"/>
//                </div>;
//        }

        let forgetButton;
        if (this.props.onForgetClick) {
            forgetButton =
                <AccessibleButton className="mx_RoomHeader_button" onClick={this.props.onForgetClick} title={_t("Forget room")}>
                    <TintableSvg src="img/leave.svg" width="26" height="20" />
                </AccessibleButton>;
        }

        let searchButton;
        if (this.props.onSearchClick && this.props.inRoom) {
            searchButton =
                <AccessibleButton className="mx_RoomHeader_button" onClick={this.props.onSearchClick} title={_t("Search")}>
                    <TintableSvg src="img/icons-search.svg" width="35" height="35" />
                </AccessibleButton>;
        }

        let shareRoomButton;
        if (this.props.inRoom) {
            shareRoomButton =
                <AccessibleButton className="mx_RoomHeader_button" onClick={this.onShareRoomClick} title={_t('Share room')}>
                    <TintableSvg src="img/icons-share.svg" width="16" height="16" />
                </AccessibleButton>;
        }

        let rightPanelButtons;
        if (this.props.collapsedRhs) {
            rightPanelButtons =
                <AccessibleButton className="mx_RoomHeader_button" onClick={this.onShowRhsClick} title={_t('Show panel')}>
                    <TintableSvg src="img/maximise.svg" width="10" height="16" />
                </AccessibleButton>;
        }

        let rightRow;
        let manageIntegsButton;
        if (this.props.room && this.props.room.roomId && this.props.inRoom) {
            manageIntegsButton = <ManageIntegsButton
                room={this.props.room}
            />;
        }

        if (!this.props.editing) {
            rightRow =
                <div className="mx_RoomHeader_rightRow">
                    { settingsButton }
                    { pinnedEventsButton }
                    { shareRoomButton }
                    { manageIntegsButton }
                    { forgetButton }
                    { searchButton }
                    { rightPanelButtons }
                </div>;
        }

        return (
            <div className={"mx_RoomHeader " + (this.props.editing ? "mx_RoomHeader_editing" : "")}>
                <div className="mx_RoomHeader_wrapper">
                    <div className="mx_RoomHeader_leftRow">
                        <div className="mx_RoomHeader_avatar">
                            { roomAvatar }
                        </div>
                        <div className="mx_RoomHeader_info">
                            { name }
                            { topicElement }
                        </div>
                    </div>
                    { spinner }
                    { saveButton }
                    { cancelButton }
                    { rightRow }
                </div>
            </div>
        );
    },
});
