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

import { mocked } from "jest-mock";
import { ClientEvent, MatrixClient, Room } from "matrix-js-sdk/src/matrix";

import { createTestClient, setupAsyncStoreWithClient } from "../test-utils";
import {
    RoomNotificationStateStore,
    UPDATE_STATUS_INDICATOR,
} from "../../src/stores/notifications/RoomNotificationStateStore";
import SettingsStore from "../../src/settings/SettingsStore";

describe("RoomNotificationStateStore", function () {
    let store: RoomNotificationStateStore;
    const client: MatrixClient = createTestClient();

    beforeEach(() => {
        jest.resetAllMocks();
        store = RoomNotificationStateStore.instance;
        setupAsyncStoreWithClient(store, client);
    });

    it("Emits no event when a room has no unreads", async () => {
        // Given a room with 0 unread messages
        const room = fakeRoom(0);
        store.emit = jest.fn();

        // When we sync and the room is visible
        mocked(client.getVisibleRooms).mockReturnValue([room]);
        client.emit(ClientEvent.Sync, null, null);

        // Then we emit an event from the store
        expect(store.emit).not.toHaveBeenCalled();
    });

    it("Emits an event when a room has unreads", async () => {
        // Given a room with 2 unread messages
        const room = fakeRoom(2);
        store.emit = jest.fn();

        // When we sync and the room is visible
        mocked(client.getVisibleRooms).mockReturnValue([room]);
        client.emit(ClientEvent.Sync, null, null);

        // Then we emit an event from the store
        expect(store.emit).toHaveBeenCalledWith(UPDATE_STATUS_INDICATOR, expect.anything(), null, null, undefined);
    });

    describe("If the feature_dynamic_room_predecessors is not enabled", () => {
        beforeEach(() => {
            // Turn off feature_dynamic_room_predecessors setting
            jest.spyOn(SettingsStore, "getValue").mockReturnValue(false);
        });

        it("Passes the dynamic predecessor flag to getVisibleRooms", async () => {
            // When we sync
            mocked(client.getVisibleRooms).mockReturnValue([]);
            store.emit = jest.fn();
            client.emit(ClientEvent.Sync, null, null);

            // Then we check visible rooms, using the dynamic predecessor flag
            expect(client.getVisibleRooms).toHaveBeenCalledWith(false);
            expect(client.getVisibleRooms).not.toHaveBeenCalledWith(true);
        });
    });

    describe("If the feature_dynamic_room_predecessors is enabled", () => {
        beforeEach(() => {
            // Turn on feature_dynamic_room_predecessors setting
            jest.spyOn(SettingsStore, "getValue").mockImplementation(
                (settingName) => settingName === "feature_dynamic_room_predecessors",
            );
        });

        it("Passes the dynamic predecessor flag to getVisibleRooms", async () => {
            // When we sync
            mocked(client.getVisibleRooms).mockReturnValue([]);
            store.emit = jest.fn();
            client.emit(ClientEvent.Sync, null, null);

            // Then we check visible rooms, using the dynamic predecessor flag
            expect(client.getVisibleRooms).toHaveBeenCalledWith(true);
            expect(client.getVisibleRooms).not.toHaveBeenCalledWith(false);
        });
    });

    let roomIdx = 0;

    function fakeRoom(numUnreads: number): Room {
        roomIdx++;
        const ret = new Room(`room${roomIdx}`, client, "@user:example.com");
        ret.getPendingEvents = jest.fn().mockReturnValue([]);
        ret.isSpaceRoom = jest.fn().mockReturnValue(false);
        ret.getUnreadNotificationCount = jest.fn().mockReturnValue(numUnreads);
        return ret;
    }
});
