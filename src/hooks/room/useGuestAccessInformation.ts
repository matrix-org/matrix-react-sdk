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

import { useCallback } from "react";
import { EventTimeline, EventType, JoinRule, Room, RoomMemberEvent, RoomStateEvent } from "matrix-js-sdk/src/matrix";

import { useEventEmitterState } from "../useEventEmitter";

interface GuestAccessInformation {
    canChangeJoinRule: boolean;
    roomIsJoinableState: boolean;
    isRoomJoinable: () => boolean;
    canInvite: boolean;
}

/**
 * Helper to retrieve the guest access related information for a room.
 * @param room
 * @returns The GuestAccessInformation which helps decide what options the user should be given.
 */
export const useGuestAccessInformation = (room: Room): GuestAccessInformation => {
    // We use the direct function only in functions triggered by user interaction to avoid computation on every render.
    const isRoomJoinable = useCallback(
        () =>
            room.getJoinRule() === JoinRule.Public ||
            (room.getJoinRule() === JoinRule.Knock && room.canInvite(room.myUserId)),
        [room],
    );

    const roomIsJoinableState = useEventEmitterState(room, RoomStateEvent.Update, isRoomJoinable);
    const canInvite = useEventEmitterState(room, RoomStateEvent.Update, () => room.canInvite(room.myUserId));

    const canChangeJoinRule = useEventEmitterState(
        room.client,
        RoomMemberEvent.PowerLevel,
        () =>
            room
                .getLiveTimeline()
                ?.getState(EventTimeline.FORWARDS)
                ?.maySendStateEvent(EventType.RoomJoinRules, room.myUserId) ?? false,
    );
    return { canChangeJoinRule, roomIsJoinableState, isRoomJoinable, canInvite };
};
