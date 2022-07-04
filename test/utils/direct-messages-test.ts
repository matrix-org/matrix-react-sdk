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
    ClientEvent,
    EventType,
    KNOWN_SAFE_ROOM_VERSION,
    MatrixClient,
    Room,
} from "matrix-js-sdk/src/matrix";

import DMRoomMap from "../../src/utils/DMRoomMap";
import { createTestClient, makeMembershipEvent, mkEvent } from "../test-utils";
import { LocalRoom, LocalRoomState, LOCAL_ROOM_ID_PREFIX } from "../../src/models/LocalRoom";
import * as dmModule from "../../src/utils/direct-messages";
import dis from "../../src/dispatcher/dispatcher";
import { Action } from "../../src/dispatcher/actions";
import { MatrixClientPeg } from "../../src/MatrixClientPeg";
import { privateShouldBeEncrypted } from "../../src/utils/rooms";
import { Member } from "../../src/utils/direct-messages";
import { canEncryptToAllUsers } from "../../src/createRoom";

jest.mock("../../src/utils/rooms", () => ({
    ...(jest.requireActual("../../src/utils/rooms") as object),
    privateShouldBeEncrypted: jest.fn(),
}));

jest.mock("../../src/createRoom", () => ({
    ...(jest.requireActual("../../src/createRoom") as object),
    canEncryptToAllUsers: jest.fn(),
}));

function assertLocalRoom(room: LocalRoom, targets: Member[], encrypted: boolean) {
    expect(room.roomId).toBe(LOCAL_ROOM_ID_PREFIX + "t1");
    expect(room.encrypted).toBe(encrypted);
    expect(room.targets).toEqual(targets);
    expect(room.getMyMembership()).toBe("join");

    const roomCreateEvent = room.currentState.getStateEvents(EventType.RoomCreate)[0];
    expect(roomCreateEvent).toBeDefined();
    expect(roomCreateEvent.getContent()["room_version"]).toBe(KNOWN_SAFE_ROOM_VERSION);

    // check that the user and all targets are joined
    expect(room.getMember("@userId:matrix.org").membership).toBe("join");
    targets.forEach((target: Member) => {
        expect(room.getMember(target.userId).membership).toBe("join");
    });

    if (encrypted) {
        const encryptionEvent = room.currentState.getStateEvents(EventType.RoomEncryption)[0];
        expect(encryptionEvent).toBeDefined();
    }
}

