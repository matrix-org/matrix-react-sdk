/*
Copyright 2023 The Matrix.org Foundation C.I.C.

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

import React, { FC, useCallback, useContext, useEffect, useState } from "react";
import { MatrixClient, MatrixEvent, RelationType } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import MatrixClientContext from "../../../contexts/MatrixClientContext";
import useFavouriteMessages from "../../../hooks/useFavouriteMessages";
import ResizeNotifier from "../../../utils/ResizeNotifier";
import FavouriteMessagesPanel from "./FavouriteMessagesPanel";
import { FavouriteMessagesStore, FavouriteStorage } from "../../../stores/FavouriteMessagesStore";

interface IProps {
    resizeNotifier?: ResizeNotifier;

    // Provide this to use a different store for favourite messages
    // e.g. in tests. If not supplied, we use the global default.
    favouriteMessagesStore?: FavouriteMessagesStore;
}

const FavouriteMessagesView: FC<IProps> = ({ resizeNotifier, favouriteMessagesStore }: IProps) => {
    const matrixClient = useContext<MatrixClient>(MatrixClientContext);
    const { getFavouriteMessages, registerFavouritesChangedListener } = useFavouriteMessages(favouriteMessagesStore);
    const [searchQuery, setSearchQuery] = useState("");
    const [favouriteMessageEvents, setFavouriteMessageEvents] = useState<MatrixEvent[] | null>(null);

    const recalcEvents = useCallback(async () => {
        const faves = getFavouriteMessages();
        const newEvents = await calcEvents(searchQuery, faves, matrixClient);
        setFavouriteMessageEvents(newEvents);
    }, [searchQuery, matrixClient, getFavouriteMessages]);

    // Because finding events is async, we do it in useEffect, not useState.
    useEffect(() => {
        recalcEvents();
    }, [searchQuery, recalcEvents]);

    registerFavouritesChangedListener(() => recalcEvents());

    const handleSearchQuery = (query: string): void => {
        setSearchQuery(query);
    };

    const props = {
        favouriteMessageEvents,
        resizeNotifier,
        searchQuery,
        handleSearchQuery,
        cli: matrixClient,
        favouriteMessagesStore,
    };

    return <FavouriteMessagesPanel {...props} />;
};

function filterFavourites(searchQuery: string, favouriteMessages: FavouriteStorage[]): FavouriteStorage[] {
    return favouriteMessages.filter((f) =>
        f.content.body.trim().toLowerCase().includes(searchQuery.trim().toLowerCase()),
    );
}

/** If the event was edited, update it with the replacement content */
async function updateEventIfEdited(event: MatrixEvent, matrixClient: MatrixClient): Promise<void> {
    const roomId = event.getRoomId();
    const eventId = event.getId();
    if (roomId && eventId) {
        const { events } = await matrixClient.relations(roomId, eventId, RelationType.Replace, null, { limit: 1 });
        const editEvent = events?.length > 0 ? events[0] : null;
        if (editEvent) {
            event.makeReplaced(editEvent);
        }
    }
}

/**
 * Use the supplied MatrixClient to fetch the event specified in favourite.
 * Takes a RunState and gives up early if runState.isCancelled().
 */
async function fetchEvent(favourite: FavouriteStorage, matrixClient: MatrixClient): Promise<MatrixEvent | null> {
    try {
        const evJson = await matrixClient.fetchRoomEvent(favourite.roomId, favourite.eventId);
        const event = new MatrixEvent(evJson);
        const roomId = event?.getRoomId();
        const room = roomId ? matrixClient.getRoom(roomId) : null;
        if (!event || !room) {
            return null;
        }

        // Decrypt the event
        if (event.isEncrypted()) {
            // Modifies the event in-place (!)
            await matrixClient.decryptEventIfNeeded(event);
        }

        // Inject sender information
        const sender = event.getSender();
        if (sender) {
            event.sender = room.getMember(sender)!;
        }

        await updateEventIfEdited(event, matrixClient);

        return event;
    } catch (err) {
        logger.error(err);
        return null;
    }
}

/**
 * Use the supplied MatrixClient to fetch all the events for the supplies
 * favouriteMessages, filtered using searchQuery.
 * Takes a RunState and gives up early if runState.isCancelled().
 */
async function calcEvents(
    searchQuery: string,
    favouriteMessages: FavouriteStorage[],
    matrixClient: MatrixClient,
): Promise<MatrixEvent[]> {
    const displayedFavourites: FavouriteStorage[] = filterFavourites(searchQuery, favouriteMessages);
    const promises: Promise<MatrixEvent | null>[] = displayedFavourites.map((f) => fetchEvent(f, matrixClient));
    const events = await Promise.all(promises);
    return events.filter((e) => e !== null) as MatrixEvent[]; // force cast because typescript doesn't understand what `filter` does
}

export default FavouriteMessagesView;
