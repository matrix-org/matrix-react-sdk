/*
Copyright 2023 The Matrix.org Foundation C.I.C.

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

import * as Lifecycle from "../src/Lifecycle";
import { mockPlatformPeg } from "./test-utils";

/**
 * Create a fake IndexedDB that mimics Firefox's 'disabled' implementation.
 */
function brokenIDB(): IDBFactory {
    return {
        deleteDatabase: () => {
            // Return an IDBOpenDBRequest that immediately errors
            const resp = { onerror: undefined } as IDBOpenDBRequest;
            setTimeout(() => resp.onerror?.(new ErrorEvent("")), 1);
            return resp;
        },
    } as unknown as IDBFactory;
}

describe("Lifecycle", () => {
    describe("onLoggedOut", () => {
        beforeAll(() => mockPlatformPeg());

        it("allows IndexedDB failures", async () => {
            // Ensure that the indexedDB error is not propagated.
            globalThis.indexedDB = brokenIDB();
            await Lifecycle.onLoggedOut();
        });
    });
});
