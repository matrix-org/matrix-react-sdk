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

import React from "react";
import classNames from "classnames";

import {
    ChevronFace,
    ContextMenuTooltipButton,
    useContextMenu,
} from "../../structures/ContextMenu";
import {NotificationSetting, RoomNotificationSetting} from "../../../notifications/types";
import {_t} from "../../../languageHandler";
import IconizedContextMenu, {IconizedContextMenuOptionList, IconizedContextMenuRadio} from "./IconizedContextMenu";

interface IProps {
    options?: RoomNotificationSetting[];
    value: RoomNotificationSetting;
    defaultValue: RoomNotificationSetting;
    tabIndex?: number;
    label?: string;
    onOpenMenu?(ev: React.MouseEvent): void;
    onCloseMenu?(): void;
    onChange(newValue: RoomNotificationSetting): void;
}

const mapNotificationLevelToString = (level: RoomNotificationSetting): string => {
    switch (level) {
        case NotificationSetting.AllMessages:
            return _t("All Messages");
        case NotificationSetting.MentionsKeywordsOnly:
            return _t("Mentions & Keywords");
        case NotificationSetting.Never:
        default:
            return _t("None");
    }
};

const mapNotificationLevelToIconClass = (level: RoomNotificationSetting): string => {
    switch (level) {
        case NotificationSetting.AllMessages:
            return "mx_RoomNotificationsMenu_iconBellDot";
        case NotificationSetting.MentionsKeywordsOnly:
            return "mx_RoomNotificationsMenu_iconBellMentions";
        case NotificationSetting.Never:
            return "mx_RoomNotificationsMenu_iconBellCrossed";
    }
};

type PartialDOMRect = Pick<DOMRect, "left" | "bottom">;
export const contextMenuBelow = (elementRect: PartialDOMRect) => {
    // align the context menu's icons with the icon which opened the context menu
    const left = elementRect.left + window.pageXOffset - 9;
    const top = elementRect.bottom + window.pageYOffset + 17;
    const chevronFace = ChevronFace.None;
    return {left, top, chevronFace};
};

const RoomNotificationsMenu: React.FC<IProps> = ({
    options = [
        NotificationSetting.AllMessages,
        NotificationSetting.MentionsKeywordsOnly,
        NotificationSetting.Never,
    ],
    value,
    defaultValue,
    tabIndex,
    label,
    onOpenMenu,
    onCloseMenu,
    onChange,
}) => {
    const [menuDisplayed, handle, _openMenu, _closeMenu] = useContextMenu();

    const openMenu = (ev: React.MouseEvent) => {
        _openMenu();
        if (onOpenMenu) onOpenMenu(ev);
    };
    const closeMenu = () => {
        _closeMenu();
        if (onCloseMenu) onCloseMenu();
    };

    const defaultTag = <span className="mx_RoomNotificationsMenu_default">({_t("default")})</span>;

    let contextMenu: JSX.Element;
    if (menuDisplayed) {
        contextMenu = <IconizedContextMenu
            {...contextMenuBelow(handle.current.getBoundingClientRect())}
            onFinished={closeMenu}
            compact
        >
            <IconizedContextMenuOptionList first>
                {options.map(setting => {
                    const onClick = () => {
                        onChange(setting);
                    };
                    // TODO mark setting === defaultValue
                    return <IconizedContextMenuRadio
                        key={setting}
                        label={mapNotificationLevelToString(setting)}
                        active={setting === value}
                        iconClassName={mapNotificationLevelToIconClass(setting)}
                        onClick={onClick}
                    >
                        {setting === defaultValue && defaultTag}
                    </IconizedContextMenuRadio>;
                })}
            </IconizedContextMenuOptionList>
        </IconizedContextMenu>;
    }

    const classes = classNames("mx_RoomNotificationsMenu_handle", mapNotificationLevelToIconClass(value));

    return (
        <React.Fragment>
            <ContextMenuTooltipButton
                className={classes}
                onClick={openMenu}
                title={label || mapNotificationLevelToString(value)}
                isExpanded={menuDisplayed}
                tabIndex={tabIndex}
                inputRef={handle}
            />
            {contextMenu}
        </React.Fragment>
    );
};

export default RoomNotificationsMenu;

