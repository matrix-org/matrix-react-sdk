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


/*
 * Sliding Sync Architecture - MSC https://github.com/matrix-org/matrix-spec-proposals/pull/3575
 * 
 * This is a holistic summary of the changes made to Element-Web / React SDK / JS SDK to enable sliding sync.
 * This summary will hopefully signpost where developers need to look if they want to make changes to this code.
 * 
 * At the lowest level, the JS SDK contains an HTTP API wrapper function in client.ts. This is used by
 * a SlidingSync class in JS SDK, which contains code to handle list operations (INSERT/DELETE/SYNC/etc)
 * and contains the main request API bodies, but has no code to control updating JS SDK structures: it just
 * exposes an EventEmitter to listen for updates. When MatrixClient.startClient is called, callers need to
 * provide a SlidingSync instance as this contains the main request API params (timeline limit, required state,
 * how many lists, etc).
 * 
 * The SlidingSyncSdk INTERNAL class in JS SDK attaches listeners to SlidingSync to update JS SDK Room objects,
 * and it conveniently exposes an identical public API to SyncApi (to allow it to be a drop-in replacement).
 * 
 * At the highest level, SlidingSyncManager contains mechanisms to tell UI lists which rooms to show,
 * and contains the core request API params used in Element-Web. It does this by listening for events
 * emitted by the SlidingSync class and by modifying the request API params on the SlidingSync class.
 * 
 *    (entry point)                     (updates JS SDK)
 *  SlidingSyncManager                   SlidingSyncSdk
 *       |                                     |
 *       +------------------.------------------+
 *         listens          |          listens
 *                     SlidingSync
 *                     (sync loop,
 *                      list ops)
 */

import { MatrixClient } from 'matrix-js-sdk';
import { MSC3575List, SlidingSync, SlidingSyncEvent, SlidingSyncState } from 'matrix-js-sdk/src/sliding-sync';
import { logger } from "matrix-js-sdk/src/logger";

// how long to long poll for
const SLIDING_SYNC_TIMEOUT_MS = 20 * 1000;

// the things to fetch when a user clicks on a room
const DEFAULT_ROOM_SUBSCRIPTION_INFO = {
    timeline_limit: 50,
    required_state: [
        ["*", "*"], // all events
    ]
};

/**
 * This class manages the entirety of sliding sync at a high UI/UX level. It controls the placement
 * of placeholders in lists, controls updating sliding window ranges, and controls which events
 * are pulled down when. The intention behind this manager is be the single place to look for sliding
 * sync options and code.
 */
export class SlidingSyncManager {
    slidingSync: SlidingSync;
    client: MatrixClient;

    constructor(client: MatrixClient, proxyUrl: string){
        this.slidingSync = new SlidingSync(proxyUrl, [], DEFAULT_ROOM_SUBSCRIPTION_INFO, client, SLIDING_SYNC_TIMEOUT_MS);
        this.client = client;
    }

    /**
     * Ensure that this list is registered.
     * @param listIndex The list index to register
     * @param updateArgs The fields to update on the list.
     * @returns The complete list request params
     */
    async ensureListRegistered(listIndex: number, updateArgs: { filters?: object, sort?: string[], ranges?: number[][] }): Promise<MSC3575List> {
        console.log("ensureListRegistered", listIndex, updateArgs);
        let list = this.slidingSync.getList(listIndex);
        if (!list) {
            list = {
                ranges: [ [0, 20] ],
                sort: [
                    "by_highlight_count", "by_notification_count", "by_recency",
                ],
                timeline_limit: 1, // most recent message display: though this seems to only be needed for favourites?
                required_state: [
                    ["m.room.join_rules", ""], // the public icon on the room list
                    ["m.room.avatar", ""], // any room avatar
                    ["m.room.tombstone", ""], // lets JS SDK hide rooms which are dead
                    ["m.room.encryption", ""], // lets rooms be configured for E2EE correctly
                    ["m.room.create", ""], // for isSpaceRoom checks
                    ["m.room.member", this.client.getUserId()], // lets the client calculate that we are in fact in the room
                ]
            };
            list = Object.assign(list, updateArgs);
        } else {
            const updatedList = Object.assign({}, list, updateArgs);
            if (JSON.stringify(list) === JSON.stringify(updatedList)) {
                console.log("list matches, not sending, update => ", updateArgs);
                return list;
            }
            list = updatedList;
        }
        this.slidingSync.setList(listIndex, list);

        return new Promise((resolve, reject) => {
            const resolveOnSubscribed = (state, resp, err) => {
                if (state === SlidingSyncState.Complete) { // we processed a /sync response
                    this.slidingSync.off(SlidingSyncEvent.Lifecycle, resolveOnSubscribed);
                    resolve(list);
                }
            };
            // wait until the next sync before returning as RoomView may need to know the current state
            this.slidingSync.on(SlidingSyncEvent.Lifecycle, resolveOnSubscribed);
        });
    }

    setRoomVisible(roomId: string, visible: boolean): Promise<string> {
        let subscriptions = this.slidingSync.getRoomSubscriptions();
        if (visible) {
            subscriptions.add(roomId);
        } else {
            subscriptions.delete(roomId);
        }
        logger.log("SlidingSync setRoomVisible:",roomId, visible);
        this.slidingSync.modifyRoomSubscriptions(subscriptions);

        return new Promise((resolve, reject) => {
            const resolveOnSubscribed = (state, resp, err) => {
                if (state === SlidingSyncState.Complete) { // we processed a /sync response
                    this.slidingSync.off(SlidingSyncEvent.Lifecycle, resolveOnSubscribed);
                    resolve(roomId);
                }
            };
            // wait until the next sync before returning as RoomView may need to know the current state
            this.slidingSync.on(SlidingSyncEvent.Lifecycle, resolveOnSubscribed);
        });
    }

};

let manager = null;
export function getSlidingSyncManager(): SlidingSyncManager {
    return manager;
}
export function create(client: MatrixClient, proxyUrl: string): SlidingSync {
    manager = new SlidingSyncManager(client, proxyUrl);
    return manager.slidingSync;
}