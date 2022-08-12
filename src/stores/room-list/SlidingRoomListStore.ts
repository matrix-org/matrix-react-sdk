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
import { logger } from "matrix-js-sdk/src/logger";
import { RoomUpdateCause, TagID } from "./models";
import { ITagMap, ListAlgorithm, SortAlgorithm } from "./algorithms/models";
import { ActionPayload } from "../../dispatcher/payloads";
import defaultDispatcher from "../../dispatcher/dispatcher";
import { IFilterCondition } from "./filters/IFilterCondition";
import { AsyncStoreWithClient } from "../AsyncStoreWithClient";
import { RoomListStore as Interface, RoomListStoreEvent } from "./Interface";
import { SlidingSyncManager } from "../../SlidingSyncManager";

interface IState {
    // state is tracked in underlying classes
}

export const SlidingSyncSortToFilter: Record<SortAlgorithm, string[]> = {
    [SortAlgorithm.Alphabetic]: ["by_name", "by_recency"],
    [SortAlgorithm.Recent]: ["by_highlight_count", "by_notification_count", "by_recency"],
    [SortAlgorithm.Manual]: ["by_recency"],
};

export const LISTS_UPDATE_EVENT = RoomListStoreEvent.ListsUpdate;

export class SlidingRoomListStoreClass extends AsyncStoreWithClient<IState> implements Interface {
    private tagIdToSortAlgo: Record<TagID,SortAlgorithm> = {};

    constructor() {
        super(defaultDispatcher);
        this.setMaxListeners(20); // RoomList + LeftPanel + 8xRoomSubList + spares
    }

    public async setTagSorting(tagId: TagID, sort: SortAlgorithm) {
        this.tagIdToSortAlgo[tagId] = sort;
        const slidingSyncIndex = SlidingSyncManager.instance.getOrAllocateListIndex(tagId);
        switch (sort) {
            case SortAlgorithm.Alphabetic:
                await SlidingSyncManager.instance.ensureListRegistered(
                    slidingSyncIndex, {
                        sort: SlidingSyncSortToFilter[SortAlgorithm.Alphabetic],
                    },
                );
                break;
            case SortAlgorithm.Recent:
                await SlidingSyncManager.instance.ensureListRegistered(
                    slidingSyncIndex, {
                        sort: SlidingSyncSortToFilter[SortAlgorithm.Recent],
                    },
                );
                break;
            case SortAlgorithm.Manual:
                logger.error("cannot enable manual sort in sliding sync mode");
                break;
            default:
                logger.error("unknown sort mode: ", sort);
        }
    }

    public getTagSorting(tagId: TagID): SortAlgorithm {
        let algo = this.tagIdToSortAlgo[tagId];
        if (!algo) {
            logger.warn("SlidingRoomListStore.getTagSorting: no sort algorithm for tag ", tagId);
            algo = SortAlgorithm.Recent; // why not, we have to do something..
        }
        return algo;
    }


    public setListOrder(tagId: TagID, order: ListAlgorithm) {
        // TODO?
    }


    public getListOrder(tagId: TagID): ListAlgorithm {
        // TODO: handle unread msgs first?
        return ListAlgorithm.Natural;
    }

    /**
     * Adds a filter condition to the room list store. Filters may be applied async,
     * and thus might not cause an update to the store immediately.
     * @param {IFilterCondition} filter The filter condition to add.
     */
    public async addFilter(filter: IFilterCondition): Promise<void> {
        // Do nothing, the filters are only used by SpaceWatcher to see if a room should appear
        // in the room list. We do not support arbitrary code for filters in sliding sync.
    }

    /**
     * Removes a filter condition from the room list store. If the filter was
     * not previously added to the room list store, this will no-op. The effects
     * of removing a filter may be applied async and therefore might not cause
     * an update right away.
     * @param {IFilterCondition} filter The filter condition to remove.
     */
    public removeFilter(filter: IFilterCondition): void {
        // Do nothing, the filters are only used by SpaceWatcher to see if a room should appear
        // in the room list. We do not support arbitrary code for filters in sliding sync.
    }

    /**
     * Gets the tags for a room identified by the store. The returned set
     * should never be empty, and will contain DefaultTagID.Untagged if
     * the store is not aware of any tags.
     * @param room The room to get the tags for.
     * @returns The tags for the room.
     */
    public getTagsForRoom(room: Room): TagID[] {
        // check all lists for each tag we know about and see if the room is there
        const tags = [];
        for (let tagId in this.tagIdToSortAlgo) {
            const index = SlidingSyncManager.instance.getOrAllocateListIndex(tagId);
            let { roomIndexToRoomId } = SlidingSyncManager.instance.slidingSync.getListData(index);
            for (let roomIndex in roomIndexToRoomId) {
                const roomId = roomIndexToRoomId[roomIndex];
                if (roomId === room.roomId) {
                    tags.push(tagId);
                    break;
                }
            }
        }
        console.log("SlidingRoomListStore.getTagsForRoom ", room.roomId, " => ", tags);
        return tags;
    }

    /**
     * Manually update a room with a given cause. This should only be used if the
     * room list store would otherwise be incapable of doing the update itself. Note
     * that this may race with the room list's regular operation.
     * @param {Room} room The room to update.
     * @param {RoomUpdateCause} cause The cause to update for.
     */
    public async manualRoomUpdate(room: Room, cause: RoomUpdateCause) {
        // TODO: this is only used when you forget a room, not that important for now.
    }

    public get orderedLists(): ITagMap {
        const tagMap: ITagMap = {};
        for (let tagId in this.tagIdToSortAlgo) {
            const index = SlidingSyncManager.instance.getOrAllocateListIndex(tagId);
            let { roomIndexToRoomId } = SlidingSyncManager.instance.slidingSync.getListData(index);
            const rooms = [];
            for (let roomIndex in roomIndexToRoomId) {
                const roomId = roomIndexToRoomId[roomIndex];
                const r = this.matrixClient.getRoom(roomId);
                if (r) {
                    rooms.push(r);
                }
            }
            tagMap[tagId] = rooms;
        }
        console.log("SlidingRoomListStore.orderedLists", tagMap);
        return tagMap;
    }


    // Intended for test usage
    public async resetStore() {
        // Test function
    }

    // Public for test usage. Do not call this.
    public async makeReady(forcedClient?: MatrixClient) {
        // Test function
    }

    /**
     * Regenerates the room whole room list, discarding any previous results.
     *
     * Note: This is only exposed externally for the tests. Do not call this from within
     * the app.
     * @param trigger Set to false to prevent a list update from being sent. Should only
     * be used if the calling code will manually trigger the update.
     */
    public regenerateAllLists({ trigger = true }) {
        // Test function
    }

    protected async onReady(): Promise<any> {
        await this.makeReady();
    }

    protected async onNotReady(): Promise<any> {
        await this.resetStore();
    }

    protected async onAction(payload: ActionPayload) {
    }

    protected async onDispatchAsync(payload: ActionPayload) {
    }
}
