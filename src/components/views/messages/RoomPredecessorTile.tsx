/*
Copyright 2018 New Vector Ltd
Copyright 2019, 2023 The Matrix.org Foundation C.I.C.

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

import React, { useCallback, useContext } from "react";
import { logger } from "matrix-js-sdk/src/logger";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { Room } from "matrix-js-sdk/src/matrix";

import dis from "../../../dispatcher/dispatcher";
import { Action } from "../../../dispatcher/actions";
import { RoomPermalinkCreator } from "../../../utils/permalinks/Permalinks";
import { _t } from "../../../languageHandler";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import EventTileBubble from "./EventTileBubble";
import { ViewRoomPayload } from "../../../dispatcher/payloads/ViewRoomPayload";
import RoomContext from "../../../contexts/RoomContext";
import { useRoomState } from "../../../hooks/useRoomState";
import SettingsStore from "../../../settings/SettingsStore";
import MatrixToPermalinkConstructor from "../../../utils/permalinks/MatrixToPermalinkConstructor";

interface IProps {
    /** The m.room.create MatrixEvent that this tile represents */
    mxEvent: MatrixEvent;
    timestamp?: JSX.Element;
}

/**
 * A message tile showing that this room was created as an upgrade of a previous
 * room.
 */
export const RoomPredecessorTile: React.FC<IProps> = ({ mxEvent, timestamp }) => {
    const msc3946ProcessDynamicPredecessor = SettingsStore.getValue("feature_dynamic_room_predecessors");

    // Note: we ask the room for its predecessor here, instead of directly using
    // the information inside mxEvent. This allows us the flexibility later to
    // use a different predecessor (e.g. through MSC3946) and still display it
    // in the timeline location of the create event.
    const roomContext = useContext(RoomContext);
    const predecessor = useRoomState(
        roomContext.room,
        useCallback(
            (state) => state.findPredecessor(msc3946ProcessDynamicPredecessor),
            [msc3946ProcessDynamicPredecessor],
        ),
    );

    const onLinkClicked = useCallback(
        (e: React.MouseEvent): void => {
            e.preventDefault();

            dis.dispatch<ViewRoomPayload>({
                action: Action.ViewRoom,
                event_id: predecessor.eventId,
                highlighted: true,
                room_id: predecessor.roomId,
                metricsTrigger: "Predecessor",
                metricsViaKeyboard: e.type !== "click",
            });
        },
        [predecessor?.eventId, predecessor?.roomId],
    );

    if (!roomContext.room || roomContext.room.roomId !== mxEvent.getRoomId()) {
        logger.warn(
            "RoomPredecessorTile unexpectedly used outside of the context of the" +
                "room containing this m.room.create event.",
        );
        return <></>;
    }

    if (!predecessor) {
        logger.warn("RoomPredecessorTile unexpectedly used in a room with no predecessor.");
        return <div />;
    }

    const prevRoom = MatrixClientPeg.get().getRoom(predecessor.roomId);

    // We need either the previous room, or some servers to find it with.
    // Otherwise, we must bail out here
    if (!prevRoom && !predecessor.viaServers) {
        logger.warn(`Failed to find predecessor room with id ${predecessor.roomId}`);
        return (
            <EventTileBubble
                className="mx_CreateEvent"
                title={_t("This room is a continuation of another conversation.")}
                timestamp={timestamp}
            >
                <div className="mx_EventTile_body">
                    <span className="mx_EventTile_tileError">
                        {_t("Can't find the old version of this room (room id: %(roomId)s).", {
                            roomId: predecessor.roomId,
                        })}
                    </span>
                </div>
            </EventTileBubble>
        );
    }

    const predecessorPermalink = prevRoom
        ? createLinkWithRoom(prevRoom, predecessor.roomId, predecessor.eventId)
        : createLinkWithoutRoom(predecessor.roomId, predecessor.viaServers, predecessor.eventId);

    const link = (
        <a href={predecessorPermalink} onClick={onLinkClicked}>
            {_t("Click here to see older messages.")}
        </a>
    );

    return (
        <EventTileBubble
            className="mx_CreateEvent"
            title={_t("This room is a continuation of another conversation.")}
            subtitle={link}
            timestamp={timestamp}
        />
    );

    function createLinkWithRoom(room: Room, roomId: string, eventId?: string): string {
        const permalinkCreator = new RoomPermalinkCreator(room, roomId);
        permalinkCreator.load();
        if (eventId) {
            return permalinkCreator.forEvent(eventId);
        } else {
            return permalinkCreator.forRoom();
        }
    }

    function createLinkWithoutRoom(roomId: string, viaServers: string[], eventId?: string): string {
        const matrixToPermalinkConstructor = new MatrixToPermalinkConstructor();
        if (eventId) {
            return matrixToPermalinkConstructor.forEvent(roomId, eventId, viaServers);
        } else {
            return matrixToPermalinkConstructor.forRoom(roomId, viaServers);
        }
    }
};
