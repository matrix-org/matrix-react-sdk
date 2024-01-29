/*
 *
 * Copyright 2024 The Matrix.org Foundation C.I.C.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * /
 */

import { useMemo } from "react";
import { Room } from "matrix-js-sdk/src/matrix";

import RoomListStore from "../../../../stores/room-list/RoomListStore";
import { doesRoomHaveUnreadThreads } from "../../../../Unread";
import { NotificationLevel } from "../../../../stores/notifications/NotificationLevel";
import { getThreadNotificationLevel } from "../../../../utils/notifications";

/**
 * Return the list of rooms with unread threads, and their notification level.
 * The list is computed when open is true
 * @param open
 * @returns {Array<{ room: Room; notificationLevel: NotificationLevel }>}
 */
export function useUnreadThreadRooms(open: boolean): Array<{ room: Room; notificationLevel: NotificationLevel }> {
    return useMemo(() => {
        if (!open) return [];

        return Object.values(RoomListStore.instance.orderedLists)
            .reduce((acc, rooms) => {
                acc.push(...rooms);
                return acc;
            }, [])
            .filter((room) => doesRoomHaveUnreadThreads(room))
            .map((room) => ({ room, notificationLevel: getThreadNotificationLevel(room) }))
            .sort((a, b) => sortRoom(a.notificationLevel, b.notificationLevel));
    }, [open]);
}

/**
 * Sort notification level by the most important notification level to the least important
 * Highlight > Notification > Activity
 * @param notificationLevelA - notification level of room A
 * @param notificationLevelB - notification level of room B
 * @returns {number}
 */
function sortRoom(notificationLevelA: NotificationLevel, notificationLevelB: NotificationLevel): number {
    // NotificationLevel is a numeric enum, so we can compare them directly
    if (notificationLevelA > notificationLevelB) return -1;
    else if (notificationLevelB > notificationLevelA) return 1;
    else return 0;
}
