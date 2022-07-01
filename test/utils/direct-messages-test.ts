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

import DMRoomMap from "../../src/utils/DMRoomMap";
import { makeMembershipEvent } from "../test-utils";
import { LocalRoom } from "../../src/models/LocalRoom";
import * as dmModule from "../../src/utils/direct-messages";

describe("direct-messages", () => {
    const userId1 = "@user1:example.com";
    const member1 = new dmModule.DirectoryMember({ user_id: userId1 });
    const userId2 = "@user2:example.com";
    const member2 = new dmModule.DirectoryMember({ user_id: userId2 });
    let room1: Room;
    let dmRoomMap: DMRoomMap;
    let mockClient: MatrixClient;

    beforeEach(() => {
        jest.restoreAllMocks();

        room1 = new Room("!room1:example.com", mockClient, userId1);
        room1.getMyMembership = () => "join";
        room1.currentState.setStateEvents([
            makeMembershipEvent(room1.roomId, userId1, "join"),
            makeMembershipEvent(room1.roomId, userId2, "join"),
        ]);

        mockClient = {
            getRoom: jest.fn(),
        } as unknown as MatrixClient;

        dmRoomMap = {
            getDMRoomForIdentifiers: jest.fn(),
            getDMRoomsForUserId: jest.fn(),
        } as unknown as DMRoomMap;
        jest.spyOn(DMRoomMap, "shared").mockReturnValue(dmRoomMap);
    });

    describe("findDMForUser", () => {
        describe("for an empty DM room list", () => {
            beforeEach(() => {
                mocked(dmRoomMap.getDMRoomsForUserId).mockReturnValue([]);
            });

            it("should return undefined", () => {
                expect(dmModule.findDMForUser(mockClient, userId1)).toBeUndefined();
            });
        });

        describe("for some rooms", () => {
            let room2: LocalRoom;
            let room3: Room;
            let room4: Room;
            let room5: Room;

            beforeEach(() => {
                // this should not be a DM room because it is a local room
                room2 = new LocalRoom("!room2:example.com", mockClient, userId1);
                room2.getLastActiveTimestamp = () => 100;

                room3 = new Room("!room3:example.com", mockClient, userId1);
                room3.getMyMembership = () => "join";
                room3.currentState.setStateEvents([
                    makeMembershipEvent(room3.roomId, userId1, "join"),
                    makeMembershipEvent(room3.roomId, userId2, "join"),
                ]);

                // this should not be a DM room because it has only one joined user
                room4 = new Room("!room4:example.com", mockClient, userId1);
                room4.getMyMembership = () => "join";
                room4.currentState.setStateEvents([
                    makeMembershipEvent(room4.roomId, userId1, "invite"),
                    makeMembershipEvent(room4.roomId, userId2, "join"),
                ]);

                // this should not be a DM room because it has no users
                room5 = new Room("!room5:example.com", mockClient, userId1);
                room5.getLastActiveTimestamp = () => 100;

                mocked(mockClient.getRoom).mockImplementation((roomId: string) => {
                    return {
                        [room1.roomId]: room1,
                        [room2.roomId]: room2,
                        [room3.roomId]: room3,
                        [room4.roomId]: room4,
                        [room5.roomId]: room5,
                    }[roomId];
                });

                mocked(dmRoomMap.getDMRoomsForUserId).mockReturnValue([
                    room1.roomId,
                    room2.roomId,
                    room3.roomId,
                    room4.roomId,
                    room5.roomId,
                ]);
            });

            it("should find a room ordered by last activity 1", () => {
                room1.getLastActiveTimestamp = () => 2;
                room3.getLastActiveTimestamp = () => 1;

                expect(dmModule.findDMForUser(mockClient, userId1)).toBe(room1);
            });

            it("should find a room ordered by last activity 2", () => {
                room1.getLastActiveTimestamp = () => 1;
                room3.getLastActiveTimestamp = () => 2;

                expect(dmModule.findDMForUser(mockClient, userId1)).toBe(room3);
            });
        });
    });

    describe("findDMRoom", () => {
        it("should return the room for a single target with a room", () => {
            jest.spyOn(dmModule, "findDMForUser").mockReturnValue(room1);
            expect(dmModule.findDMRoom(mockClient, [member1])).toBe(room1);
        });

        it("should return null for a single target without a room", () => {
            jest.spyOn(dmModule, "findDMForUser").mockReturnValue(null);
            expect(dmModule.findDMRoom(mockClient, [member1])).toBeNull();
        });

        it("should return the room for 2 targets with a room", () => {
            mocked(dmRoomMap.getDMRoomForIdentifiers).mockReturnValue(room1);
            expect(dmModule.findDMRoom(mockClient, [member1, member2])).toBe(room1);
        });

        it("should return null for 2 targets without a room", () => {
            mocked(dmRoomMap.getDMRoomForIdentifiers).mockReturnValue(null);
            expect(dmModule.findDMRoom(mockClient, [member1, member2])).toBeNull();
        });
    });
});
