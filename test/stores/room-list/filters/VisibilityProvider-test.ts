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
import { Room } from "matrix-js-sdk/src/matrix";

import { VisibilityProvider } from "../../../../src/stores/room-list/filters/VisibilityProvider";
import LegacyCallHandler from "../../../../src/LegacyCallHandler";
import VoipUserMapper from "../../../../src/VoipUserMapper";
import { LocalRoom, LOCAL_ROOM_ID_PREFIX } from "../../../../src/models/LocalRoom";
import { RoomListCustomisations } from "../../../../src/customisations/RoomList";
import { createTestClient, IGNORE_INVITES_FROM_THIS_USER, IGNORE_INVITES_TO_THIS_ROOM, stubClient }
    from "../../../test-utils";
import { MatrixClientPeg } from "../../../../src/MatrixClientPeg";

jest.mock("../../../../src/VoipUserMapper", () => ({
    sharedInstance: jest.fn(),
}));

jest.mock("../../../../src/LegacyCallHandler", () => ({
    instance: {
        getSupportsVirtualRooms: jest.fn(),
    },
}));

jest.mock("../../../../src/customisations/RoomList", () => ({
    RoomListCustomisations: {
        isRoomVisible: jest.fn(),
    },
}));

const createRoom = ({ isSpaceRoom, inviter, roomId }: { isSpaceRoom?: boolean, inviter?: string, roomId?: string } =
{ isSpaceRoom: false, roomId: `${Math.random()}:example.org` }): Room => {
    return {
        roomId,
        isSpaceRoom: () => isSpaceRoom,
        getMyMembership: () =>
            inviter ? "invite" : "join",
        currentState: {
            getMember(userId: string): any | null {
                if (userId != MatrixClientPeg.get().getUserId()) {
                    return null;
                }
                return {
                    events: {
                        member: {
                            getSender() {
                                return inviter;
                            },
                        },
                    },
                };
            },
        },
    } as unknown as Room;
};

const createLocalRoom = (): LocalRoom => {
    const room = new LocalRoom(LOCAL_ROOM_ID_PREFIX + "test", createTestClient(), "@test:example.com");
    room.isSpaceRoom = () => false;
    return room;
};

describe("VisibilityProvider", () => {
    let mockVoipUserMapper: VoipUserMapper;

    beforeEach(() => {
        mockVoipUserMapper = {
            onNewInvitedRoom: jest.fn(),
            isVirtualRoom: jest.fn(),
        } as unknown as VoipUserMapper;
        mocked(VoipUserMapper.sharedInstance).mockReturnValue(mockVoipUserMapper);
        stubClient();
    });

    describe("instance", () => {
        it("should return an instance", () => {
            const visibilityProvider = VisibilityProvider.instance;
            expect(visibilityProvider).toBeInstanceOf(VisibilityProvider);
            expect(VisibilityProvider.instance).toBe(visibilityProvider);
        });
    });

    describe("onNewInvitedRoom", () => {
        it("should call onNewInvitedRoom on VoipUserMapper.sharedInstance", async () => {
            const room = {} as unknown as Room;
            await VisibilityProvider.instance.onNewInvitedRoom(room);
            expect(mockVoipUserMapper.onNewInvitedRoom).toHaveBeenCalledWith(room);
        });
    });

    describe("isRoomVisible", () => {
        describe("for a virtual room", () => {
            beforeEach(() => {
                mocked(LegacyCallHandler.instance.getSupportsVirtualRooms).mockReturnValue(true);
                mocked(mockVoipUserMapper.isVirtualRoom).mockReturnValue(true);
            });

            it("should return return false", async () => {
                const room = createRoom();
                expect(await VisibilityProvider.instance.isRoomVisible(room)).toBe(false);
                expect(mockVoipUserMapper.isVirtualRoom).toHaveBeenCalledWith(room);
            });
        });

        it("should return false without room", async () => {
            expect(await VisibilityProvider.instance.isRoomVisible()).toBe(false);
        });

        it("should return false for a space room", async () => {
            const room = createRoom({ isSpaceRoom: true });
            expect(await VisibilityProvider.instance.isRoomVisible(room)).toBe(false);
        });

        it("should return false for a local room", async () => {
            const room = createLocalRoom();
            expect(await VisibilityProvider.instance.isRoomVisible(room)).toBe(false);
        });

        it("should return false if visibility customisation returns false", async () => {
            mocked(RoomListCustomisations.isRoomVisible).mockReturnValue(false);
            const room = createRoom();
            expect(await VisibilityProvider.instance.isRoomVisible(room)).toBe(false);
            expect(RoomListCustomisations.isRoomVisible).toHaveBeenCalledWith(room);
        });

        it("should return true if visibility customisation returns true", async () => {
            mocked(RoomListCustomisations.isRoomVisible).mockReturnValue(true);
            const room = createRoom();
            expect(await VisibilityProvider.instance.isRoomVisible(room)).toBe(true);
            expect(RoomListCustomisations.isRoomVisible).toHaveBeenCalledWith(room);
        });

        it("should return true if the room is an invite but hasn't been marked as ignored", async () => {
            mocked(RoomListCustomisations.isRoomVisible).mockReturnValue(true);
            const room = createRoom({ inviter: "@good-user:example.org" });
            expect(await VisibilityProvider.instance.isRoomVisible(room)).toBe(true);
            expect(RoomListCustomisations.isRoomVisible).toHaveBeenCalledWith(room);
        });

        it("should return false if the room is an invite and the sender has been marked as ignored", async () => {
            mocked(RoomListCustomisations.isRoomVisible).mockReturnValue(true);
            const room = createRoom({ inviter: IGNORE_INVITES_FROM_THIS_USER });
            expect(await VisibilityProvider.instance.isRoomVisible(room)).toBe(false);
        });

        it("should return false if the room is an invite and the roomId has been marked as ignored", async () => {
            mocked(RoomListCustomisations.isRoomVisible).mockReturnValue(true);
            const room = createRoom({ inviter: "@good-user:example.org", roomId: IGNORE_INVITES_TO_THIS_ROOM });
            expect(await VisibilityProvider.instance.isRoomVisible(room)).toBe(false);
        });
    });
});
