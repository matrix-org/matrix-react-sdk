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
import {RovingAccessibleTooltipButton} from "../../../accessibility/RovingTabIndex";

interface IItemProps {
    space?: Room;
}

const SpaceItem: React.FC<IItemProps> = ({
    space,
    activeSpaces,
    isNested
}) => {
    const isActive = activeSpaces.includes(space);
    const classes = classNames("mx_SpaceButton", {
        mx_SpaceButton_active: isActive,
    });
    const notificationState = SpaceStore.instance.getNotificationState(space.roomId);
    const childSpaces = SpaceStore.instance.getChildSpaces(space.roomId);
    const childItems = childSpaces ? <SpaceTreeLevel spaces={childSpaces} activeSpaces={activeSpaces} isNested={true} /> : null;
    let notifBadge;
    if (notificationState) {
        notifBadge = <NotificationBadge forceCount={false} notification={notificationState} />;
    }

    const avatarSize = isNested ? 24 : 32;
    return (
        <li>
            <RovingAccessibleTooltipButton className={classes}
                onClick={() => SpaceStore.instance.setActiveSpace(space)}>
                <RoomAvatar width={avatarSize} height={avatarSize} room={space} />
                <span className="mx_SpaceButton_name">{ space.name }</span>
                { notifBadge }
            </RovingAccessibleTooltipButton>
            { childItems }
        </li>
    );
}

interface ITreeLevelProps {
    spaces: Room[];
    activeSpaces: Room[];
}

const SpaceTreeLevel: React.FC<ITreeLevelProps> = ({
    spaces,
    activeSpaces,
    isNested,
}) => {
    return <ul>
        {spaces.map(s => {
            return (<SpaceItem
                key={s.roomId}
                activeSpaces={activeSpaces}
                space={s}
                isNested={isNested}
            />);
        })}
    </ul>;
}

export default SpaceTreeLevel;
