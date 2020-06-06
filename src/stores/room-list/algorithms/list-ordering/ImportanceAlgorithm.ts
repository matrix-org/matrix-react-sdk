/*
Copyright 2018, 2019 New Vector Ltd
Copyright 2020 The Matrix.org Foundation C.I.C.

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

import { Algorithm } from "./Algorithm";
import { Room } from "matrix-js-sdk/src/models/room";
import { RoomUpdateCause, TagID } from "../../models";
import { ITagMap, SortAlgorithm } from "../models";
import { sortRoomsWithAlgorithm } from "../tag-sorting";
import * as Unread from '../../../../Unread';

/**
 * The determined category of a room.
 */
export enum Category {
    /**
     * The room has unread mentions within.
     */
    Red = "RED",
    /**
     * The room has unread notifications within. Note that these are not unread
     * mentions - they are simply messages which the user has asked to cause a
     * badge count update or push notification.
     */
    Grey = "GREY",
    /**
     * The room has unread messages within (grey without the badge).
     */
    Bold = "BOLD",
    /**
     * The room has no relevant unread messages within.
     */
    Idle = "IDLE",
}

interface ICategorizedRoomMap {
    // @ts-ignore - TS wants this to be a string, but we know better
    [category: Category]: Room[];
}

interface ICategoryIndex {
    // @ts-ignore - TS wants this to be a string, but we know better
    [category: Category]: number; // integer
}

// Caution: changing this means you'll need to update a bunch of assumptions and
// comments! Check the usage of Category carefully to figure out what needs changing
// if you're going to change this array's order.
const CATEGORY_ORDER = [Category.Red, Category.Grey, Category.Bold, Category.Idle];

/**
 * An implementation of the "importance" algorithm for room list sorting. Where
 * the tag sorting algorithm does not interfere, rooms will be ordered into
 * categories of varying importance to the user. Alphabetical sorting does not
 * interfere with this algorithm, however manual ordering does.
 *
 * The importance of a room is defined by the kind of notifications, if any, are
 * present on the room. These are classified internally as Red, Grey, Bold, and
 * Idle. Red rooms have mentions, grey have unread messages, bold is a less noisy
 * version of grey, and idle means all activity has been seen by the user.
 *
 * The algorithm works by monitoring all room changes, including new messages in
 * tracked rooms, to determine if it needs a new category or different placement
 * within the same category. For more information, see the comments contained
 * within the class.
 */
export class ImportanceAlgorithm extends Algorithm {

    // HOW THIS WORKS
    // --------------
    //
    // This block of comments assumes you've read the README one level higher.
    // You should do that if you haven't already.
    //
    // Tags are fed into the algorithmic functions from the Algorithm superclass,
    // which cause subsequent updates to the room list itself. Categories within
    // those tags are tracked as index numbers within the array (zero = top), with
    // each sticky room being tracked separately. Internally, the category index
    // can be found from `this.indices[tag][category]` and the sticky room information
    // from `this.stickyRoom`.
    //
    // The room list store is always provided with the `this.cached` results, which are
    // updated as needed and not recalculated often. For example, when a room needs to
    // move within a tag, the array in `this.cached` will be spliced instead of iterated.
    // The `indices` help track the positions of each category to make splicing easier.

    private indices: {
        // @ts-ignore - TS wants this to be a string but we know better than it
        [tag: TagID]: ICategoryIndex;
    } = {};

    // TODO: Use this (see docs above)
    private stickyRoom: {
        roomId: string;
        tag: TagID;
        fromTop: number;
    } = {
        roomId: null,
        tag: null,
        fromTop: 0,
    };

    constructor() {
        super();
        console.log("Constructed an ImportanceAlgorithm");
    }

    // noinspection JSMethodCanBeStatic
    private categorizeRooms(rooms: Room[]): ICategorizedRoomMap {
        const map: ICategorizedRoomMap = {
            [Category.Red]: [],
            [Category.Grey]: [],
            [Category.Bold]: [],
            [Category.Idle]: [],
        };
        for (const room of rooms) {
            const category = this.getRoomCategory(room);
            map[category].push(room);
        }
        return map;
    }

    // noinspection JSMethodCanBeStatic
    private getRoomCategory(room: Room): Category {
        // Function implementation borrowed from old RoomListStore

        const mentions = room.getUnreadNotificationCount('highlight') > 0;
        if (mentions) {
            return Category.Red;
        }

        let unread = room.getUnreadNotificationCount() > 0;
        if (unread) {
            return Category.Grey;
        }

        unread = Unread.doesRoomHaveUnreadMessages(room);
        if (unread) {
            return Category.Bold;
        }

        return Category.Idle;
    }

    protected async generateFreshTags(updatedTagMap: ITagMap): Promise<any> {
        for (const tagId of Object.keys(updatedTagMap)) {
            const unorderedRooms = updatedTagMap[tagId];

            const sortBy = this.sortAlgorithms[tagId];
            if (!sortBy) throw new Error(`${tagId} does not have a sorting algorithm`);

            if (sortBy === SortAlgorithm.Manual) {
                // Manual tags essentially ignore the importance algorithm, so don't do anything
                // special about them.
                updatedTagMap[tagId] = await sortRoomsWithAlgorithm(unorderedRooms, tagId, sortBy);
            } else {
                // Every other sorting type affects the categories, not the whole tag.
                const categorized = this.categorizeRooms(unorderedRooms);
                for (const category of Object.keys(categorized)) {
                    const roomsToOrder = categorized[category];
                    categorized[category] = await sortRoomsWithAlgorithm(roomsToOrder, tagId, sortBy);
                }

                const newlyOrganized: Room[] = [];
                const newIndices: ICategoryIndex = {};

                for (const category of CATEGORY_ORDER) {
                    newIndices[category] = newlyOrganized.length;
                    newlyOrganized.push(...categorized[category]);
                }

                this.indices[tagId] = newIndices;
                updatedTagMap[tagId] = newlyOrganized;
            }
        }
    }

