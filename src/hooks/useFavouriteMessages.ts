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
import { useState } from "react";

interface IButtonProp {
    mxEvent?: MatrixEvent;
}

let sortState = false;
let isSearchClicked = false;

export default function useFavouriteMessages(props?: IButtonProp) {
    const favouriteMessagesIds = JSON.parse(
        localStorage?.getItem("io_element_favouriteMessages")?? "[]") as any[];

    const [, setX] = useState<string[]>();
    const eventId = props?.mxEvent.getId();
    const roomId = props?.mxEvent.getRoomId();
    const content = props?.mxEvent.getContent();

    //checks if an id already exist
    const isFavourite = (): boolean => {
        return favouriteMessagesIds.some(val => val.eventId === eventId);
    };

    const toggleFavourite = () => {
        isFavourite() ? favouriteMessagesIds.splice(favouriteMessagesIds.findIndex(val => val.eventId === eventId), 1)
            : favouriteMessagesIds.push({ eventId, roomId, content });

        //update the local storage
        localStorage.setItem('io_element_favouriteMessages', JSON.stringify(favouriteMessagesIds));

        // This forces a re-render to account for changes in appearance in real-time when the favourite button is toggled
        setX([]);
    };

    const reorderFavouriteMessages = () => {
        sortState = !sortState;
    };

    const setSearchState = (val: boolean) => {
        isSearchClicked = val;
    };

    const clearFavouriteMessages = () => {
        localStorage.removeItem('io_element_favouriteMessages');
    };

    const getFavouriteMessagesIds = () => {
        return sortState ? favouriteMessagesIds.reverse(): favouriteMessagesIds;
    };

    return {
        isFavourite,
        toggleFavourite,
        getFavouriteMessagesIds,
        reorderFavouriteMessages,
        clearFavouriteMessages,
        setSearchState,
        isSearchClicked,

    };
}
