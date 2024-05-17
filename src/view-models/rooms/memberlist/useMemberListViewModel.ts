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
import { throttle } from "lodash";
import { useCallback, useEffect, useMemo, useState } from "react";

import { RoomMember } from "../../../models/rooms/RoomMember";
import { IMemberService } from "../../../services/rooms/memberlist/IMemberService";
import { ThreePIDInvite } from "../../../models/rooms/ThreePIDInvite";

const INITIAL_LOAD_NUM_MEMBERS = 30;
const INITIAL_LOAD_NUM_INVITED = 5;
const SHOW_MORE_INCREMENT = 100;

export type MemberState = {
    joinedMembers: RoomMember[];
    invitedMembers: Array<RoomMember | ThreePIDInvite>;
};

export interface IMemberListViewModel extends MemberState {
    load(): Promise<void>;
    unload(): void;
    loading: boolean;
    truncateAtJoined: number;
    truncateAtInvited: number;
    shouldShowInvite: boolean;
    canInvite: boolean;
    isSpaceRoom: boolean;
    showPresence: boolean;
    searchQuery?: string;
    onSearchQueryChanged(query: string): Promise<void>;
    showMoreJoinedMemberList(): void;
    showMoreInvitedMemberList(): void;
}

export default function useMemberListViewModel(
    canInvite: boolean,
    isSpaceRoom: boolean,
    memberService?: IMemberService,
): IMemberListViewModel {
    const [memberState, setMemberState] = useState<MemberState>({
        joinedMembers: [],
        invitedMembers: [],
    });
    const [searchQuery, setSearchQuery] = useState<string | undefined>(undefined);
    const [showPresence, setShowPresence] = useState(true);
    const [loading, setLoading] = useState(false);
    const [truncateAtJoined, setTruncateAtJoined] = useState(INITIAL_LOAD_NUM_MEMBERS);
    const [truncateAtInvited, setTruncateAtInvited] = useState(INITIAL_LOAD_NUM_INVITED);

    const loadMembersNow = useCallback(
        async (showLoadingSpinner: boolean, query?: string): Promise<void> => {
            if (!memberService) return;

            if (showLoadingSpinner) {
                setLoading(true);
            }
            const { joined, invited } = await memberService.loadMembers(query);
            setLoading(false);
            setMemberState({
                joinedMembers: joined,
                invitedMembers: invited,
            });
        },
        [memberService],
    );

    const throttleLoadMembers = useMemo(
        () =>
            throttle(
                (query?: string) => {
                    loadMembersNow(false, query);
                },
                500,
                { leading: true, trailing: true },
            ),
        [loadMembersNow],
    );

    const onMembersUpdated = useCallback(
        (reload: boolean) => {
            if (reload) {
                loadMembersNow(true, searchQuery);
            } else {
                throttleLoadMembers(searchQuery);
            }
        },
        [loadMembersNow, throttleLoadMembers, searchQuery],
    );

    const onPresenceUpdated = useCallback(
        (userId: string) => {
            throttleLoadMembers(searchQuery);
        },
        [throttleLoadMembers, searchQuery],
    );

    const load = useCallback(async (): Promise<void> => {
        if (!memberService) return;
        memberService.setOnMemberListUpdated(onMembersUpdated);
        memberService.setOnPresenceUpdated(onPresenceUpdated);
        memberService.load();
        setShowPresence(memberService.showPresence());
        await loadMembersNow(true);
        // Including these dependencies casues the function to update and the effect to be called again.
        // Not quite sure how to lay things out.
    }, [memberService]); //, onPresenceUpdated, onMembersUpdated]);

    const unload = useCallback(() => {
        throttleLoadMembers.cancel();
        memberService?.unload();
    }, [memberService, throttleLoadMembers]);

    useEffect(() => {
        load();
        return () => {
            unload();
        };
    }, [load, unload]);

    async function onSearchQueryChanged(query: string): Promise<void> {
        setSearchQuery(query);
        loadMembersNow(false, query);
    }

    function showMoreJoinedMemberList(): void {
        setTruncateAtJoined(truncateAtJoined + SHOW_MORE_INCREMENT);
    }

    function showMoreInvitedMemberList(): void {
        setTruncateAtInvited(truncateAtInvited + SHOW_MORE_INCREMENT);
    }

    return {
        ...memberState,
        truncateAtInvited,
        truncateAtJoined,
        loading,
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
    };
}
