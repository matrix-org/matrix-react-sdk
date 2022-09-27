/*
 * Copyright 2020 The Matrix.org Foundation C.I.C.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Room } from "matrix-js-sdk/src/models/room";

import LegacyCallHandler from "../../../LegacyCallHandler";
import { RoomListCustomisations } from "../../../customisations/RoomList";
import { isLocalRoom } from "../../../utils/localRoom/isLocalRoom";
import VoipUserMapper from "../../../VoipUserMapper";
import { MatrixClientPeg } from "../../../MatrixClientPeg";

export class VisibilityProvider {
    private static internalInstance: VisibilityProvider;

    private constructor() {
    }

    public static get instance(): VisibilityProvider {
        if (!VisibilityProvider.internalInstance) {
            VisibilityProvider.internalInstance = new VisibilityProvider();
        }
        return VisibilityProvider.internalInstance;
    }

    public async onNewInvitedRoom(room: Room) {
        await VoipUserMapper.sharedInstance().onNewInvitedRoom(room);
    }

    public async isRoomVisible(room?: Room): Promise<boolean> {
        if (!room) {
            return false;
        }

        if (
            LegacyCallHandler.instance.getSupportsVirtualRooms() &&
            VoipUserMapper.sharedInstance().isVirtualRoom(room)
        ) {
            return false;
        }

        if (room.getMyMembership() === "invite") {
            // Find out whether the invite should be hidden.
            const cli = MatrixClientPeg.get();
            const myUserId = cli.getUserId();
            const inviter = room.currentState.getMember(myUserId);
            if (inviter?.events?.member) {
                const inviterUserId = inviter.events.member.getSender();
                const rule = await cli.ignoredInvites.getRuleForInvite({ roomId: room.roomId, sender: inviterUserId });
                if (rule) {
                    // Indeed, there is a rule that specifies we should hide the invite.
                    return false;
                }
            }
        }

        // hide space rooms as they'll be shown in the SpacePanel
        if (room.isSpaceRoom()) {
            return false;
        }

        if (isLocalRoom(room)) {
            // local rooms shouldn't show up anywhere
            return false;
        }

        const isVisibleFn = RoomListCustomisations.isRoomVisible;
        if (isVisibleFn) {
            return isVisibleFn(room);
        }

        return true; // default
    }
}
