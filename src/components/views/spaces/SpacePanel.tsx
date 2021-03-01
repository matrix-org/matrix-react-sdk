/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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
import {SpaceItem} from "./SpaceTreeLevel";
import AccessibleTooltipButton from "../elements/AccessibleTooltipButton";
import {useEventEmitter} from "../../../hooks/useEventEmitter";
import SpaceStore, {HOME_SPACE, UPDATE_SELECTED_SPACE, UPDATE_TOP_LEVEL_SPACES} from "../../../stores/SpaceStore";
import AutoHideScrollbar from "../../structures/AutoHideScrollbar";
import {SpaceNotificationState} from "../../../stores/notifications/SpaceNotificationState";
import NotificationBadge from "../rooms/NotificationBadge";
import {
    RovingAccessibleButton,
    RovingAccessibleTooltipButton,
    RovingTabIndexProvider,
} from "../../../accessibility/RovingTabIndex";
import {Key} from "../../../Keyboard";

interface IButtonProps {
    space?: Room;
    className?: string;
    selected?: boolean;
    tooltip?: string;
    notificationState?: SpaceNotificationState;
    isNarrow?: boolean;
    onClick(): void;
}

const SpaceButton: React.FC<IButtonProps> = ({
    space,
    className,
    selected,
    onClick,
    tooltip,
    notificationState,
    isNarrow,
    children,
}) => {
    const classes = classNames("mx_SpaceButton", className, {
        mx_SpaceButton_active: selected,
    });

    let avatar = <div className="mx_SpaceButton_avatarPlaceholder" />;
    if (space) {
        avatar = <RoomAvatar width={32} height={32} room={space} />;
    }

    let notifBadge;
    if (notificationState) {
        notifBadge = <div className="mx_SpacePanel_badgeContainer">
            <NotificationBadge forceCount={false} notification={notificationState} />
        </div>;
    }

    let button;
    if (isNarrow) {
        button = (
            <RovingAccessibleTooltipButton className={classes} title={tooltip} onClick={onClick} role="treeitem">
                { avatar }
                { notifBadge }
                { children }
            </RovingAccessibleTooltipButton>
        );
    } else {
        button = (
            <RovingAccessibleButton className={classes} onClick={onClick} role="treeitem">
                { avatar }
                <span className="mx_SpaceButton_name">{ tooltip }</span>
                { notifBadge }
                { children }
            </RovingAccessibleButton>
        );
    }

    return <li className={classNames({
        "mx_SpaceItem": true,
        "collapsed": isNarrow,
    })}>
        { button }
    </li>;
}

const useSpaces = (): [Room[], Room | null] => {
    const [spaces, setSpaces] = useState<Room[]>(SpaceStore.instance.spacePanelSpaces);
    useEventEmitter(SpaceStore.instance, UPDATE_TOP_LEVEL_SPACES, setSpaces);
    const [activeSpace, setActiveSpace] = useState<Room>(SpaceStore.instance.activeSpace);
    useEventEmitter(SpaceStore.instance, UPDATE_SELECTED_SPACE, setActiveSpace);
    return [spaces, activeSpace];
};

const SpacePanel = () => {
    const [spaces, activeSpace] = useSpaces();
    const [isPanelCollapsed, setPanelCollapsed] = useState(true);

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

    const activeSpaces = activeSpace ? [activeSpace] : [];
    const expandCollapseButtonTitle = isPanelCollapsed ? _t("Expand space panel") : _t("Collapse space panel");
    // TODO drag and drop for re-arranging order
    return <RovingTabIndexProvider handleHomeEnd={true} onKeyDown={onKeyDown}>
        {({onKeyDownHandler}) => (
            <ul
                className={classNames("mx_SpacePanel", { collapsed: isPanelCollapsed })}
                onKeyDown={onKeyDownHandler}
            >
                <AutoHideScrollbar className="mx_SpacePanel_spaceTreeWrapper">
                    <div className="mx_SpaceTreeLevel">
                        <SpaceButton
                            className="mx_SpaceButton_home"
                            onClick={() => SpaceStore.instance.setActiveSpace(null)}
                            selected={!activeSpace}
                            tooltip={_t("Home")}
                            notificationState={SpaceStore.instance.getNotificationState(HOME_SPACE)}
                            isNarrow={isPanelCollapsed}
                        />
                        { spaces.map(s => <SpaceItem
                            key={s.roomId}
                            space={s}
                            activeSpaces={activeSpaces}
                            isPanelCollapsed={isPanelCollapsed}
                            onExpand={() => setPanelCollapsed(false)}
                        />) }
                    </div>
                </AutoHideScrollbar>
                <AccessibleTooltipButton
                    className={classNames("mx_SpacePanel_toggleCollapse", {expanded: !isPanelCollapsed})}
                    onClick={evt => setPanelCollapsed(!isPanelCollapsed)}
                    title={expandCollapseButtonTitle}
                />
            </ul>
        )}
    </RovingTabIndexProvider>
};

export default SpacePanel;
