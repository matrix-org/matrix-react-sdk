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
import { NotificationCountType, Room } from "matrix-js-sdk/src/matrix";

import RoomListStore from "../../../../stores/room-list/RoomListStore";
import { doesRoomHaveUnreadThreads } from "../../../../Unread";
import { NotificationLevel } from "../../../../stores/notifications/NotificationLevel";

/**
 * Return the list of rooms with unread threads, and their notification state.
 * The list is computed when open is true
 * @param open
 * @returns {Array<{ room: Room; notificationState: ThreadsActivityNotificationState }>}
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
            .map((room) => ({ room, notificationLevel: getNotificationState(room) }));
    }, [open]);
}

/**
 * Return the notification state for a room
 * @param room
 * @returns {ThreadsActivityNotificationState}
 */
function getNotificationState(room: Room): NotificationLevel {
    const notificationCountType = room.threadsAggregateNotificationType;
    switch (notificationCountType) {
        case NotificationCountType.Highlight:
            return NotificationLevel.Highlight;
        case NotificationCountType.Total:
            return NotificationLevel.Notification;
        default:
            return NotificationLevel.Activity;
    }
}
