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

import { RoomMember } from "../../../models/rooms/RoomMember";
import { ThreePIDInvite } from "../../../models/rooms/ThreePIDInvite";
import { IMemberService } from "./IMemberService";

export class MockMemberService implements IMemberService {
    private joinedMembers: RoomMember[];
    private invitedMembers: RoomMember[];
    private threePIDInvites: ThreePIDInvite[];
    private onMemberListUpdated?: (reload: boolean) => void = undefined;

    public constructor(joinedMembers: RoomMember[], invitedMembers: RoomMember[], threePIDInvites: ThreePIDInvite[]) {
        this.joinedMembers = joinedMembers;
        this.invitedMembers = invitedMembers;
        this.threePIDInvites = threePIDInvites;
    }
    public updateJoinedMember(member: RoomMember): void {
        const index = this.joinedMembers.findIndex((member) => member.userId === member.userId);
        this.joinedMembers[index] = member;
        this.onMemberListUpdated?.(false);
    }

    public load(): void {}
    public unload(): void {}

    public loadMembers(searchQuery?: string): Promise<Record<"joined" | "invited", RoomMember[]>> {
        const filterByQuery = (member: RoomMember): boolean => !searchQuery || member.name.includes(searchQuery);
        const filteredJoinedMembers = this.joinedMembers.filter(filterByQuery);
        const filteredInvitedMembers = this.invitedMembers.filter(filterByQuery);
        return Promise.resolve({ invited: filteredInvitedMembers, joined: filteredJoinedMembers });
    }

    public setOnMemberListUpdated(callback: (reload: boolean) => void): void {
        this.onMemberListUpdated = callback;
    }

    public setOnPresenceUpdated(callback: (userId: string) => void): void {}

    public getThreePIDInvites(): ThreePIDInvite[] {
        return this.threePIDInvites;
    }

    public shouldShowInvite(): boolean {
        return true;
    }

    public showPresence(): boolean {
        return true;
    }
}
