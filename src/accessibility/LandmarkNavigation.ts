/*
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
    // This is the message composer within the room if available or it is the welcome screen shown when no room is selected
    MESSAGE_COMPOSER_OR_HOME,
}

const ORDERED_LANDMARKS = [
    Landmark.ACTIVE_SPACE_BUTTON,
    Landmark.ROOM_SEARCH,
    Landmark.ROOM_LIST,
    Landmark.MESSAGE_COMPOSER_OR_HOME,
];

/**
 * The landmarks are cycled through in the following order:
 * ACTIVE_SPACE_BUTTON <-> ROOM_SEARCH <-> ROOM_LIST <-> MESSAGE_COMPOSER/HOME <-> ACTIVE_SPACE_BUTTON
 */
export class LandmarkNavigation {
    private static getIndexInArray(i: number): number {
        const n = ORDERED_LANDMARKS.length;
        // calculating index in the circular array
        const nextIndex = ((i % n) + n) % n;
        return nextIndex;
    }

    /**
     * Get the next/previous landmark that must be focused from a given landmark
     * @param currentLandmark The current landmark
     * @param backwards If true, the landmark before currentLandmark in ORDERED_LANDMARKS is returned
     * @returns The next landmark to focus
     */
    private static getLandmark(currentLandmark: Landmark, backwards = false): Landmark {
        const currentIndex = ORDERED_LANDMARKS.findIndex((l) => l === currentLandmark);
        const offset = backwards ? -1 : 1;
        const nextIndex = LandmarkNavigation.getIndexInArray(currentIndex + offset);
        const newLandmark = ORDERED_LANDMARKS[nextIndex];
        return newLandmark;
    }

    /**
     * Focus the next landmark from a given landmark.
     * This method will skip over any missing landmarks.
     * @param currentLandmark The current landmark
     * @param backwards If true, search the next landmark to the left in ORDERED_LANDMARKS
     */
    private static findAndFocusNextLandmark(currentLandmark: Landmark, backwards = false): void {
        let somethingWasFocused = false;
        let landmark = currentLandmark;
        while (!somethingWasFocused) {
            landmark = LandmarkNavigation.getLandmark(landmark, backwards);
            somethingWasFocused = focusFunctions[landmark]();
        }
    }

    /**
     * Find and focus the next landmark from a given landmark
     * @param currentLandmark The current landmark
     */
    public static navigateToNextLandmarkFrom(currentLandmark: Landmark): void {
        LandmarkNavigation.findAndFocusNextLandmark(currentLandmark);
    }

    /**
     * Find and focus the previous landmark from a given landmark
     * @param currentLandmark The current landmark
     */
    public static navigateToPreviousLandmarkFrom(currentLandmark: Landmark): void {
        LandmarkNavigation.findAndFocusNextLandmark(currentLandmark, true);
    }
}

/**
 * Keys are the different landmarks and the values are function which when invoked
 * gives focus to the corresponding landmark. These functions return a boolean
 * indicating whether focus was successfully given.
 */
const focusFunctions = {
    [Landmark.ACTIVE_SPACE_BUTTON]: () => {
        const e = document.querySelector<HTMLElement>(".mx_SpaceButton_active");
        e?.focus();
        return !!e;
    },
    [Landmark.ROOM_SEARCH]: () => {
        const e = document.querySelector<HTMLElement>(".mx_RoomSearch");
        e?.focus();
        return !!e;
    },
    [Landmark.ROOM_LIST]: () => {
        const e =
            document.querySelector<HTMLElement>(".mx_RoomTile_selected") ||
            document.querySelector<HTMLElement>(".mx_RoomTile");
        e?.focus();
        return !!e;
    },
    [Landmark.MESSAGE_COMPOSER_OR_HOME]: () => {
        const isComposerOpen = !!document.querySelector(".mx_MessageComposer");
        if (isComposerOpen) {
            const inThread = !!document.activeElement?.closest(".mx_ThreadView");
            defaultDispatcher.dispatch(
                {
                    action: Action.FocusSendMessageComposer,
                    context: inThread ? TimelineRenderingType.Thread : TimelineRenderingType.Room,
                },
                true,
            );
            return true;
        } else {
            const e = document.querySelector<HTMLElement>(".mx_HomePage");
            e?.focus();
            return !!e;
        }
    },
};
