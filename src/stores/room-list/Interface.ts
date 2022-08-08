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

import { MatrixClient } from "matrix-js-sdk/src/client";
import { Room } from "matrix-js-sdk/src/models/room";

import { ITagMap, ListAlgorithm, SortAlgorithm } from "./algorithms/models";
import { RoomUpdateCause, TagID } from "./models";
import { IFilterCondition } from "./filters/IFilterCondition";

export interface RoomListStore {
    get orderedLists(): ITagMap;
    resetStore(): Promise<void>; // intended for test usage
    makeReady(forcedClient?: MatrixClient): Promise<void>;
    setTagSorting(tagId: TagID, sort: SortAlgorithm): void;
    getTagSorting(tagId: TagID): SortAlgorithm;
    setListOrder(tagId: TagID, order: ListAlgorithm): void;
    getListOrder(tagId: TagID): ListAlgorithm;
    regenerateAllLists(params: { trigger: boolean }): void;
    addFilter(filter: IFilterCondition): Promise<void>;
    removeFilter(filter: IFilterCondition): void;
    getTagsForRoom(room: Room): TagID[];
    manualRoomUpdate(room: Room, cause: RoomUpdateCause): Promise<void>;
    manualRoomUpdate(room: Room, cause: RoomUpdateCause): Promise<void>;
}
