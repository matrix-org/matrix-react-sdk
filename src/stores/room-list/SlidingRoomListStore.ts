/*
Copyright 2018 - 2022 The Matrix.org Foundation C.I.C.

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
import { isNullOrUndefined } from "matrix-js-sdk/src/utils";
import { logger } from "matrix-js-sdk/src/logger";
import { EventType } from "matrix-js-sdk/src/@types/event";

import SettingsStore from "../../settings/SettingsStore";
import { DefaultTagID, OrderedDefaultTagIDs, RoomUpdateCause, TagID } from "./models";
import { IListOrderingMap, ITagMap, ITagSortingMap, ListAlgorithm, SortAlgorithm } from "./algorithms/models";
import { ActionPayload } from "../../dispatcher/payloads";
import defaultDispatcher from "../../dispatcher/dispatcher";
import { readReceiptChangeIsFor } from "../../utils/read-receipts";
import { FILTER_CHANGED, IFilterCondition } from "./filters/IFilterCondition";
import { RoomViewStore } from "../RoomViewStore";
import { Algorithm, LIST_UPDATED_EVENT } from "./algorithms/Algorithm";
import { EffectiveMembership, getEffectiveMembership } from "../../utils/membership";
import RoomListLayoutStore from "./RoomListLayoutStore";
import { MarkedExecution } from "../../utils/MarkedExecution";
import { AsyncStoreWithClient } from "../AsyncStoreWithClient";
import { RoomNotificationStateStore } from "../notifications/RoomNotificationStateStore";
import { VisibilityProvider } from "./filters/VisibilityProvider";
import { SpaceWatcher } from "./SpaceWatcher";
import { IRoomTimelineActionPayload } from "../../actions/MatrixActionCreators";
import { RoomListStore as Interface, RoomListStoreEvent } from "./Interface";

interface IState {
    // state is tracked in underlying classes
}

export const LISTS_UPDATE_EVENT = RoomListStoreEvent.ListsUpdate;

export class SlidingRoomListStoreClass extends AsyncStoreWithClient<IState> implements Interface {
    /**
     * Set to true if you're running tests on the store. Should not be touched in
     * any other environment.
     */
    public static TEST_MODE = false;

    private initialListsGenerated = false;
    private algorithm = new Algorithm();
    private prefilterConditions: IFilterCondition[] = [];
    private updateFn = new MarkedExecution(() => {
        for (const tagId of Object.keys(this.orderedLists)) {
            RoomNotificationStateStore.instance.getListState(tagId).setRooms(this.orderedLists[tagId]);
        }
        this.emit(LISTS_UPDATE_EVENT);
    });

    constructor() {
        super(defaultDispatcher);
        this.setMaxListeners(20); // RoomList + LeftPanel + 8xRoomSubList + spares
        this.algorithm.start();
    }

    private setupWatchers() {
        // TODO: Maybe destroy this if this class supports destruction
        new SpaceWatcher(this);
    }

    public get orderedLists(): ITagMap {
        if (!this.algorithm) return {}; // No tags yet.
        return this.algorithm.getOrderedRooms();
    }

    // Intended for test usage
    public async resetStore() {
        await this.reset();
        this.prefilterConditions = [];
        this.initialListsGenerated = false;

        this.algorithm.off(LIST_UPDATED_EVENT, this.onAlgorithmListUpdated);
        this.algorithm.off(FILTER_CHANGED, this.onAlgorithmListUpdated);
        this.algorithm.stop();
        this.algorithm = new Algorithm();
        this.algorithm.on(LIST_UPDATED_EVENT, this.onAlgorithmListUpdated);
        this.algorithm.on(FILTER_CHANGED, this.onAlgorithmListUpdated);

        // Reset state without causing updates as the client will have been destroyed
        // and downstream code will throw NPE errors.
        await this.reset(null, true);
    }

    // Public for test usage. Do not call this.
    public async makeReady(forcedClient?: MatrixClient) {
        if (forcedClient) {
            this.readyStore.useUnitTestClient(forcedClient);
        }

        RoomViewStore.instance.addListener(() => this.handleRVSUpdate({}));
        this.algorithm.on(LIST_UPDATED_EVENT, this.onAlgorithmListUpdated);
        this.algorithm.on(FILTER_CHANGED, this.onAlgorithmFilterUpdated);
        this.setupWatchers();

        // Update any settings here, as some may have happened before we were logically ready.
        logger.log("Regenerating room lists: Startup");
        this.updateAlgorithmInstances();
        this.regenerateAllLists({ trigger: false });
        this.handleRVSUpdate({ trigger: false }); // fake an RVS update to adjust sticky room, if needed

        this.updateFn.mark(); // we almost certainly want to trigger an update.
        this.updateFn.trigger();
    }

    /**
     * Handles suspected RoomViewStore changes.
     * @param trigger Set to false to prevent a list update from being sent. Should only
     * be used if the calling code will manually trigger the update.
     */
    private handleRVSUpdate({ trigger = true }) {
    }

    protected async onReady(): Promise<any> {
        await this.makeReady();
    }

    protected async onNotReady(): Promise<any> {
        await this.resetStore();
    }

    protected async onAction(payload: ActionPayload) {
        // If we're not remotely ready, don't even bother scheduling the dispatch handling.
        // This is repeated in the handler just in case things change between a decision here and
        // when the timer fires.
        const logicallyReady = this.matrixClient && this.initialListsGenerated;
        if (!logicallyReady) return;

        // We do this to intentionally break out of the current event loop task, allowing
        // us to instead wait for a more convenient time to run our updates.
        setImmediate(() => this.onDispatchAsync(payload));
    }

    protected async onDispatchAsync(payload: ActionPayload) {
    }

    private async handleRoomUpdate(room: Room, cause: RoomUpdateCause): Promise<any> {
        if (cause === RoomUpdateCause.NewRoom && room.getMyMembership() === "invite") {
            // Let the visibility provider know that there is a new invited room. It would be nice
            // if this could just be an event that things listen for but the point of this is that
            // we delay doing anything about this room until the VoipUserMapper had had a chance
            // to do the things it needs to do to decide if we should show this room or not, so
            // an even wouldn't et us do that.
            await VisibilityProvider.instance.onNewInvitedRoom(room);
        }

        if (!VisibilityProvider.instance.isRoomVisible(room)) {
            return; // don't do anything on rooms that aren't visible
        }

        if ((cause === RoomUpdateCause.NewRoom || cause === RoomUpdateCause.PossibleTagChange) &&
            !this.prefilterConditions.every(c => c.isVisible(room))
        ) {
            return; // don't do anything on new/moved rooms which ought not to be shown
        }

        const shouldUpdate = this.algorithm.handleRoomUpdate(room, cause);
        if (shouldUpdate) {
            this.updateFn.mark();
        }
    }

    private async recalculatePrefiltering() {
        if (!this.algorithm) return;
        if (!this.algorithm.hasTagSortingMap) return; // we're still loading

        // Inhibit updates because we're about to lie heavily to the algorithm
        this.algorithm.updatesInhibited = true;

        // Figure out which rooms are about to be valid, and the state of affairs
        const rooms = this.getPlausibleRooms();
        const currentSticky = this.algorithm.stickyRoom;
        const stickyIsStillPresent = currentSticky && rooms.includes(currentSticky);

        // Reset the sticky room before resetting the known rooms so the algorithm
        // doesn't freak out.
        this.algorithm.setStickyRoom(null);
        this.algorithm.setKnownRooms(rooms);

        // Set the sticky room back, if needed, now that we have updated the store.
        // This will use relative stickyness to the new room set.
        if (stickyIsStillPresent) {
            this.algorithm.setStickyRoom(currentSticky);
        }

        // Finally, mark an update and resume updates from the algorithm
        this.updateFn.mark();
        this.algorithm.updatesInhibited = false;
    }

    public setTagSorting(tagId: TagID, sort: SortAlgorithm) {
        this.setAndPersistTagSorting(tagId, sort);
        this.updateFn.trigger();
    }

    private setAndPersistTagSorting(tagId: TagID, sort: SortAlgorithm) {
        this.algorithm.setTagSorting(tagId, sort);
        // TODO: Per-account? https://github.com/vector-im/element-web/issues/14114
        localStorage.setItem(`mx_tagSort_${tagId}`, sort);
    }

    public getTagSorting(tagId: TagID): SortAlgorithm {
        return this.algorithm.getTagSorting(tagId);
    }

    // noinspection JSMethodCanBeStatic
    private getStoredTagSorting(tagId: TagID): SortAlgorithm {
        // TODO: Per-account? https://github.com/vector-im/element-web/issues/14114
        return <SortAlgorithm>localStorage.getItem(`mx_tagSort_${tagId}`);
    }

    // logic must match calculateListOrder
    private calculateTagSorting(tagId: TagID): SortAlgorithm {
        const isDefaultRecent = tagId === DefaultTagID.Invite || tagId === DefaultTagID.DM;
        const defaultSort = isDefaultRecent ? SortAlgorithm.Recent : SortAlgorithm.Alphabetic;
        const settingAlphabetical = SettingsStore.getValue("RoomList.orderAlphabetically", null, true);
        const definedSort = this.getTagSorting(tagId);
        const storedSort = this.getStoredTagSorting(tagId);

        // We use the following order to determine which of the 4 flags to use:
        // Stored > Settings > Defined > Default

        let tagSort = defaultSort;
        if (storedSort) {
            tagSort = storedSort;
        } else if (!isNullOrUndefined(settingAlphabetical)) {
            tagSort = settingAlphabetical ? SortAlgorithm.Alphabetic : SortAlgorithm.Recent;
        } else if (definedSort) {
            tagSort = definedSort;
        } // else default (already set)

        return tagSort;
    }

    public setListOrder(tagId: TagID, order: ListAlgorithm) {
        this.setAndPersistListOrder(tagId, order);
        this.updateFn.trigger();
    }

    private setAndPersistListOrder(tagId: TagID, order: ListAlgorithm) {
        this.algorithm.setListOrdering(tagId, order);
        // TODO: Per-account? https://github.com/vector-im/element-web/issues/14114
        localStorage.setItem(`mx_listOrder_${tagId}`, order);
    }

    public getListOrder(tagId: TagID): ListAlgorithm {
        return this.algorithm.getListOrdering(tagId);
    }

    // noinspection JSMethodCanBeStatic
    private getStoredListOrder(tagId: TagID): ListAlgorithm {
        // TODO: Per-account? https://github.com/vector-im/element-web/issues/14114
        return <ListAlgorithm>localStorage.getItem(`mx_listOrder_${tagId}`);
    }

    // logic must match calculateTagSorting
    private calculateListOrder(tagId: TagID): ListAlgorithm {
        const defaultOrder = ListAlgorithm.Natural;
        const settingImportance = SettingsStore.getValue("RoomList.orderByImportance", null, true);
        const definedOrder = this.getListOrder(tagId);
        const storedOrder = this.getStoredListOrder(tagId);

        // We use the following order to determine which of the 4 flags to use:
        // Stored > Settings > Defined > Default

        let listOrder = defaultOrder;
        if (storedOrder) {
            listOrder = storedOrder;
        } else if (!isNullOrUndefined(settingImportance)) {
            listOrder = settingImportance ? ListAlgorithm.Importance : ListAlgorithm.Natural;
        } else if (definedOrder) {
            listOrder = definedOrder;
        } // else default (already set)

        return listOrder;
    }

    private updateAlgorithmInstances() {
        // We'll require an update, so mark for one. Marking now also prevents the calls
        // to setTagSorting and setListOrder from causing triggers.
        this.updateFn.mark();

        for (const tag of Object.keys(this.orderedLists)) {
            const definedSort = this.getTagSorting(tag);
            const definedOrder = this.getListOrder(tag);

            const tagSort = this.calculateTagSorting(tag);
            const listOrder = this.calculateListOrder(tag);

            if (tagSort !== definedSort) {
                this.setAndPersistTagSorting(tag, tagSort);
            }
            if (listOrder !== definedOrder) {
                this.setAndPersistListOrder(tag, listOrder);
            }
        }
    }

    private onAlgorithmListUpdated = (forceUpdate: boolean) => {
        this.updateFn.mark();
        if (forceUpdate) this.updateFn.trigger();
    };

    private onAlgorithmFilterUpdated = () => {
        // The filter can happen off-cycle, so trigger an update. The filter will have
        // already caused a mark.
        this.updateFn.trigger();
    };

    private onPrefilterUpdated = async () => {
        await this.recalculatePrefiltering();
        this.updateFn.trigger();
    };

    private getPlausibleRooms(): Room[] {
        if (!this.matrixClient) return [];

        let rooms = this.matrixClient.getVisibleRooms().filter(r => VisibilityProvider.instance.isRoomVisible(r));

        if (this.prefilterConditions.length > 0) {
            rooms = rooms.filter(r => {
                for (const filter of this.prefilterConditions) {
                    if (!filter.isVisible(r)) {
                        return false;
                    }
                }
                return true;
            });
        }

        return rooms;
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
        logger.warn("Regenerating all room lists");

        const rooms = this.getPlausibleRooms();

        const sorts: ITagSortingMap = {};
        const orders: IListOrderingMap = {};
        const allTags = [...OrderedDefaultTagIDs];
        for (const tagId of allTags) {
            sorts[tagId] = this.calculateTagSorting(tagId);
            orders[tagId] = this.calculateListOrder(tagId);

            RoomListLayoutStore.instance.ensureLayoutExists(tagId);
        }

        this.algorithm.populateTags(sorts, orders);
        this.algorithm.setKnownRooms(rooms);

        this.initialListsGenerated = true;

        if (trigger) this.updateFn.trigger();
    }

    /**
     * Adds a filter condition to the room list store. Filters may be applied async,
     * and thus might not cause an update to the store immediately.
     * @param {IFilterCondition} filter The filter condition to add.
     */
    public async addFilter(filter: IFilterCondition): Promise<void> {
        let promise = Promise.resolve();
        filter.on(FILTER_CHANGED, this.onPrefilterUpdated);
        this.prefilterConditions.push(filter);
        promise = this.recalculatePrefiltering();
        promise.then(() => this.updateFn.trigger());
    }

    /**
     * Removes a filter condition from the room list store. If the filter was
     * not previously added to the room list store, this will no-op. The effects
     * of removing a filter may be applied async and therefore might not cause
     * an update right away.
     * @param {IFilterCondition} filter The filter condition to remove.
     */
    public removeFilter(filter: IFilterCondition): void {
        let promise = Promise.resolve();
        let removed = false;
        const idx = this.prefilterConditions.indexOf(filter);
        if (idx >= 0) {
            filter.off(FILTER_CHANGED, this.onPrefilterUpdated);
            this.prefilterConditions.splice(idx, 1);
            promise = this.recalculatePrefiltering();
            removed = true;
        }

        if (removed) {
            promise.then(() => this.updateFn.trigger());
        }
    }

    /**
     * Gets the tags for a room identified by the store. The returned set
     * should never be empty, and will contain DefaultTagID.Untagged if
     * the store is not aware of any tags.
     * @param room The room to get the tags for.
     * @returns The tags for the room.
     */
    public getTagsForRoom(room: Room): TagID[] {
        const algorithmTags = this.algorithm.getTagsForRoom(room);
        if (!algorithmTags) return [DefaultTagID.Untagged];
        return algorithmTags;
    }

    /**
     * Manually update a room with a given cause. This should only be used if the
     * room list store would otherwise be incapable of doing the update itself. Note
     * that this may race with the room list's regular operation.
     * @param {Room} room The room to update.
     * @param {RoomUpdateCause} cause The cause to update for.
     */
    public async manualRoomUpdate(room: Room, cause: RoomUpdateCause) {
        await this.handleRoomUpdate(room, cause);
        this.updateFn.trigger();
    }
}
