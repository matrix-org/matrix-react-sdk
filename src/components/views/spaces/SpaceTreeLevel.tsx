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

import RoomAvatar from "../avatars/RoomAvatar";
import SpaceStore from "../../../stores/SpaceStore";
import NotificationBadge from "../rooms/NotificationBadge";
import {RovingAccessibleButton} from "../../../accessibility/roving/RovingAccessibleButton";

interface IItemProps {
    space?: Room;
    activeSpaces: Room[];
    isNested?: boolean;
}

export const SpaceItem: React.FC<IItemProps> = ({
    space,
    activeSpaces,
    isNested,
}) => {
    const childSpaces = SpaceStore.instance.getChildSpaces(space.roomId);
    const isActive = activeSpaces.includes(space);
    const itemClasses = classNames({
        "mx_SpaceItem": true,
        "collapsed": !isNested,   // default to collapsed
        "hasSubSpaces": childSpaces && childSpaces.length,
    });
    const classes = classNames("mx_SpaceButton", {
        mx_SpaceButton_active: isActive,
    });
    const notificationState = SpaceStore.instance.getNotificationState(space.roomId);
    const childItems = childSpaces ? <SpaceTreeLevel
        spaces={childSpaces}
        activeSpaces={activeSpaces}
        isNested={true}
    /> : null;
    let notifBadge;
    if (notificationState) {
        notifBadge = <NotificationBadge forceCount={false} notification={notificationState} />;
    }

    const avatarSize = isNested ? 24 : 32;

    function toggleCollapse(evt) {
        const li = evt.target.parentElement.parentElement;
        li.classList.toggle("collapsed");
        // don't bubble up so encapsulating button for space
        // doesn't get triggered
        evt.stopPropagation();
    }

    const toggleCollapseButton = childSpaces && childSpaces.length ?
        <button className="mx_SpaceButton_toggleCollapse" onClick={toggleCollapse}></button> : null;


    return (
        <li className={itemClasses}>
            <RovingAccessibleButton className={classes}
                onClick={() => SpaceStore.instance.setActiveSpace(space)}
                role="treeitem"
            >
                { toggleCollapseButton }
                <RoomAvatar width={avatarSize} height={avatarSize} room={space} />
                <span className="mx_SpaceButton_name">{ space.name }</span>
                { notifBadge }
            </RovingAccessibleButton>
            { childItems }
        </li>
    );
}

interface ITreeLevelProps {
    spaces: Room[];
    activeSpaces: Room[];
    isNested?: boolean;
}

const SpaceTreeLevel: React.FC<ITreeLevelProps> = ({
    spaces,
    activeSpaces,
    isNested,
}) => {
    return <ul className="mx_SpaceTreeLevel">
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
