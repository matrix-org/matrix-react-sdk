/*
Copyright 2020 The Matrix.org Foundation C.I.C.

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

import React, {useContext} from "react";
import {MatrixClient} from "matrix-js-sdk/src/client";

import SettingsSection from "../SettingsSection";
import {_t} from "../../../../languageHandler";
import {IPushRule, IPushRulesMap, NotificationSettings} from "../../../../notifications/types";
import AccessibleButton from "../../elements/AccessibleButton";
import QuestionDialog from "../../dialogs/QuestionDialog";
import Modal from "../../../../Modal";
import MatrixClientContext from "../../../../contexts/MatrixClientContext";
import RoomAvatar from "../../avatars/RoomAvatar";
import {ContextMenu, ContextMenuButton, MenuItem, useContextMenu} from "../../../structures/ContextMenu";

interface IProps {
    pushRules: IPushRulesMap;
}

interface IRoomOverrideTileProps {
    roomId: string;
    rule: IPushRule;
}

const mapNotificationLevelToString = (level: NotificationSettings): string => {
    switch (level) {
        case NotificationSettings.AllMessages:
            return _t("All Messages");
        case NotificationSettings.DirectMessagesMentionsKeywords:
        case NotificationSettings.MentionsKeywordsOnly:
            return _t("Mentions & Keywords");
        case NotificationSettings.Never:
        default:
            return _t("None");
    }
};

const inPlaceOf = (elementRect) => ({
    right: window.innerWidth - elementRect.right - 50,
    top: elementRect.top,
    chevronOffset: 0,
    chevronFace: "none",
});

const RoomOverrideTile: React.FC<IRoomOverrideTileProps> = ({roomId, rule}) => {
    const [menuDisplayed, button, openMenu, closeMenu] = useContextMenu();
    const cli = useContext<MatrixClient>(MatrixClientContext);
    const room = cli.getRoom(roomId);

    let contextMenu;
    if (menuDisplayed) {
        const buttonRect = button.current.getBoundingClientRect();
        contextMenu = <ContextMenu {...inPlaceOf(buttonRect)} onFinished={closeMenu}>
            <div className="mx_NotificationsTab_RoomOverrideTile_ContextMenu">
                <MenuItem onClick={() => {}}>
                    {mapNotificationLevelToString(NotificationSettings.AllMessages)}
                </MenuItem>
                <MenuItem onClick={() => {}}>
                    {mapNotificationLevelToString(NotificationSettings.MentionsKeywordsOnly)}
                </MenuItem>
                <MenuItem onClick={() => {}}>
                    {mapNotificationLevelToString(NotificationSettings.Never)}
                </MenuItem>
            </div>
        </ContextMenu>;
    }

    return <div className="mx_NotificationsTab_RoomOverrideTile">
        <RoomAvatar room={room} width={32} height={32} aria-hidden="true" />
        <span>{room.name || roomId}</span>
        <ContextMenuButton
            label={_t("TODO")}
            onClick={openMenu}
            isExpanded={menuDisplayed}
            inputRef={button}
            kind="link"
        >
            {mapNotificationLevelToString(NotificationSettings.MentionsKeywordsOnly)}
        </ContextMenuButton>

        {contextMenu}
    </div>;
};

const onResetAllRoomsClick = () => {
    Modal.createTrackedDialog('Notifications', 'Reset all room overrides dialog', QuestionDialog, {
        title: _t("Resetting all rooms"),
        description: _t("Are you sure you want to reset all rooms?"),
        button: _t("Yes"),
        cancelButton: _t("No"),
        onFinished: (yes: boolean) => {
            if (yes) {
                // TODO
            }
        },
    });
};

const RoomOverridesSection: React.FC<IProps> = ({pushRules}) => {
    return <SettingsSection title={_t("Room notifications")}>
        <div className="mx_SettingsTab_subsectionText">
            {_t("Rooms listed below use custom notification settings")}
        </div>

        <div>
            <RoomOverrideTile roomId="!GNjEZxQKWMEgzEnuNa:matrix.org" rule={null} />
            <RoomOverrideTile roomId="!GNjEZxQKWMEgzEnuNa:matrix.org" rule={null} />
            <RoomOverrideTile roomId="!GNjEZxQKWMEgzEnuNa:matrix.org" rule={null} />
        </div>

        <AccessibleButton kind="link" onClick={onResetAllRoomsClick}>
            {_t("Reset all rooms")}
        </AccessibleButton>
    </SettingsSection>;
};

export default RoomOverridesSection;
