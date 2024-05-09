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

import { useState } from "react"
import { RoomMember } from "../../../models/rooms/RoomMember";
import { IMemberService } from "../../../services/rooms/memberlist/IMemberService";
import { throttle } from "lodash";
import { ThreePIDInvite } from "../../../models/rooms/ThreePIDInvite";

const INITIAL_LOAD_NUM_MEMBERS = 30;
const INITIAL_LOAD_NUM_INVITED = 5;
const SHOW_MORE_INCREMENT = 100;

export type MemberState = {
    loading: boolean;
    joinedMembers: RoomMember[];
    invitedMembers: Array<RoomMember | ThreePIDInvite>;
    truncateAtJoined: number;
    truncateAtInvited: number;
};

export interface IMemberListViewModel extends MemberState { 
    load(): Promise<void>;
    unload(): void;
    loading: boolean;
    joinedMembers: RoomMember[];
    invitedMembers: Array<RoomMember | ThreePIDInvite>;
    shouldShowInvite: boolean
    canInvite: boolean;
    isSpaceRoom: boolean;
    showPresence: boolean;
    searchQuery: string;
    onSearchQueryChanged(query: string): Promise<void>;
    showMoreJoinedMemberList(): void;
    showMoreInvitedMemberList(): void;
}

export default function MemberListViewModel(
    canInvite: boolean,
    isSpaceRoom: boolean,
    memberService?: IMemberService,
    ): IMemberListViewModel {

    const [memberState, setMemberState] = useState<MemberState>({ 
        loading: false, 
        joinedMembers: [], 
        invitedMembers: [], 
        truncateAtJoined: INITIAL_LOAD_NUM_MEMBERS,
        truncateAtInvited: INITIAL_LOAD_NUM_INVITED,
    });
    const [searchQuery, setSearchQuery] = useState("")
    const [showPresence, setShowPresence] = useState(true)
    async function load() {
        if(!memberService) return
        memberService.setOnMemberListUpdated(onMembersUpdated);
        memberService.setOnPresemceUpdated(onPresenceUpdated);
        memberService.load();
        setShowPresence(memberService.showPresence())
        await loadMembersNow(true);
    }

    function unload() {
        throttleLoadMembers.cancel();
        memberService?.unload();
    }

    function onMembersUpdated(reload: boolean): void {
        if(reload) {
            loadMembersNow(true);
        } else {
            throttleLoadMembers();
        }
    }

    function onPresenceUpdated(userId: string): void {
        // Only update the memberlist for presence changes for the members we are actually showing
        if (memberState.joinedMembers
            .slice(0, memberState.truncateAtJoined)
            .map((member) => member.userId).includes(userId)) {
            throttleLoadMembers()
        }
    }
    
    async function onSearchQueryChanged(query: string): Promise<void> {
        setSearchQuery(query);
        loadMembersNow(false, query);
    }

    const throttleLoadMembers = throttle(
        () => {
            loadMembersNow(false);
        },
        500,
        { leading: true, trailing: true },
    );

    async function loadMembersNow(showLoadingSpinner: boolean, query?: string): Promise<void> {
        if(!memberService) return

        if (showLoadingSpinner) {
            setMemberState({...memberState, loading: true})
        }
        const { joined, invited } = await memberService.loadMembers(query ?? searchQuery)
        setMemberState({
            ...memberState,
            loading: false,
            joinedMembers: joined,
            invitedMembers: invited,
        });
    }

    function showMoreJoinedMemberList(): void {
        setMemberState({...memberState, truncateAtJoined: memberState.truncateAtInvited + SHOW_MORE_INCREMENT});
    };

    function showMoreInvitedMemberList(): void {
        setMemberState({...memberState, truncateAtInvited: memberState.truncateAtInvited + SHOW_MORE_INCREMENT});
    };

    return {
        ...memberState,
        invitedMembers: memberState.invitedMembers.concat(memberService?.getThreePIDInvites() ?? []),
        load,
        unload,
        shouldShowInvite: memberService?.shouldShowInvite() ?? false,
        canInvite,
        isSpaceRoom,
        showPresence,
        searchQuery,
        onSearchQueryChanged,
        showMoreJoinedMemberList,
        showMoreInvitedMemberList,
    }
}