    public async handleRoomUpdate(room: Room, cause: RoomUpdateCause): Promise<boolean> {
        const tags = this.roomIdsToTags[room.roomId];
        if (!tags) {
            console.warn(`No tags known for "${room.name}" (${room.roomId})`);
            return false;
        }
        const category = this.getRoomCategory(room);
        let changed = false;
        for (const tag of tags) {
            if (this.sortAlgorithms[tag] === SortAlgorithm.Manual) {
                continue; // Nothing to do here.
            }

            const taggedRooms = this.cached[tag];
            const indices = this.indices[tag];
            let roomIdx = taggedRooms.indexOf(room);
            if (roomIdx === -1) {
                console.warn(`Degrading performance to find missing room in "${tag}": ${room.roomId}`);
                roomIdx = taggedRooms.findIndex(r => r.roomId === room.roomId);
            }
            if (roomIdx === -1) {
                throw new Error(`Room ${room.roomId} has no index in ${tag}`);
            }

            // Try to avoid doing array operations if we don't have to: only move rooms within
            // the categories if we're jumping categories
            const oldCategory = this.getCategoryFromIndices(roomIdx, indices);
            if (oldCategory !== category) {
                // Move the room and update the indices
                this.moveRoomIndexes(1, oldCategory, category, indices);
                taggedRooms.splice(roomIdx, 1); // splice out the old index (fixed position)
                taggedRooms.splice(indices[category], 0, room); // splice in the new room (pre-adjusted)
                // Note: if moveRoomIndexes() is called after the splice then the insert operation
                // will happen in the wrong place. Because we would have already adjusted the index
                // for the category, we don't need to determine how the room is moving in the list.
                // If we instead tried to insert before updating the indices, we'd have to determine
                // whether the room was moving later (towards IDLE) or earlier (towards RED) from its
                // current position, as it'll affect the category's start index after we remove the
                // room from the array.
            }

            // The room received an update, so take out the slice and sort it. This should be relatively
            // quick because the room is inserted at the top of the category, and most popular sorting
            // algorithms will deal with trying to keep the active room at the top/start of the category.
            // For the few algorithms that will have to move the thing quite far (alphabetic with a Z room
            // for example), the list should already be sorted well enough that it can rip through the
            // array and slot the changed room in quickly.
            const nextCategoryStartIdx = category === CATEGORY_ORDER[CATEGORY_ORDER.length - 1]
                ? Number.MAX_SAFE_INTEGER
                : indices[CATEGORY_ORDER[CATEGORY_ORDER.indexOf(category) + 1]];
            const startIdx = indices[category];
            const numSort = nextCategoryStartIdx - startIdx; // splice() returns up to the max, so MAX_SAFE_INT is fine
            const unsortedSlice = taggedRooms.splice(startIdx, numSort);
            const sorted = await sortRoomsWithAlgorithm(unsortedSlice, tag, this.sortAlgorithms[tag]);
            taggedRooms.splice(startIdx, 0, ...sorted);

            // Finally, flag that we've done something
            changed = true;
        }
        return changed;
    }

    private getCategoryFromIndices(index: number, indices: ICategoryIndex): Category {
        for (let i = 0; i < CATEGORY_ORDER.length; i++) {
            const category = CATEGORY_ORDER[i];
            const isLast = i === (CATEGORY_ORDER.length - 1);
            const startIdx = indices[category];
            const endIdx = isLast ? Number.MAX_SAFE_INTEGER : indices[CATEGORY_ORDER[i + 1]];
            if (index >= startIdx && index < endIdx) {
                return category;
            }
        }

        // "Should never happen" disclaimer goes here
        throw new Error("Programming error: somehow you've ended up with an index that isn't in a category");
    }

    private moveRoomIndexes(nRooms: number, fromCategory: Category, toCategory: Category, indices: ICategoryIndex) {
        // We have to update the index of the category *after* the from/toCategory variables
        // in order to update the indices correctly. Because the room is moving from/to those
        // categories, the next category's index will change - not the category we're modifying.
        // We also need to update subsequent categories as they'll all shift by nRooms, so we
        // loop over the order to achieve that.

        for (let i = CATEGORY_ORDER.indexOf(fromCategory) + 1; i < CATEGORY_ORDER.length; i++) {
            const nextCategory = CATEGORY_ORDER[i];
            indices[nextCategory] -= nRooms;
        }

        for (let i = CATEGORY_ORDER.indexOf(toCategory) + 1; i < CATEGORY_ORDER.length; i++) {
            const nextCategory = CATEGORY_ORDER[i];
            indices[nextCategory] += nRooms;
        }

        // Do a quick check to see if we've completely broken the index
        for (let i = 1; i <= CATEGORY_ORDER.length; i++) {
            const lastCat = CATEGORY_ORDER[i - 1];
            const thisCat = CATEGORY_ORDER[i];

            if (indices[lastCat] > indices[thisCat]) {
                // "should never happen" disclaimer goes here
                console.warn(`!! Room list index corruption: ${lastCat} (i:${indices[lastCat]}) is greater than ${thisCat} (i:${indices[thisCat]}) - category indices are likely desynced from reality`);

                // TODO: Regenerate index when this happens
            }
        }
    }
}
