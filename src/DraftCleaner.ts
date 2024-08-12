/*
Copyright 2024 The Matrix.org Foundation C.I.C.

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

import { logger } from "matrix-js-sdk/src/logger";

import { MatrixClientPeg } from "./MatrixClientPeg";
import { EDITOR_STATE_STORAGE_PREFIX } from "./components/views/rooms/SendMessageComposer";

// The key used to persist the the timestamp we last cleaned up drafts
export const DRAFT_LAST_CLEANUP_KEY = "mx_draft_cleanup";
// The period of time we wait between cleaning drafts
export const DRAFT_CLEANUP_PERIOD = 1000 * 60 * 60 * 24 * 30;

/**
 * Checks if `DRAFT_CLEANUP_PERIOD` has expired, if so, deletes any stord editor drafts that exist for rooms that are not in the known list.
 */
export function cleanUpDraftsIfRequired(): void {
    if (!shouldCleanupDrafts()) {
        return;
    }
    logger.debug(`Cleaning up editor drafts...`);
    cleaupDrafts();
    try {
        localStorage.setItem(DRAFT_LAST_CLEANUP_KEY, String(Date.now()));
    } catch (error) {
        logger.error("Failed to persist draft cleanup key", error);
    }
}

/**
 *
 * @returns {bool} True if the timestamp has not been persisted or the `DRAFT_CLEANUP_PERIOD` has expired.
 */
function shouldCleanupDrafts(): boolean {
    try {
        const lastCleanupTimestamp = localStorage.getItem(DRAFT_LAST_CLEANUP_KEY);
        if (!lastCleanupTimestamp) {
            return true;
        }
        const parsedTimestamp = Number.parseInt(lastCleanupTimestamp || "", 10);
        if (!Number.isInteger(parsedTimestamp)) {
            return true;
        }
        return Date.now() > parsedTimestamp + DRAFT_CLEANUP_PERIOD;
    } catch (error) {
        return true;
    }
}

/**
 * Clear all drafts for the CIDER editor if the room does not exist in the known rooms.
 */
function cleaupDrafts(): void {
    for (let i = 0; i < localStorage.length; i++) {
        const keyName = localStorage.key(i);
        if (!keyName?.startsWith(EDITOR_STATE_STORAGE_PREFIX)) continue;
        // Remove the prefix and the optional event id suffix to leave the room id
        const roomId = keyName.slice(EDITOR_STATE_STORAGE_PREFIX.length).split("_$")[0];
        const room = MatrixClientPeg.safeGet().getRoom(roomId);
        if (!room) {
            logger.debug(`Removing draft for unknown room with key ${keyName}`);
            localStorage.removeItem(keyName);
        }
    }
}
