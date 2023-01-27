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

import { RoomScrollStateStore, ScrollState } from "../../src/stores/RoomScrollStateStore";

describe("RoomScrollStateStore", () => {
    let store: RoomScrollStateStore;

    beforeEach(() => {
        store = new RoomScrollStateStore();
    });

    it("should return undefined for unknown states", () => {
        expect(store.getScrollState("!room1:example.com")).toBeUndefined();
        expect(store.getScrollState("!room2:example.com")).toBeUndefined();
    });

    it("should return the state after setting", () => {
        const room = "!room:example.com";
        const state: ScrollState = { focussedEvent: "$1", pixelOffset: 0 };
        store.setScrollState(room, state);
        expect(store.getScrollState(room)).toBe(state);
    });

    it("should support 'unsetting'", () => {
        const room = "!room2:example.com";
        store.setScrollState(room, { focussedEvent: "$1", pixelOffset: 0 });
        store.setScrollState(room, undefined);
        expect(store.getScrollState(room)).toBeUndefined();
    });
});
