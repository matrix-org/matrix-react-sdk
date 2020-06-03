/*
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

import { DefaultTagID, RoomUpdateCause, TagID } from "../../models";
import { Room } from "matrix-js-sdk/src/models/room";
import { isNullOrUndefined } from "matrix-js-sdk/src/utils";
import { EffectiveMembership, splitRoomsByMembership } from "../../membership";
import { ITagMap, ITagSortingMap } from "../models";
import DMRoomMap from "../../../../utils/DMRoomMap";
import { FILTER_CHANGED, IFilterCondition } from "../../filters/IFilterCondition";
import { EventEmitter } from "events";

// TODO: Add locking support to avoid concurrent writes?

/**
 * Fired when the Algorithm has determined a list has been updated.
 */
export const LIST_UPDATED_EVENT = "list_updated_event";

/**
 * Represents a list ordering algorithm. This class will take care of tag
 * management (which rooms go in which tags) and ask the implementation to
 * deal with ordering mechanics.
 */
export abstract class Algorithm extends EventEmitter {
    private _cachedRooms: ITagMap = {};
    private filteredRooms: ITagMap = {};

    protected sortAlgorithms: ITagSortingMap;
    protected rooms: Room[] = [];
    protected roomIdsToTags: {
        [roomId: string]: TagID[];
    } = {};
    protected allowedByFilter: Map<IFilterCondition, Room[]> = new Map<IFilterCondition, Room[]>();
    protected allowedRoomsByFilters: Set<Room> = new Set<Room>();

    protected constructor() {
        super();
    }

    protected get hasFilters(): boolean {
        return this.allowedByFilter.size > 0;
    }

    protected set cachedRooms(val: ITagMap) {
        this._cachedRooms = val;
        this.recalculateFilteredRooms();
    }

    protected get cachedRooms(): ITagMap {
        return this._cachedRooms;
    }

    /**
     * Sets the filter conditions the Algorithm should use.
     * @param filterConditions The filter conditions to use.
     */
    public setFilterConditions(filterConditions: IFilterCondition[]): void {
        for (const filter of filterConditions) {
            this.addFilterCondition(filter);
        }
    }

    public addFilterCondition(filterCondition: IFilterCondition): void {
        // Populate the cache of the new filter
        this.allowedByFilter.set(filterCondition, this.rooms.filter(r => filterCondition.isVisible(r)));
        this.recalculateFilteredRooms();
        filterCondition.on(FILTER_CHANGED, this.recalculateFilteredRooms.bind(this));
    }

    public removeFilterCondition(filterCondition: IFilterCondition): void {
        filterCondition.off(FILTER_CHANGED, this.recalculateFilteredRooms.bind(this));
        if (this.allowedByFilter.has(filterCondition)) {
            this.allowedByFilter.delete(filterCondition);

            // If we removed the last filter, tell consumers that we've "updated" our filtered
            // view. This will trick them into getting the complete room list.
            if (!this.hasFilters) {
                this.emit(LIST_UPDATED_EVENT);
            }
        }
    }

    protected recalculateFilteredRooms() {
        if (!this.hasFilters) {
            return;
        }

        console.warn("Recalculating filtered room list");
        const allowedByFilters = new Set<Room>();
        const filters = Array.from(this.allowedByFilter.keys());
        const newMap: ITagMap = {};
        for (const tagId of Object.keys(this.cachedRooms)) {
            // Cheaply clone the rooms so we can more easily do operations on the list.
            // We optimize our lookups by trying to reduce sample size as much as possible
            // to the rooms we know will be deduped by the Set.
            const rooms = this.cachedRooms[tagId];
            const remainingRooms = rooms.map(r => r).filter(r => !allowedByFilters.has(r));
            const allowedRoomsInThisTag = [];
            for (const filter of filters) {
                const filteredRooms = remainingRooms.filter(r => filter.isVisible(r));
                for (const room of filteredRooms) {
                    const idx = remainingRooms.indexOf(room);
                    if (idx >= 0) remainingRooms.splice(idx, 1);
                    allowedByFilters.add(room);
                    allowedRoomsInThisTag.push(room);
                }
            }
            newMap[tagId] = allowedRoomsInThisTag;
            console.log(`[DEBUG] ${newMap[tagId].length}/${rooms.length} rooms filtered into ${tagId}`);
        }

        this.allowedRoomsByFilters = allowedByFilters;
        this.filteredRooms = newMap;
        this.emit(LIST_UPDATED_EVENT);
    }

    protected addPossiblyFilteredRoomsToTag(tagId: TagID, added: Room[]): void {
        const filters = this.allowedByFilter.keys();
        for (const room of added) {
            for (const filter of filters) {
                if (filter.isVisible(room)) {
                    this.allowedRoomsByFilters.add(room);
                    break;
                }
            }
        }

        // Now that we've updated the allowed rooms, recalculate the tag
        this.recalculateFilteredRoomsForTag(tagId);
    }

    protected recalculateFilteredRoomsForTag(tagId: TagID): void {
        console.log(`Recalculating filtered rooms for ${tagId}`);
        delete this.filteredRooms[tagId];
        const rooms = this.cachedRooms[tagId];
        const filteredRooms = rooms.filter(r => this.allowedRoomsByFilters.has(r));
        if (filteredRooms.length > 0) {
            this.filteredRooms[tagId] = filteredRooms;
        }
        console.log(`[DEBUG] ${filteredRooms.length}/${rooms.length} rooms filtered into ${tagId}`);
    }

