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
import { MatrixClient, Room } from "matrix-js-sdk/src/matrix";

import { findDMForUser } from "../../src/utils/direct-messages";
import DMRoomMap from "../../src/utils/DMRoomMap";
import { makeMembershipEvent } from "../test-utils";

jest.mock("../../src/utils/DMRoomMap", () => jest.fn());

describe("findDMForUser", () => {
    const userId1 = "@user1:example.com";
    const userId2 = "@user2:example.com";
    let dmRoomMap: DMRoomMap;
    let mockClient: MatrixClient;

    beforeEach(() => {
        dmRoomMap = {
            getDMRoomsForUserId: jest.fn(),
        } as unknown as DMRoomMap;
        DMRoomMap.shared = () => dmRoomMap;
        mockClient = {
            getRoom: jest.fn(),
        } as unknown as MatrixClient;
    });

    describe("for an empty DM room list", () => {
        beforeEach(() => {
            mocked(dmRoomMap.getDMRoomsForUserId).mockReturnValue([]);
        });

        it("should return null", () => {
            expect(findDMForUser(mockClient, userId1)).toBeUndefined();
        });
    });

    describe("for some rooms", () => {
        let room1: Room;
        let room2: Room;
        let room3: Room;
        let room4: Room;

        beforeEach(() => {
            room1 = new Room("!room1:example.com", mockClient, userId1);
            room1.getMyMembership = () => "join";
            room1.currentState.setStateEvents([
                makeMembershipEvent(room1.roomId, userId1, "join"),
                makeMembershipEvent(room1.roomId, userId2, "join"),
            ]);
            room2 = new Room("!room2:example.com", mockClient, userId1);
            room2.getMyMembership = () => "join";
            room2.currentState.setStateEvents([
                makeMembershipEvent(room2.roomId, userId1, "join"),
                makeMembershipEvent(room2.roomId, userId2, "join"),
            ]);
            // this room should not be a DM room because it has only one joined user
            room3 = new Room("!room3:example.com", mockClient, userId1);
            room3.getMyMembership = () => "join";
            room3.currentState.setStateEvents([
                makeMembershipEvent(room3.roomId, userId1, "invite"),
                makeMembershipEvent(room3.roomId, userId2, "join"),
            ]);
            // this room should not be a DM room because it has no users
            room4 = new Room("!room4:example.com", mockClient, userId1);
            room4.getLastActiveTimestamp = () => 100;

            mocked(mockClient.getRoom).mockImplementation((roomId: string) => {
                return {
                    [room1.roomId]: room1,
                    [room2.roomId]: room2,
                    [room3.roomId]: room3,
                    [room4.roomId]: room3,
                }[roomId];
            });

            mocked(dmRoomMap.getDMRoomsForUserId).mockReturnValue([
                room1.roomId,
                room2.roomId,
                room3.roomId,
                room4.roomId,
            ]);
        });

        it("should find a room ordered by last activity 1", () => {
            room1.getLastActiveTimestamp = () => 2;
            room2.getLastActiveTimestamp = () => 1;

            expect(findDMForUser(mockClient, userId1)).toBe(room1);
        });

        it("should find a room ordered by last activity 2", () => {
            room1.getLastActiveTimestamp = () => 1;
            room2.getLastActiveTimestamp = () => 2;

            expect(findDMForUser(mockClient, userId1)).toBe(room2);
        });
    });
});
