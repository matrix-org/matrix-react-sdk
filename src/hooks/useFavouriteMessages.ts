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
    mxEvent: MatrixEvent;
}

const favouriteMessageIds = JSON.parse(
    localStorage?.getItem("io_element_favouriteMessages")?? "[]") as any[];

export default function useFavouriteMessages({ mxEvent }: IButtonProp) {
    const [, setX] = useState<string[]>();
    const eventId = mxEvent.getId();
    const roomId = mxEvent.getRoomId();

    //checks if an id already exist
    const isFavourite = (): boolean => {
        return favouriteMessageIds.some(val => val.eventId === eventId);
    };

    const toggleFavourite = () => {
        isFavourite() ? favouriteMessageIds.splice(favouriteMessageIds.findIndex(val => val.eventId === eventId), 1)
            : favouriteMessageIds.push({ eventId, roomId });

        //update the local storage
        localStorage.setItem('io_element_favouriteMessages', JSON.stringify(favouriteMessageIds));

        // This forces a re-render to account for changes in appearance in real-time when the favourite button is toggled
        setX([]);
    };

    return { isFavourite, toggleFavourite };
}
