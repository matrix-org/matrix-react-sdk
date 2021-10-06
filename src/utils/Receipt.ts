/*
Copyright 2016 - 2021 The Matrix.org Foundation C.I.C.

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

import { MatrixEvent } from "matrix-js-sdk/src/models/event";

/**
 * Given MatrixEvent containing receipts, return the first
 * read receipt from the given user ID, or null if no such
 * receipt exists.
 *
 * @param {Object} receiptEvent A Matrix Event
 * @param {string} userId A user ID
 * @returns {Object} Read receipt
 */
export function findReadReceiptFromUserId(receiptEvent: MatrixEvent, userId: string): object | null {
    const receiptKeys = Object.keys(receiptEvent.getContent());
    for (let i = 0; i < receiptKeys.length; ++i) {
        const rcpt = receiptEvent.getContent()[receiptKeys[i]];
        if (rcpt['m.read'] && rcpt['m.read'][userId]) {
            return rcpt;
        }
    }

    return null;
}
