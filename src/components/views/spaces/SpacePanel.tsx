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

import React, {useState} from "react";
import classNames from "classnames";
import {Room} from "matrix-js-sdk/src/models/room";

import {_t} from "../../../languageHandler";
import RoomAvatar from "../avatars/RoomAvatar";
import {useContextMenu} from "../../structures/ContextMenu";
import SpaceCreateMenu from "./SpaceCreateMenu";
import {useEventEmitter} from "../../../hooks/useEventEmitter";
import SpaceStore, {HOME_SPACE, UPDATE_SELECTED_SPACE, UPDATE_TOP_LEVEL_SPACES} from "../../../stores/SpaceStore";
import AutoHideScrollbar from "../../structures/AutoHideScrollbar";
import {SpaceNotificationState} from "../../../stores/notifications/SpaceNotificationState";
import NotificationBadge from "../rooms/NotificationBadge";
import {RovingAccessibleTooltipButton, RovingTabIndexProvider} from "../../../accessibility/RovingTabIndex";
import {Key} from "../../../Keyboard";

interface IButtonProps {
    space?: Room;
    className?: string;
    selected?: boolean;
    tooltip?: string;
    notificationState?: SpaceNotificationState;
    onClick(): void;
}

const SpaceButton: React.FC<IButtonProps> = ({
    space,
    className,
    selected,
    onClick,
    tooltip,
    notificationState,
    children,
}) => {
    const classes = classNames("mx_SpaceButton", className, {
        mx_SpaceButton_active: selected,
    });

    let avatar;
    if (space) {
        avatar = <RoomAvatar width={32} height={32} room={space} />;
    }

    let notifBadge;
    if (notificationState) {
        notifBadge = <NotificationBadge forceCount={false} notification={notificationState} />;
    }

    return (
        <RovingAccessibleTooltipButton className={classes} title={tooltip} onClick={onClick}>
            { avatar }
            { notifBadge }
            { children }
        </RovingAccessibleTooltipButton>
    );
}

const useSpaces = (): [Room[], Room | null] => {
    const [spaces, setSpaces] = useState<Room[]>(SpaceStore.instance.spacePanelSpaces);
    useEventEmitter(SpaceStore.instance, UPDATE_TOP_LEVEL_SPACES, setSpaces);
    const [activeSpace, setActiveSpace] = useState<Room>(SpaceStore.instance.activeSpace);
    useEventEmitter(SpaceStore.instance, UPDATE_SELECTED_SPACE, setActiveSpace);
    return [spaces, activeSpace];
};

const SpacePanel = () => {
    // We don't need the handle as we position the menu in a constant location
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [menuDisplayed, handle, openMenu, closeMenu] = useContextMenu<void>();
    const [spaces, activeSpace] = useSpaces();

    const newClasses = classNames("mx_SpaceButton_new", {
        mx_SpaceButton_newCancel: menuDisplayed,
    });

    let contextMenu = null;
    if (menuDisplayed) {
        contextMenu = <SpaceCreateMenu onFinished={closeMenu} />;
    }

    const onKeyDown = (ev: React.KeyboardEvent) => {
        let handled = true;

        switch (ev.key) {
            case Key.ARROW_UP:
                onMoveFocus(ev.target as Element, true);
                break;
            case Key.ARROW_DOWN:
                onMoveFocus(ev.target as Element, false);
                break;
            default:
                handled = false;
        }

        if (handled) {
            // consume all other keys in context menu
            ev.stopPropagation();
            ev.preventDefault();
        }
    };

    const onMoveFocus = (element: Element, up: boolean) => {
        let descending = false; // are we currently descending or ascending through the DOM tree?
        let classes: DOMTokenList;

        do {
            const child = up ? element.lastElementChild : element.firstElementChild;
            const sibling = up ? element.previousElementSibling : element.nextElementSibling;

            if (descending) {
                if (child) {
                    element = child;
                } else if (sibling) {
                    element = sibling;
                } else {
                    descending = false;
                    element = element.parentElement;
                }
            } else {
                if (sibling) {
                    element = sibling;
                    descending = true;
                } else {
                    element = element.parentElement;
                }
            }

            if (element) {
                if (element.classList.contains("mx_ContextualMenu")) { // we hit the top
                    element = up ? element.lastElementChild : element.firstElementChild;
                    descending = true;
                }
                classes = element.classList;
            }
        } while (element && !classes.contains("mx_SpaceButton"));

        if (element) {
            (element as HTMLElement).focus();
        }
    };

    // TODO drag and drop for re-arranging order
    return <RovingTabIndexProvider handleHomeEnd={true} onKeyDown={onKeyDown}>
        {({onKeyDownHandler}) => (
            <div className="mx_SpacePanel" onKeyDown={onKeyDownHandler}>
                <AutoHideScrollbar>
                    <SpaceButton
                        className="mx_SpaceButton_home"
                        onClick={() => SpaceStore.instance.setActiveSpace(null)}
                        selected={!activeSpace}
                        tooltip={_t("Home")}
                        notificationState={SpaceStore.instance.getNotificationState(HOME_SPACE)}
                    />

                    { spaces.map(room => (
                        <SpaceButton
                            key={room.roomId}
                            onClick={() => SpaceStore.instance.setActiveSpace(room)}
                            selected={activeSpace === room}
                            tooltip={room.name}
                            space={room}
                            notificationState={SpaceStore.instance.getNotificationState(room.roomId)}
                        />
                    ))}

                    <SpaceButton
                        className={newClasses}
                        tooltip={menuDisplayed ? _t("Cancel") : _t("Create a space")}
                        onClick={menuDisplayed ? closeMenu : openMenu}
                    />
                </AutoHideScrollbar>

                { contextMenu }
            </div>
        )}
    </RovingTabIndexProvider>
};

export default SpacePanel;
