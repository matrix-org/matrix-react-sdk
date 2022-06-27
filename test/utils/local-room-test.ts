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

import { mocked } from "jest-mock";
import { MatrixClient } from "matrix-js-sdk/src/matrix";

import { LocalRoom, LocalRoomState, LOCAL_ROOM_ID_PREFIX } from "../../src/models/LocalRoom";
import { doMaybeLocalRoomAction } from "../../src/utils/local-room";
import defaultDispatcher from "../../src/dispatcher/dispatcher";

jest.mock("../../src/dispatcher/dispatcher", () => ({
    dispatch: jest.fn(),
}));

describe("doMaybeLocalRoomAction", () => {
    let callback: jest.Mock;
    let localRoom: LocalRoom;
    let client: MatrixClient;

    beforeEach(() => {
        callback = jest.fn();
        callback.mockReturnValue(Promise.resolve());
        client = {
            getRoom: jest.fn(),
        } as unknown as MatrixClient;
        localRoom = new LocalRoom(LOCAL_ROOM_ID_PREFIX + "test", client, "@test:example.com");
        localRoom.actualRoomId = "@new:example.com";
        mocked(client.getRoom).mockImplementation((roomId: string) => {
            if (roomId === localRoom.roomId) {
                return localRoom;
            }
            return null;
        });
    });

    it("should invoke the callback for a non-local room", () => {
        doMaybeLocalRoomAction("!room:example.com", callback, client);
        expect(callback).toHaveBeenCalled();
    });

    it("should invoke the callback with the new room ID for a created room", () => {
        localRoom.state = LocalRoomState.CREATED;
        doMaybeLocalRoomAction(localRoom.roomId, callback, client);
        expect(callback).toHaveBeenCalledWith(localRoom.actualRoomId);
    });

    describe("for a local room", () => {
        let prom;

        beforeEach(() => {
            prom = doMaybeLocalRoomAction(localRoom.roomId, callback, client);
        });

        it("dispatch a local_room_event", () => {
            expect(defaultDispatcher.dispatch).toHaveBeenCalledWith({
                action: "local_room_event",
                roomId: localRoom.roomId,
            });
        });

        it("should resolve the promise after invoking the callback", async () => {
            localRoom.afterCreateCallbacks.forEach((callback) => {
                callback(localRoom.actualRoomId);
            });
            await prom;
        });
    });
});
