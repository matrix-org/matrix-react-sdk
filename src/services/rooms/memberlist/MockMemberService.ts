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

    joinedMembers: RoomMember[]
    invitedMembers: RoomMember[]
    threePIDInvites: ThreePIDInvite[]
    onMemberListUpdated?: (reload: boolean) => void = undefined

    constructor(
        joinedMembers: RoomMember[],
        invitedMembers: RoomMember[],
        threePIDInvites: ThreePIDInvite[]
    ) {
        this.joinedMembers = joinedMembers
        this.invitedMembers = invitedMembers
        this.threePIDInvites = threePIDInvites
    }
    updateJoinedMember(member: RoomMember){
        let index = this.joinedMembers.findIndex((member) => member.userId === member.userId);
        this.joinedMembers[index] = member;
        this.onMemberListUpdated?.(false);
    }

    load(): void {
        
    }
    unload(): void {
        
    }

    loadMembers(searchQuery: string): Promise<Record<"joined" | "invited", RoomMember[]>> {
        const filterByQuery = (member: RoomMember) => member.name.includes(searchQuery)
        const filteredJoinedMembers =  this.joinedMembers.filter(filterByQuery)
        const filteredInvitedMembers =  this.invitedMembers.filter(filterByQuery)
        return Promise.resolve({invited: filteredInvitedMembers, joined: filteredJoinedMembers})
    }

    setOnMemberListUpdated(callback: (reload: boolean) => void): void {
        this.onMemberListUpdated = callback
    }

    setOnPresemceUpdated(callback: (userId: string) => void): void {
        
    }

    getThreePIDInvites(): ThreePIDInvite[] {
        return this.threePIDInvites
    }

    shouldShowInvite(): boolean {
        return true
    }

    showPresence(): boolean {
        return true
    }

}