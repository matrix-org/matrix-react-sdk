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
import { Room, RoomMember } from "matrix-js-sdk/src/matrix";

import { avatarUrlForRoom } from "../src/Avatar";
import { Media, mediaFromMxc } from "../src/customisations/Media";
import DMRoomMap from "../src/utils/DMRoomMap";

jest.mock("../src/customisations/Media", () => ({
    mediaFromMxc: jest.fn(),
}));

const roomId = "!room:example.com";
const avatarUrl1 = "https://example.com/avatar1";
const avatarUrl2 = "https://example.com/avatar2";

describe("avatarUrlForRoom should return", () => {
    let getThumbnailOfSourceHttp: jest.Mock;
    let room: Room;
    let roomMember: RoomMember;
    let dmRoomMap: DMRoomMap;

    beforeEach(() => {
        getThumbnailOfSourceHttp = jest.fn();
        mocked(mediaFromMxc).mockImplementation((): Media => {
            return {
                getThumbnailOfSourceHttp,
            } as unknown as Media;
        });
        room = {
            roomId,
            getMxcAvatarUrl: jest.fn(),
            isSpaceRoom: jest.fn(),
            getAvatarFallbackMember: jest.fn(),
        } as unknown as Room;
        dmRoomMap = {
            getUserIdForRoomId: jest.fn(),
        } as unknown as DMRoomMap;
        DMRoomMap.setShared(dmRoomMap);
        roomMember = {
            getMxcAvatarUrl: jest.fn(),
        } as unknown as RoomMember;
    });

    it("null for a null room", () => {
        expect(avatarUrlForRoom(null, 128, 128)).toBeNull();
    });

    it("the HTTP source if the room provides a MXC url", () => {
        mocked(room.getMxcAvatarUrl).mockReturnValue(avatarUrl1);
        getThumbnailOfSourceHttp.mockReturnValue(avatarUrl2);
        expect(avatarUrlForRoom(room, 128, 256, "crop")).toEqual(avatarUrl2);
        expect(getThumbnailOfSourceHttp).toHaveBeenCalledWith(128, 256, "crop");
    });

    it("null for a space room", () => {
        mocked(room.isSpaceRoom).mockReturnValue(true);
        expect(avatarUrlForRoom(room, 128, 128)).toBeNull();
    });

    it("null if the room is not a DM", () => {
        mocked(dmRoomMap).getUserIdForRoomId.mockReturnValue(null);
        expect(avatarUrlForRoom(room, 128, 128)).toBeNull();
        expect(dmRoomMap.getUserIdForRoomId).toHaveBeenCalledWith(roomId);
    });

    it("null if there is no other member in the room", () => {
        mocked(dmRoomMap).getUserIdForRoomId.mockReturnValue("@user:example.com");
        mocked(room.getAvatarFallbackMember).mockReturnValue(null);
        expect(avatarUrlForRoom(room, 128, 128)).toBeNull();
    });

    it("null if the other member has no avatar URL", () => {
        mocked(dmRoomMap).getUserIdForRoomId.mockReturnValue("@user:example.com");
        mocked(room.getAvatarFallbackMember).mockReturnValue(roomMember);
        expect(avatarUrlForRoom(room, 128, 128)).toBeNull();
    });

    it("the other member's avatar URL", () => {
        mocked(dmRoomMap).getUserIdForRoomId.mockReturnValue("@user:example.com");
        mocked(room.getAvatarFallbackMember).mockReturnValue(roomMember);
        mocked(roomMember.getMxcAvatarUrl).mockReturnValue(avatarUrl2);
        getThumbnailOfSourceHttp.mockReturnValue(avatarUrl2);
        expect(avatarUrlForRoom(room, 128, 256, "crop")).toEqual(avatarUrl2);
        expect(getThumbnailOfSourceHttp).toHaveBeenCalledWith(128, 256, "crop");
    });
});
