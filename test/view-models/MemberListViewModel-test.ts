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

import { Observable, lastValueFrom, take } from "rxjs";

import { RoomMember } from "../../src/models/rooms/RoomMember";
import { ThreePIDInvite } from "../../src/models/rooms/ThreePIDInvite";
import { MockMemberService } from "../../src/services/rooms/memberlist/MockMemberService";
import { MemberListViewModel } from "../../src/view-models/rooms/memberlist/MemberListViewModel";

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
    let viewModel: MemberListViewModel;

    beforeEach(() => {
        memberListService = new MockMemberService([member1], [member2], [threePIDInvite]);
        viewModel = new MemberListViewModel(memberListService);
    });

    function getLast<T>(observable: Observable<T>, from = 1): Promise<T> {
        return lastValueFrom(observable.pipe(take(from)));
    }

    it("initial loaded states", async () => {
        await viewModel.load();
        await expect(getLast(viewModel.loading)).resolves.toBe(false);
        const memberState = await getLast(viewModel.memberState);
        expect(memberState.joinedMembers[0].userId).toBe(userId1);
        expect(memberState.invitedMembers[0]).toEqual(expect.objectContaining({ userId: userId2 }));
        expect(memberState.invitedMembers[1]).toEqual(expect.objectContaining({ displayName: "charlie@email.org" }));
    });

    it("member name updated", async () => {
        await viewModel.load();
        const member1Updated: RoomMember = { ...member1, name: "Alice Updated" };
        memberListService.updateJoinedMember(member1Updated);
        const memberState = await getLast(viewModel.memberState, 2);
        expect(memberState.joinedMembers[0].name).toBe(member1Updated.name);
    });

    it("filter members", async () => {
        await viewModel.load();
        await viewModel.onSearchQueryChanged("Alic");
        const memberState = await getLast(viewModel.memberState, 1); // Not sure why there are not more emissions here
        expect(memberState.joinedMembers.length).toBe(1);
        expect(memberState.invitedMembers.length).toBe(1); // Bob Filtered out, 3PIDs are not.
        expect(memberState.joinedMembers[0]).toEqual(expect.objectContaining({ name: "Alice" }));
    });
});