describe("direct-messages", () => {
    const userId1 = "@user1:example.com";
    const member1 = new dmModule.DirectoryMember({ user_id: userId1 });
    const userId2 = "@user2:example.com";
    const member2 = new dmModule.ThreepidMember("user2");
    let room1: Room;
    let localRoom: LocalRoom;
    let localRoomCallbackRoomId: string;
    let dmRoomMap: DMRoomMap;
    let mockClient: MatrixClient;
    let roomEvents: Room[];

    beforeEach(() => {
        jest.restoreAllMocks();

        mockClient = createTestClient();
        jest.spyOn(MatrixClientPeg, "get").mockReturnValue(mockClient);
        roomEvents = [];
        mockClient.on(ClientEvent.Room, (room: Room) => {
            roomEvents.push(room);
        });

        room1 = new Room("!room1:example.com", mockClient, userId1);
        room1.getMyMembership = () => "join";

        localRoom = new LocalRoom(LOCAL_ROOM_ID_PREFIX + "test", mockClient, userId1);
        localRoom.afterCreateCallbacks.push((roomId: string) => {
            localRoomCallbackRoomId = roomId;
            return Promise.resolve();
        });

        dmRoomMap = {
            getDMRoomForIdentifiers: jest.fn(),
            getDMRoomsForUserId: jest.fn(),
        } as unknown as DMRoomMap;
        jest.spyOn(DMRoomMap, "shared").mockReturnValue(dmRoomMap);
        jest.spyOn(dis, "dispatch");

        jest.setSystemTime(new Date(2022, 7, 4, 11, 12, 30, 42));
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
                room1.currentState.setStateEvents([
                    makeMembershipEvent(room1.roomId, userId1, "join"),
                    makeMembershipEvent(room1.roomId, userId2, "join"),
                ]);

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

    describe("startDmOnFirstMessage", () => {
        describe("if no room exists", () => {
            beforeEach(() => {
                jest.spyOn(dmModule, "findDMRoom").mockReturnValue(null);
            });

            it("should create a local room and dispatch a view room event", async () => {
                jest.spyOn(dmModule, "createDmLocalRoom").mockResolvedValue(localRoom);
                const room = await dmModule.startDmOnFirstMessage(mockClient, [member1]);
                expect(room).toBe(localRoom);
                expect(dis.dispatch).toHaveBeenCalledWith({
                    action: Action.ViewRoom,
                    room_id: room.roomId,
                    joining: false,
                    targets: [member1],
                });
            });
        });

        describe("if a room exists", () => {
            beforeEach(() => {
                jest.spyOn(dmModule, "findDMRoom").mockReturnValue(room1);
            });

            it("should return the room and dispatch a view room event", async () => {
                const room = await dmModule.startDmOnFirstMessage(mockClient, [member1]);
                expect(room).toBe(room1);
                expect(dis.dispatch).toHaveBeenCalledWith({
                    action: Action.ViewRoom,
                    room_id: room1.roomId,
                    should_peek: false,
                    joining: false,
                    metricsTrigger: "MessageUser",
                });
            });
        });
    });

    describe("createDmLocalRoom", () => {
        describe("when rooms should be encrypted", () => {
            beforeEach(() => {
                mocked(privateShouldBeEncrypted).mockReturnValue(true);
            });

            it("should create an unencrypted room for 3PID targets", async () => {
                const room = await dmModule.createDmLocalRoom(mockClient, [member2]);
                expect(mockClient.store.storeRoom).toHaveBeenCalledWith(room);
                assertLocalRoom(room, [member2], false);
            });

            describe("for MXID targets with encryption available", () => {
                beforeEach(() => {
                    mocked(canEncryptToAllUsers).mockResolvedValue(true);
                });

                it("should create an encrypted room", async () => {
                    const room = await dmModule.createDmLocalRoom(mockClient, [member1]);
                    expect(mockClient.store.storeRoom).toHaveBeenCalledWith(room);
                    assertLocalRoom(room, [member1], true);
                });
            });

            describe("for MXID targets with encryption unavailable", () => {
                beforeEach(() => {
                    mocked(canEncryptToAllUsers).mockResolvedValue(false);
                });

                it("should create an unencrypted room", async () => {
                    const room = await dmModule.createDmLocalRoom(mockClient, [member1]);
                    expect(mockClient.store.storeRoom).toHaveBeenCalledWith(room);
                    assertLocalRoom(room, [member1], false);
                });
            });
        });

        describe("if rooms should not be encrypted", () => {
            beforeEach(() => {
                mocked(privateShouldBeEncrypted).mockReturnValue(false);
            });

            it("should create an unencrypted room", async () => {
                const room = await dmModule.createDmLocalRoom(mockClient, [member1]);
                assertLocalRoom(room, [member1], false);
            });
        });
    });

    describe("isRoomReady", () => {
        beforeEach(() => {
            localRoom.targets = [member1];
        });

        it("should return false if the room has no actual room id", () => {
            expect(dmModule.isRoomReady(mockClient, localRoom)).toBe(false);
        });

        describe("for a room with an actual room id", () => {
            beforeEach(() => {
                localRoom.actualRoomId = room1.roomId;
                mocked(mockClient.getRoom).mockReturnValue(null);
            });

            it("it should return false", () => {
                expect(dmModule.isRoomReady(mockClient, localRoom)).toBe(false);
            });

            describe("and the room is known to the client", () => {
                beforeEach(() => {
                    mocked(mockClient.getRoom).mockImplementation((roomId: string) => {
                        if (roomId === room1.roomId) return room1;
                    });
                });

                it("it should return false", () => {
                    expect(dmModule.isRoomReady(mockClient, localRoom)).toBe(false);
                });

                describe("and all members have been invited or joined", () => {
                    beforeEach(() => {
                        room1.currentState.setStateEvents([
                            makeMembershipEvent(room1.roomId, userId1, "join"),
                            makeMembershipEvent(room1.roomId, userId2, "invite"),
                        ]);
                    });

                    it("it should return false", () => {
                        expect(dmModule.isRoomReady(mockClient, localRoom)).toBe(false);
                    });

                    describe("and a RoomHistoryVisibility event", () => {
                        beforeEach(() => {
                            room1.currentState.setStateEvents([mkEvent({
                                user: userId1,
                                event: true,
                                type: EventType.RoomHistoryVisibility,
                                room: room1.roomId,
                                content: {},
                            })]);
                        });

                        it("it should return true", () => {
                            expect(dmModule.isRoomReady(mockClient, localRoom)).toBe(true);
                        });

                        describe("and an encrypted room", () => {
                            beforeEach(() => {
                                localRoom.encrypted = true;
                            });

                            it("it should return false", () => {
                                expect(dmModule.isRoomReady(mockClient, localRoom)).toBe(false);
                            });

                            describe("and a room encryption state event", () => {
                                beforeEach(() => {
                                    room1.currentState.setStateEvents([mkEvent({
                                        user: userId1,
                                        event: true,
                                        type: EventType.RoomEncryption,
                                        room: room1.roomId,
                                        content: {},
                                    })]);
                                });

                                it("it should return true", () => {
                                    expect(dmModule.isRoomReady(mockClient, localRoom)).toBe(true);
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    describe("createRoomFromLocalRoom", () => {
        beforeEach(() => {
            jest.spyOn(dmModule, "startDm");
        });

        [LocalRoomState.CREATING, LocalRoomState.CREATED, LocalRoomState.ERROR].forEach((state: LocalRoomState) => {
            it(`should do nothing for room in state ${state}`, async () => {
                localRoom.state = state;
                await dmModule.createRoomFromLocalRoom(mockClient, localRoom);
                expect(localRoom.state).toBe(state);
                expect(dmModule.startDm).not.toHaveBeenCalled();
            });
        });

        describe("on startDm error", () => {
            beforeEach(() => {
                mocked(dmModule.startDm).mockRejectedValue(true);
            });

            it("should set the room state to error", async () => {
                await dmModule.createRoomFromLocalRoom(mockClient, localRoom);
                expect(localRoom.state).toBe(LocalRoomState.ERROR);
            });
        });

        describe("on startDm success", () => {
            beforeEach(() => {
                jest.spyOn(dmModule, "waitForRoomReadyAndApplyAfterCreateCallbacks").mockResolvedValue(room1.roomId);
                mocked(dmModule.startDm).mockResolvedValue(room1.roomId);
            });

            it(
                "should set the room into creating state and call waitForRoomReadyAndApplyAfterCreateCallbacks",
                async () => {
                    const result = await dmModule.createRoomFromLocalRoom(mockClient, localRoom);
                    expect(result).toBe(room1.roomId);
                    expect(localRoom.state).toBe(LocalRoomState.CREATING);
                    expect(dmModule.waitForRoomReadyAndApplyAfterCreateCallbacks).toHaveBeenCalledWith(
                        mockClient,
                        localRoom,
                    );
                },
            );
        });
    });

    describe("waitForRoomReadyAndApplyAfterCreateCallbacks", () => {
        beforeEach(() => {
            localRoom.actualRoomId = room1.roomId;
            jest.useFakeTimers();
        });

        describe("for an immediate ready room", () => {
            beforeEach(() => {
                jest.spyOn(dmModule, "isRoomReady").mockReturnValue(true);
            });

            it("should invoke the callbacks, set the room state to created and return the actual room id", async () => {
                const result = await dmModule.waitForRoomReadyAndApplyAfterCreateCallbacks(mockClient, localRoom);
                expect(localRoom.state).toBe(LocalRoomState.CREATED);
                expect(localRoomCallbackRoomId).toBe(room1.roomId);
                expect(result).toBe(room1.roomId);
            });
        });

        describe("for a room running into the create timeout", () => {
            beforeEach(() => {
                jest.spyOn(dmModule, "isRoomReady").mockReturnValue(false);
            });

            it("should invoke the callbacks, set the room state to created and return the actual room id", (done) => {
                const prom = dmModule.waitForRoomReadyAndApplyAfterCreateCallbacks(mockClient, localRoom);
                jest.advanceTimersByTime(5000);
                prom.then((roomId: string) => {
                    expect(localRoom.state).toBe(LocalRoomState.CREATED);
                    expect(localRoomCallbackRoomId).toBe(room1.roomId);
                    expect(roomId).toBe(room1.roomId);
                    expect(jest.getTimerCount()).toBe(0);
                    done();
                });
            });
        });

        describe("for a room that is ready after a while", () => {
            beforeEach(() => {
                jest.spyOn(dmModule, "isRoomReady").mockReturnValue(false);
            });

            it("should invoke the callbacks, set the room state to created and return the actual room id", (done) => {
                const prom = dmModule.waitForRoomReadyAndApplyAfterCreateCallbacks(mockClient, localRoom);
                jest.spyOn(dmModule, "isRoomReady").mockReturnValue(true);
                jest.advanceTimersByTime(500);
                prom.then((roomId: string) => {
                    expect(localRoom.state).toBe(LocalRoomState.CREATED);
                    expect(localRoomCallbackRoomId).toBe(room1.roomId);
                    expect(roomId).toBe(room1.roomId);
                    expect(jest.getTimerCount()).toBe(0);
                    done();
                });
            });
        });
    });
});
