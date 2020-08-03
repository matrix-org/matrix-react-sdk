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
import {PushRule, NotificationSetting} from "../../../../notifications/types";
import AccessibleButton from "../../elements/AccessibleButton";
import QuestionDialog from "../../dialogs/QuestionDialog";
import Modal from "../../../../Modal";
import MatrixClientContext from "../../../../contexts/MatrixClientContext";
import RoomAvatar from "../../avatars/RoomAvatar";
import {ChevronFace, ContextMenu, ContextMenuButton, MenuItem, useContextMenu} from "../../../structures/ContextMenu";

interface IProps {
    notifyMeWith: NotificationSetting;
}

interface IRoomOverrideTileProps {
    defaultSetting: NotificationSetting;
    roomId: string;
    rule: PushRule;
}

const mapNotificationLevelToString = (level: NotificationSetting): string => {
    switch (level) {
        case NotificationSetting.AllMessages:
            return _t("All Messages");
        case NotificationSetting.DirectMessagesMentionsKeywords:
        case NotificationSetting.MentionsKeywordsOnly:
            return _t("Mentions & Keywords");
        case NotificationSetting.Never:
        default:
            return _t("None");
    }
};

const inPlaceOf = (elementRect, yOffset = 0) => ({
    right: window.innerWidth - elementRect.right - 48,
    top: elementRect.top + yOffset - 24,
    chevronOffset: 0,
    chevronFace: ChevronFace.None,
});

const RoomOverrideTile: React.FC<IRoomOverrideTileProps> = ({defaultSetting, roomId, rule}) => {
    const [menuDisplayed, button, openMenu, closeMenu] = useContextMenu();
    const cli = useContext<MatrixClient>(MatrixClientContext);
    const room = cli.getRoom(roomId);

    const level = NotificationSetting.MentionsKeywordsOnly; // TODO
    let yOffset = 0;
    if (level === NotificationSetting.MentionsKeywordsOnly) {
        yOffset = -32;
    } else if (level === NotificationSetting.Never) {
        yOffset = -64;
    }

    const defaultTag = <span>({_t("default")})</span>;

    let contextMenu;
    if (menuDisplayed) {
        const buttonRect = button.current.getBoundingClientRect();
        contextMenu = <ContextMenu {...inPlaceOf(buttonRect, yOffset)} onFinished={closeMenu}>
            <div className="mx_NotificationsTab_RoomOverrideTile_ContextMenu">
                <MenuItem
                    kind="link"
                    className="mx_NotificationsTab_RoomOverrideTile_ContextMenu_allMessages"
                    aria-selected={level === NotificationSetting.AllMessages}
                    onClick={closeMenu}
                >
                    {mapNotificationLevelToString(NotificationSetting.AllMessages)}
                    {defaultSetting === NotificationSetting.AllMessages ? defaultTag : undefined}
                </MenuItem>
                <MenuItem
                    kind="link"
                    className="mx_NotificationsTab_RoomOverrideTile_ContextMenu_mentionsKeywords"
                    aria-selected={level === NotificationSetting.MentionsKeywordsOnly}
                    onClick={closeMenu}
                >
                    {mapNotificationLevelToString(NotificationSetting.MentionsKeywordsOnly)}
                    {defaultSetting === NotificationSetting.MentionsKeywordsOnly ? defaultTag : undefined}
                </MenuItem>
                <MenuItem
                    kind="link"
                    className="mx_NotificationsTab_RoomOverrideTile_ContextMenu_none"
                    aria-selected={level === NotificationSetting.Never}
                    onClick={closeMenu}
                >
                    {mapNotificationLevelToString(NotificationSetting.Never)}
                    {defaultSetting === NotificationSetting.Never ? defaultTag : undefined}
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
            {mapNotificationLevelToString(level)}
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

const RoomOverridesSection: React.FC<IProps> = ({notifyMeWith}) => {
    const rooms = [];
    // skip section if there are no room overrides
    if (rooms.length < 1) return null;

    let description;
    if (notifyMeWith === NotificationSetting.Never) {
        description = <div className="mx_SettingsTab_errorText">
            {_t("Account notifications are set to “Never” and changes below will not apply.")}
        </div>;
    } else {
        description = <div className="mx_SettingsTab_subsectionText">
            {_t("Rooms listed below use custom notification settings")}
        </div>;
    }

    return <SettingsSection title={_t("Room notifications")}>
        {description}

        <div>
            {/*<RoomOverrideTile defaultSetting={notifyMeWith} roomId="!GNjEZxQKWMEgzEnuNa:matrix.org" rule={null} />*/}
        </div>

        <AccessibleButton kind="link" onClick={onResetAllRoomsClick}>
            {_t("Reset all rooms")}
        </AccessibleButton>
    </SettingsSection>;
};

export default RoomOverridesSection;
