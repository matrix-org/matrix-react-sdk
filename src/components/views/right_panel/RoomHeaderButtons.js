/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 Vector Creations Ltd
Copyright 2017 New Vector Ltd
Copyright 2018 New Vector Ltd
Copyright 2019, 2020 The Matrix.org Foundation C.I.C.

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

import React from 'react';
import { _t } from '../../../languageHandler';
import HeaderButton from './HeaderButton';
import HeaderButtons, {HEADER_KIND_ROOM} from './HeaderButtons';
import {RIGHT_PANEL_PHASES} from "../../../stores/RightPanelStorePhases";
import AccessibleButton from "../elements/AccessibleButton";
import ManageIntegsButton from "../elements/ManageIntegsButton";
import PropTypes from "prop-types";
import * as sdk from "../../../index";
import Modal from "../../../Modal";

const MEMBER_PHASES = [
    RIGHT_PANEL_PHASES.RoomMemberList,
    RIGHT_PANEL_PHASES.RoomMemberInfo,
    RIGHT_PANEL_PHASES.EncryptionPanel,
    RIGHT_PANEL_PHASES.Room3pidMemberInfo,
];

export default class RoomHeaderButtons extends HeaderButtons {
    static get propTypes() {
        return {
            onSettingsClick: PropTypes.func,
            room: PropTypes.object, // if showing panels for a given room, this is set
            inRoom: PropTypes.bool, // if showing panels for a given room, this is set
            roomId: PropTypes.string,
        };
    }

    constructor(props) {
        super(props, HEADER_KIND_ROOM);
        this._onMembersClicked = this._onMembersClicked.bind(this);
        this._onFilesClicked = this._onFilesClicked.bind(this);
        this._onNotificationsClicked = this._onNotificationsClicked.bind(this);
        this._onShareRoomClick = this._onShareRoomClick.bind(this);
    }

    onAction(payload) {
        super.onAction(payload);
        if (payload.action === "view_user") {
            if (payload.member) {
                this.setPhase(RIGHT_PANEL_PHASES.RoomMemberInfo, {member: payload.member});
            } else {
                this.setPhase(RIGHT_PANEL_PHASES.RoomMemberList);
            }
        } else if (payload.action === "view_3pid_invite") {
            if (payload.event) {
                this.setPhase(RIGHT_PANEL_PHASES.Room3pidMemberInfo, {event: payload.event});
            } else {
                this.setPhase(RIGHT_PANEL_PHASES.RoomMemberList);
            }
        }
    }

    _onMembersClicked() {
        if (this.state.phase === RIGHT_PANEL_PHASES.RoomMemberInfo) {
            // send the active phase to trigger a toggle
            // XXX: we should pass refireParams here but then it won't collapse as we desire it to
            this.setPhase(RIGHT_PANEL_PHASES.RoomMemberInfo);
        } else {
            // This toggles for us, if needed
            this.setPhase(RIGHT_PANEL_PHASES.RoomMemberList);
        }
    }

    _onFilesClicked() {
        // This toggles for us, if needed
        this.setPhase(RIGHT_PANEL_PHASES.FilePanel);
    }

    _onNotificationsClicked() {
        // This toggles for us, if needed
        this.setPhase(RIGHT_PANEL_PHASES.NotificationPanel);
    }

    _onShareRoomClick() {
        const ShareDialog = sdk.getComponent("dialogs.ShareDialog");
        Modal.createTrackedDialog('share room dialog', '', ShareDialog, {
            target: this.props.room,
        });
    }

    renderButtons() {
        let shareRoomButton;
        if (this.props.inRoom) {
            shareRoomButton = <AccessibleButton
                className="mx_RoomHeader_button mx_RoomHeader_shareButton"
                onClick={this._onShareRoomClick}
                title={_t('Share room')}
            />;
        }

        let manageIntegsButton;
        if (this.props.room && this.props.roomId && this.props.inRoom) {
            manageIntegsButton = <ManageIntegsButton
                room={this.props.room}
            />;
        }

        let settingsButton;
        if (this.props.onSettingsClick) {
            settingsButton = <AccessibleButton
                className="mx_RoomHeader_button mx_RoomHeader_settingsButton"
                onClick={this.props.onSettingsClick}
                title={_t("Settings")}
            />;
        }

        return [
            <HeaderButton key="membersButton" name="membersButton"
                title={_t('Members')}
                isHighlighted={this.isPhase(MEMBER_PHASES)}
                onClick={this._onMembersClicked}
                analytics={['Right Panel', 'Member List Button', 'click']}
            />,
            <HeaderButton key="filesButton" name="filesButton"
                title={_t('Files')}
                isHighlighted={this.isPhase(RIGHT_PANEL_PHASES.FilePanel)}
                onClick={this._onFilesClicked}
                analytics={['Right Panel', 'File List Button', 'click']}
            />,
            <HeaderButton key="notifsButton" name="notifsButton"
                title={_t('Notifications')}
                isHighlighted={this.isPhase(RIGHT_PANEL_PHASES.NotificationPanel)}
                onClick={this._onNotificationsClicked}
                analytics={['Right Panel', 'Notification List Button', 'click']}
            />,
            settingsButton,
            shareRoomButton,
            manageIntegsButton,
        ];
    }
}
