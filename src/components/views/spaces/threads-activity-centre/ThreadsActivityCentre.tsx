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

import React, { JSX, useMemo, useState } from "react";
import { Menu, MenuItem } from "@vector-im/compound-web";
import { Room } from "matrix-js-sdk/src/matrix";

import { ThreadsActivityCentreButton } from "./ThreadsActivityCentreButton";
import { _t } from "../../../../languageHandler";
import RoomListStore from "../../../../stores/room-list/RoomListStore";
import DecoratedRoomAvatar from "../../avatars/DecoratedRoomAvatar";
import { Action } from "../../../../dispatcher/actions";
import defaultDispatcher from "../../../../dispatcher/dispatcher";
import { ViewRoomPayload } from "../../../../dispatcher/payloads/ViewRoomPayload";
import { ThreadsActivityCentreBadge } from "./ThreadsActivityCentreBadge";
import RightPanelStore from "../../../../stores/right-panel/RightPanelStore";
import { RightPanelPhases } from "../../../../stores/right-panel/RightPanelStorePhases";

interface ThreadsActivityCentreProps {
    /**
     * Display the `Treads` label next to the icon.
     */
    displayButtonLabel?: boolean;
}

/**
 * Display in a popup the list of rooms with unread threads.
 * The popup is displayed when the user clicks on the `Threads` button.
 */
export function ThreadsActivityCentre({ displayButtonLabel }: ThreadsActivityCentreProps): JSX.Element {
    const [open, setOpen] = useState(false);
    const rooms = useUnreadThreadRooms(open);

    return (
        <Menu
            align="end"
            open={open}
            onOpenChange={setOpen}
            side="right"
            title={_t("threads_activity_centre|header")}
            trigger={<ThreadsActivityCentreButton displayLabel={displayButtonLabel} />}
        >
            {/* Make the content of the pop-up scrollable */}
            <div className="mx_ThreadsActivity_rows">
                {rooms.map((room) => (
                    <ThreadsActivityRow key={room.roomId} room={room} onClick={() => setOpen(false)} />
                ))}
            </div>
        </Menu>
    );
}

interface ThreadsActivityRow {
    /**
     * The room with unread threads.
     */
    room: Room;
    /**
     * Callback when the user clicks on the row.
     */
    onClick: () => void;
}

/**
 * Display a room with unread threads.
 */
function ThreadsActivityRow({ room, onClick }: ThreadsActivityRow): JSX.Element {
    return (
        <MenuItem
            className="mx_ThreadsActivityRow"
            onSelect={(event: Event) => {
                onClick();

                // Set the right panel card for that room so the threads panel is open before we dispatch,
                // so it will open once the room appears.
                RightPanelStore.instance.setCard({ phase: RightPanelPhases.ThreadPanel }, true, room.roomId);

                // Display the selected room in the timeline
                defaultDispatcher.dispatch<ViewRoomPayload>({
                    action: Action.ViewRoom,
                    show_room_tile: true, // make sure the room is visible in the list
                    room_id: room.roomId,
                    metricsTrigger: "RoomList",
                    metricsViaKeyboard: event.type !== "click",
                });
            }}
            label={room.name}
            Icon={<DecoratedRoomAvatar room={room} size="32px" />}
        >
            {/* TODO set the unread state of the room threads */}
            <ThreadsActivityCentreBadge state="highlight" />
        </MenuItem>
    );
}

/**
 * TODO
 * Temporary returns all the rooms to get some data to play with
 * @param open
 */
function useUnreadThreadRooms(open: boolean): Array<Room> {
    return useMemo(() => {
        if (!open) return [];

        return Object.values(RoomListStore.instance.orderedLists).reduce((acc, rooms) => {
            acc.push(...rooms);
            return acc;
        }, []);
    }, [open]);
}