    /**
     * Asks the Algorithm to regenerate all lists, using the tags given
     * as reference for which lists to generate and which way to generate
     * them.
     * @param {ITagSortingMap} tagSortingMap The tags to generate.
     * @returns {Promise<*>} A promise which resolves when complete.
     */
    public async populateTags(tagSortingMap: ITagSortingMap): Promise<any> {
        if (!tagSortingMap) throw new Error(`Map cannot be null or empty`);
        this.sortAlgorithms = tagSortingMap;
        return this.setKnownRooms(this.rooms);
    }

    /**
     * Gets an ordered set of rooms for the all known tags, filtered.
     * @returns {ITagMap} The cached list of rooms, ordered,
     * for each tag. May be empty, but never null/undefined.
     */
    public getOrderedRooms(): ITagMap {
        if (!this.hasFilters) {
            return this.cachedRooms;
        }
        return this.filteredRooms;
    }

    /**
     * Seeds the Algorithm with a set of rooms. The algorithm will discard all
     * previously known information and instead use these rooms instead.
     * @param {Room[]} rooms The rooms to force the algorithm to use.
     * @returns {Promise<*>} A promise which resolves when complete.
     */
    public async setKnownRooms(rooms: Room[]): Promise<any> {
        if (isNullOrUndefined(rooms)) throw new Error(`Array of rooms cannot be null`);
        if (!this.sortAlgorithms) throw new Error(`Cannot set known rooms without a tag sorting map`);

        this.rooms = rooms;

        const newTags: ITagMap = {};
        for (const tagId in this.sortAlgorithms) {
            // noinspection JSUnfilteredForInLoop
            newTags[tagId] = [];
        }

        // If we can avoid doing work, do so.
        if (!rooms.length) {
            await this.generateFreshTags(newTags); // just in case it wants to do something
            this.cachedRooms = newTags;
            return;
        }

        // Split out the easy rooms first (leave and invite)
        const memberships = splitRoomsByMembership(rooms);
        for (const room of memberships[EffectiveMembership.Invite]) {
            console.log(`[DEBUG] "${room.name}" (${room.roomId}) is an Invite`);
            newTags[DefaultTagID.Invite].push(room);
        }
        for (const room of memberships[EffectiveMembership.Leave]) {
            console.log(`[DEBUG] "${room.name}" (${room.roomId}) is Historical`);
            newTags[DefaultTagID.Archived].push(room);
        }

        // Now process all the joined rooms. This is a bit more complicated
        for (const room of memberships[EffectiveMembership.Join]) {
            let tags = Object.keys(room.tags || {});

            if (tags.length === 0) {
                // Check to see if it's a DM if it isn't anything else
                if (DMRoomMap.shared().getUserIdForRoomId(room.roomId)) {
                    tags = [DefaultTagID.DM];
                }
            }

            let inTag = false;
            if (tags.length > 0) {
                for (const tag of tags) {
                    console.log(`[DEBUG] "${room.name}" (${room.roomId}) is tagged as ${tag}`);
                    if (!isNullOrUndefined(newTags[tag])) {
                        console.log(`[DEBUG] "${room.name}" (${room.roomId}) is tagged with VALID tag ${tag}`);
                        newTags[tag].push(room);
                        inTag = true;
                    }
                }
            }

            if (!inTag) {
                // TODO: Determine if DM and push there instead
                newTags[DefaultTagID.Untagged].push(room);
                console.log(`[DEBUG] "${room.name}" (${room.roomId}) is Untagged`);
            }
        }

        await this.generateFreshTags(newTags);

        this.cachedRooms = newTags;
        this.updateTagsFromCache();
    }

    /**
     * Updates the roomsToTags map
     */
    protected updateTagsFromCache() {
        const newMap = {};

        const tags = Object.keys(this.cachedRooms);
        for (const tagId of tags) {
            const rooms = this.cachedRooms[tagId];
            for (const room of rooms) {
                if (!newMap[room.roomId]) newMap[room.roomId] = [];
                newMap[room.roomId].push(tagId);
            }
        }

        this.roomIdsToTags = newMap;
    }

    /**
     * Called when the Algorithm believes a complete regeneration of the existing
     * lists is needed.
     * @param {ITagMap} updatedTagMap The tag map which needs populating. Each tag
     * will already have the rooms which belong to it - they just need ordering. Must
     * be mutated in place.
     * @returns {Promise<*>} A promise which resolves when complete.
     */
    protected abstract generateFreshTags(updatedTagMap: ITagMap): Promise<any>;

    /**
     * Asks the Algorithm to update its knowledge of a room. For example, when
     * a user tags a room, joins/creates a room, or leaves a room the Algorithm
     * should be told that the room's info might have changed. The Algorithm
     * may no-op this request if no changes are required.
     * @param {Room} room The room which might have affected sorting.
     * @param {RoomUpdateCause} cause The reason for the update being triggered.
     * @returns {Promise<boolean>} A promise which resolve to true or false
     * depending on whether or not getOrderedRooms() should be called after
     * processing.
     */
    public abstract handleRoomUpdate(room: Room, cause: RoomUpdateCause): Promise<boolean>;
}
