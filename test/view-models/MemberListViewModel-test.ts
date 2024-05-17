/*
Copyright 2024 The Matrix.org Foundation C.I.C.

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

import { RenderResult, act, renderHook } from "@testing-library/react-hooks";

import useMemberListViewModelFactory, {
    IMemberListViewModel,
} from "../../src/view-models/rooms/memberlist/useMemberListViewModel";
import { RoomMember } from "../../src/models/rooms/RoomMember";
import { ThreePIDInvite } from "../../src/models/rooms/ThreePIDInvite";
import { MockMemberService } from "../../src/services/rooms/memberlist/MockMemberService";

const roomId = "!room:server.org";
const userId1 = "@alice:server.org";
const userId2 = "@bob:server.org";
const member1: RoomMember = {
    roomId: roomId,
    userId: userId1,
    displayUserId: userId1,
    name: "Alice",
    rawDisplayName: "Alice",
    disambiguate: false,
    avatarThumbnailUrl: undefined,
    powerLevel: 100,
    lastModifiedTime: 1,
};

const member2: RoomMember = {
    roomId: roomId,
    userId: userId2,
    displayUserId: userId2,
    name: "Bob",
    rawDisplayName: "Bob",
    disambiguate: false,
    avatarThumbnailUrl: undefined,
    powerLevel: 100,
    lastModifiedTime: 1,
};

const threePIDInvite: ThreePIDInvite = {
    eventId: "123",
    stateKey: "abc",
    displayName: "charlie@email.org",
};

describe("MemberListViewModel", () => {
    let memberListService: MockMemberService;

    beforeEach(() => {
        memberListService = new MockMemberService([member1], [member2], [threePIDInvite]);
    });

    async function loadViewModel(): Promise<RenderResult<IMemberListViewModel>> {
        const vm = renderHook(() => useMemberListViewModelFactory(true, true, memberListService));
        const { result } = vm;
        await act(async () => await result.current.load());
        return result;
    }

    it("initial loaded states", async () => {
        const result = await loadViewModel();
        expect(result.current.loading).toBe(false);
        expect(result.current.joinedMembers[0].userId).toBe(userId1);
        expect(result.current.invitedMembers[0]).toEqual(expect.objectContaining({ userId: userId2 }));
        expect(result.current.invitedMembers[1]).toEqual(expect.objectContaining({ displayName: "charlie@email.org" }));
    });

    it("member name updated", async () => {
        const result = await loadViewModel();
        const member1Updated: RoomMember = { ...member1, name: "Alice Updated" };
        await act(async () => memberListService.updateJoinedMember(member1Updated));
        expect(result.current.joinedMembers[0].name).toBe(member1Updated.name);
    });

    it("filter members", async () => {
        const result = await loadViewModel();
        await act(async () => await result.current.onSearchQueryChanged("Alic"));
        expect(result.current.joinedMembers.length).toBe(1);
        expect(result.current.invitedMembers.length).toBe(1); // Bob Filtered out, 3PIDs are not.
        expect(result.current.joinedMembers[0]).toEqual(expect.objectContaining({ name: "Alice" }));
    });
});
