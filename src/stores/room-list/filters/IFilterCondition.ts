/*
Copyright 2020, 2021 The Matrix.org Foundation C.I.C.

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

import { Room } from "matrix-js-sdk/src/models/room";
import { EventEmitter } from "events";

export const FILTER_CHANGED = "filter_changed";

export enum FilterKind {
    /**
     * A prefilter is one which coarsely determines which rooms are
     * available for runtime filtering/rendering. Typically this will
     * be things like Space selection.
     */
    Prefilter,

    /**
     * Runtime filters operate on the data set exposed by prefilters.
     * Typically these are dynamic values like room name searching.
     */
    Runtime,
}

/**
 * A filter condition for the room list, determining if a room
 * should be shown or not.
 *
 * All filter conditions are expected to be stable executions,
 * meaning that given the same input the same answer will be
 * returned (thus allowing caching). As such, filter conditions
 * can, but shouldn't, do heavier logic and not worry about being
 * called constantly by the room list. When the condition changes
 * such that different inputs lead to different answers (such
 * as a change in the user's input), this emits FILTER_CHANGED.
 */
export interface IFilterCondition extends EventEmitter {
    /**
     * The kind of filter this presents.
     */
    kind: FilterKind;

    /**
     * Determines if a given room should be visible under this
     * condition.
     * @param room The room to check.
     * @returns True if the room should be visible.
     */
    isVisible(room: Room): boolean;
}
