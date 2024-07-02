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
 */

import { TimelineRenderingType } from "../contexts/RoomContext";
import { Action } from "../dispatcher/actions";
import defaultDispatcher from "../dispatcher/dispatcher";

export const enum Landmark {
    // This is the space/home button in the left panel.
    ACTIVE_SPACE_BUTTON,
    // This is the room filter in the left panel.
    ROOM_SEARCH,
    // This is the currently opened room/first room in the room list in the left panel.
    ROOM_LIST,
    // This is the message composer within the room.
    MESSAGE_COMPOSER,
    // This is the welcome screen shown when no room is selected
    HOME,
}

/**
 * The landmarks are cycled through in the following order:
 * ACTIVE_SPACE_BUTTON <-> ROOM_SEARCH <-> ROOM_LIST <-> MESSAGE_COMPOSER/HOME <-> ACTIVE_SPACE_BUTTON
 */
class LandmarkCollections {
    /**
     * Find the next landmark from a given landmark
     * @param currentLandmark The current landmark
     * @returns The next landmark in sequence
     */
    public static nextLandmarkFrom(currentLandmark: Landmark): Landmark {
        switch (currentLandmark) {
            case Landmark.ACTIVE_SPACE_BUTTON:
                return Landmark.ROOM_SEARCH;
            case Landmark.ROOM_SEARCH:
                return Landmark.ROOM_LIST;
            case Landmark.ROOM_LIST: {
                // Switch to composer if available otherwise the home component
                const isComposerOpen = !!document.querySelector(".mx_MessageComposer");
                return isComposerOpen ? Landmark.MESSAGE_COMPOSER : Landmark.HOME;
            }
            case Landmark.MESSAGE_COMPOSER:
                return Landmark.ACTIVE_SPACE_BUTTON;
            case Landmark.HOME:
                return Landmark.ACTIVE_SPACE_BUTTON;
        }
    }

    /**
     * Find the previous landmark from a given landmark
     * @param currentLandmark The current landmark
     * @returns The previous landmark
     */
    public static previousLandmarkFrom(currentLandmark: Landmark): Landmark {
        switch (currentLandmark) {
            case Landmark.ACTIVE_SPACE_BUTTON: {
                const isComposerOpen = !!document.querySelector(".mx_MessageComposer");
                // Switch to composer if available otherwise the home component
                return isComposerOpen ? Landmark.MESSAGE_COMPOSER : Landmark.HOME;
            }
            case Landmark.ROOM_SEARCH:
                return Landmark.ACTIVE_SPACE_BUTTON;
            case Landmark.ROOM_LIST:
                return Landmark.ROOM_SEARCH;
            case Landmark.MESSAGE_COMPOSER:
                return Landmark.ROOM_LIST;
            case Landmark.HOME:
                return Landmark.ROOM_LIST;
        }
    }
}

/**
 * Keys are the different landmarks and the values are function which when invoked
 * gives focus to the corresponding landmark.
 */
const focusFunctions = {
    [Landmark.ACTIVE_SPACE_BUTTON]: () => {
        document.querySelector<HTMLElement>(".mx_SpaceButton_active")?.focus();
    },
    [Landmark.ROOM_SEARCH]: () => {
        document.querySelector<HTMLElement>(".mx_RoomSearch")?.focus();
    },
    [Landmark.ROOM_LIST]: () => {
        (
            document.querySelector<HTMLElement>(".mx_RoomTile_selected") ||
            document.querySelector<HTMLElement>(".mx_RoomTile")
        )?.focus();
    },
    [Landmark.MESSAGE_COMPOSER]: () => {
        const inThread = !!document.activeElement?.closest(".mx_ThreadView");
        defaultDispatcher.dispatch(
            {
                action: Action.FocusSendMessageComposer,
                context: inThread ? TimelineRenderingType.Thread : TimelineRenderingType.Room,
            },
            true,
        );
    },
    [Landmark.HOME]: () => {
        document.querySelector<HTMLElement>(".mx_HomePage")?.focus();
    },
};

/**
 * Focus on the next/previous landmark
 * @param currentLandmark The landmark from which this function is called
 * @param backward If true, the previous landmark is focused. Otherwise the next landmark is focused.
 */
export function navigateLandmark(currentLandmark: Landmark, backward: boolean = false): void {
    const newLandmark = backward
        ? LandmarkCollections.previousLandmarkFrom(currentLandmark)
        : LandmarkCollections.nextLandmarkFrom(currentLandmark);
    focusFunctions[newLandmark]();
}
