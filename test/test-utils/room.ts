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
import {
    EventType,
    MatrixClient,
    RoomMember,
    RoomStateEvent,
} from "matrix-js-sdk/src/matrix";

import { mkEvent, mockStateEventImplementation } from "./test-utils";

/**
 * Add a membership event to a mocked room and client
 * - adds membership event to room.currentState.getStateEvents mock
 * - creates room member
 * - sets room.getMember mock return to room member
 * - emits RoomStateEvent.Members from client
 *
 * Useful to test scenarios that uses room membership state
 * or those that listen to room membership events
 *
 * Client must have mocked or real emit function
 * Client must be setup with a mocked getRoom that returns mocked rooms
 * ```
 * const client = getMockClientWithEventEmitter({
 *      getRoom: jest.fn()
 * })
 * const room1 = mkRoom('!room1:server.org');
 * const room2 = mkRoom('!room2:server.org');
 * const rooms = [room1, room2];
 * mocked(client).getRoom.mockImplementation(roomId => rooms.find(room => room.roomId === roomId));
 * addMembershipToMockedRoom(room1.roomId, '@test:server.org', client);
 * ```
 */
export const addMembershipToMockedRoom = (
    roomId: string, userId: string, client: MatrixClient, membership = 'join',
) => {
    const memberEvent = mkEvent({
        event: true,
        type: EventType.RoomMember,
        room: roomId,
        user: client.getUserId(),
        skey: userId,
        content: { membership },
        ts: Date.now(),
    });
    const room = client.getRoom(roomId);
    mocked(room.currentState).getStateEvents.mockImplementation(
        mockStateEventImplementation([memberEvent]),
    );
    const user = new RoomMember(roomId, userId);
    user.setMembershipEvent(memberEvent);
    mocked(room).getMember.mockReturnValue(user);

    client.emit(RoomStateEvent.Members, memberEvent, room.currentState, user);
};
