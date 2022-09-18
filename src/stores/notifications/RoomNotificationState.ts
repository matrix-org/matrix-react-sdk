/*
Copyright 2020 The Matrix.org Foundation C.I.C.

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

import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { NotificationCountType, Room, RoomEvent } from "matrix-js-sdk/src/models/room";

import { NotificationColor } from "./NotificationColor";
import { EffectiveMembership, getEffectiveMembership } from "../../utils/membership";
import * as RoomNotifs from '../../RoomNotifs';
import * as Unread from '../../Unread';
import { getUnsentMessages } from "../../components/structures/RoomStatusBar";
import { TimelineNotificationState } from "./TimelineNotificationState";

export class RoomNotificationState extends TimelineNotificationState {
    constructor(public readonly room: Room) {
        super(room);
        this.room.on(RoomEvent.MyMembership, this.handleMembershipUpdate);
        this.updateNotificationState();
    }

    private get roomIsInvite(): boolean {
        return getEffectiveMembership(this.room.getMyMembership()) === EffectiveMembership.Invite;
    }

    public destroy(): void {
        super.destroy();
        this.room.removeListener(RoomEvent.MyMembership, this.handleMembershipUpdate);
    }

    protected handleReadReceipt = (event: MatrixEvent): void => {
        if (event.getRoomId() !== this.room.roomId) return; // not for us - ignore
        super.handleReadReceipt(event);
    };

    private handleMembershipUpdate = (): void => {
        return this.updateNotificationState();
    };

    protected onEventDecrypted = (event: MatrixEvent): void => {
        if (event.getRoomId() !== this.room.roomId) return; // ignore - not for us or notifications timeline
        if (event.threadRootId && !event.isThreadRoot) return; // ignore all threaded events

        super.onEventDecrypted(event);
    };

    protected handleRoomEventUpdate = (event: MatrixEvent): void => {
        if (event.getRoomId() !== this.room.roomId) return; // ignore - not for us or notifications timeline
        super.handleRoomEventUpdate(event);
    };

    protected updateNotificationState(): void {
        const snapshot = this.snapshot();

        if (getUnsentMessages(this.room).length > 0) {
            // When there are unsent messages we show a red `!`
            this._color = NotificationColor.Unsent;
            this._symbol = "!";
            this._count = 1; // not used, technically
        } else if (RoomNotifs.getRoomNotifsState(this.room.roomId) === RoomNotifs.RoomNotifState.Mute) {
            // When muted we suppress all notification states, even if we have context on them.
            this._color = NotificationColor.None;
            this._symbol = null;
            this._count = 0;
        } else if (this.roomIsInvite) {
            this._color = NotificationColor.Red;
            this._symbol = "!";
            this._count = 1; // not used, technically
        } else {
            super.updateNotificationState();

            const redNotifs = RoomNotifs.getUnreadNotificationCount(this.room, NotificationCountType.Highlight);
            const greyNotifs = RoomNotifs.getUnreadNotificationCount(this.room, NotificationCountType.Total);

            if (redNotifs === 0 && greyNotifs === 0) {
                // We don't have any notified messages, but we might have unread messages. Let's
                // find out.
                const hasUnread = Unread.doesRoomHaveUnreadMessages(this.room);
                if (hasUnread) {
                    this._color = NotificationColor.Bold;
                } else {
                    this._color = NotificationColor.None;
                }

                // no symbol or count for this state
                this._count = 0;
                this._symbol = null;
            }
        }

        // finally, publish an update if needed
        this.emitIfUpdated(snapshot);
    }
}
