/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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

import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { useCallback, useEffect } from "react";

import { FavouriteMessagesStore, FavouriteStorage } from "../stores/FavouriteMessagesStore";

export default function useFavouriteMessages(favouriteMessageStore = FavouriteMessagesStore.instance): {
    getFavouriteMessages: () => FavouriteStorage[];
    isFavourite: (eventId: string) => boolean;
    toggleFavourite: (mxEvent: MatrixEvent) => void;
    clearFavouriteMessages: () => void;
    registerFavouritesChangedListener: (listener: () => void) => void;
} {
    const myListeners = [];

    const isFavourite: (eventId: string) => boolean = useCallback(
        (eventId: string): boolean => favouriteMessageStore.isFavourite(eventId),
        [favouriteMessageStore],
    );

    const toggleFavourite: (mxEvent: MatrixEvent) => void = useCallback(
        async (mxEvent: MatrixEvent) => {
            const eventId = mxEvent.getId() ?? "";
            const roomId = mxEvent.getRoomId() ?? "";
            const content = mxEvent.getContent() ?? {};
            await favouriteMessageStore.toggleFavourite(eventId, roomId, content);
        },
        [favouriteMessageStore],
    );

    const clearFavouriteMessages: () => void = useCallback(async () => {
        await favouriteMessageStore.clearAll();
    }, [favouriteMessageStore]);

    const getFavouriteMessages: () => FavouriteStorage[] = useCallback(() => {
        return favouriteMessageStore.allFavourites();
    }, [favouriteMessageStore]);

    const registerFavouritesChangedListener = (listener: () => void): void => {
        favouriteMessageStore.addUpdatedListener(listener);
        myListeners.push(listener);
    };

    useEffect(() => {
        return () => {
            for (const listener of myListeners) {
                favouriteMessageStore.removeUpdatedListener(listener);
            }
        };
    });

    return {
        getFavouriteMessages,
        isFavourite,
        toggleFavourite,
        clearFavouriteMessages,
        registerFavouritesChangedListener,
    };
}
