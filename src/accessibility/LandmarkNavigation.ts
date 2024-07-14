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
     * Find the next landmark from a given landmark
     * @param currentLandmark The current landmark
     * @returns The next landmark in sequence
     */
    public static navigateToNextLandmarkFrom(currentLandmark: Landmark): void {
        const currentIndex = ORDERED_LANDMARKS.findIndex((l) => l === currentLandmark);
        const nextIndex = LandmarkNavigation.getIndexInArray(currentIndex + 1);
        const newLandmark = ORDERED_LANDMARKS[nextIndex];
        focusFunctions[newLandmark]();
    }

    /**
     * Find the previous landmark from a given landmark
     * @param currentLandmark The current landmark
     * @returns The previous landmark
     */
    public static navigateToPreviousLandmarkFrom(currentLandmark: Landmark): void {
        const currentIndex = ORDERED_LANDMARKS.findIndex((l) => l === currentLandmark);
        const nextIndex = LandmarkNavigation.getIndexInArray(currentIndex - 1);
        const newLandmark = ORDERED_LANDMARKS[nextIndex];
        focusFunctions[newLandmark]();
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
        } else {
            document.querySelector<HTMLElement>(".mx_HomePage")?.focus();
        }
    },
};
