/*
Copyright 2019 New Vector Ltd

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
import PropTypes from 'prop-types';
import {Tab, TabbedView} from "../../structures/TabbedView";
import {_t, _td} from "../../../languageHandler";
import AdvancedRoomSettingsTab from "../settings/tabs/room/AdvancedRoomSettingsTab";
import RolesRoomSettingsTab from "../settings/tabs/room/RolesRoomSettingsTab";
import GeneralRoomSettingsTab from "../settings/tabs/room/GeneralRoomSettingsTab";
import SecurityRoomSettingsTab from "../settings/tabs/room/SecurityRoomSettingsTab";
import sdk from "../../../index";
import MatrixClientPeg from "../../../MatrixClientPeg";

export default class RoomSettingsDialog extends React.Component {
    static propTypes = {
        roomId: PropTypes.string.isRequired,
        onFinished: PropTypes.func.isRequired,
    };

    _getTabs() {
        const tabs = [];

        tabs.push(new Tab(
            _td("General"),
            "mx_RoomSettingsDialog_settingsIcon",
            <GeneralRoomSettingsTab roomId={this.props.roomId} />,
        ));
        tabs.push(new Tab(
            _td("Security & Privacy"),
            "mx_RoomSettingsDialog_securityIcon",
            <SecurityRoomSettingsTab roomId={this.props.roomId} />,
        ));
        tabs.push(new Tab(
            _td("Roles & Permissions"),
            "mx_RoomSettingsDialog_rolesIcon",
            <RolesRoomSettingsTab roomId={this.props.roomId} />,
        ));
        tabs.push(new Tab(
            _td("Advanced"),
            "mx_RoomSettingsDialog_warningIcon",
            <AdvancedRoomSettingsTab roomId={this.props.roomId} />,
        ));

        return tabs;
    }

    render() {
        const BaseDialog = sdk.getComponent('views.dialogs.BaseDialog');

        const roomName = MatrixClientPeg.get().getRoom(this.props.roomId).name;
        return (
            <BaseDialog className='mx_RoomSettingsDialog' hasCancel={true}
                        onFinished={this.props.onFinished} title={_t("Room Settings - %(roomName)s", {roomName})}>
                <div className='ms_SettingsDialog_content'>
                    <TabbedView tabs={this._getTabs()} />
                </div>
            </BaseDialog>
        );
    }
}
