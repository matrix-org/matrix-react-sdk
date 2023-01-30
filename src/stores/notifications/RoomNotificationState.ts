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

import { MatrixEvent, MatrixEventEvent } from "matrix-js-sdk/src/models/event";
import { NotificationCountType, Room, RoomEvent } from "matrix-js-sdk/src/models/room";
import { ClientEvent } from "matrix-js-sdk/src/client";
import { Feature, ServerSupport } from "matrix-js-sdk/src/feature";

import { NotificationColor } from "./NotificationColor";
import { IDestroyable } from "../../utils/IDestroyable";
import { MatrixClientPeg } from "../../MatrixClientPeg";
import { EffectiveMembership, getEffectiveMembership } from "../../utils/membership";
import { readReceiptChangeIsFor } from "../../utils/read-receipts";
import * as RoomNotifs from "../../RoomNotifs";
import * as Unread from "../../Unread";
import { NotificationState, NotificationStateEvents } from "./NotificationState";
import { getUnsentMessages } from "../../components/structures/RoomStatusBar";
import { ThreadsRoomNotificationState } from "./ThreadsRoomNotificationState";

export class RoomNotificationState extends NotificationState implements IDestroyable {
    public constructor(public readonly room: Room, private readonly threadsState?: ThreadsRoomNotificationState) {
        super();
        const cli = this.room.client;
        this.room.on(RoomEvent.Receipt, this.handleReadReceipt);
        this.room.on(RoomEvent.MyMembership, this.handleMembershipUpdate);
        this.room.on(RoomEvent.LocalEchoUpdated, this.handleLocalEchoUpdated);
        this.room.on(RoomEvent.Timeline, this.handleRoomEventUpdate);
        this.room.on(RoomEvent.Redaction, this.handleRoomEventUpdate);

        this.room.on(RoomEvent.UnreadNotifications, this.handleNotificationCountUpdate); // for server-sent counts
        if (cli.canSupport.get(Feature.ThreadUnreadNotifications) === ServerSupport.Unsupported) {
            this.threadsState?.on(NotificationStateEvents.Update, this.handleThreadsUpdate);
        }
        cli.on(MatrixEventEvent.Decrypted, this.onEventDecrypted);
        cli.on(ClientEvent.AccountData, this.handleAccountDataUpdate);
        this.updateNotificationState();
    }

    private get roomIsInvite(): boolean {
        return getEffectiveMembership(this.room.getMyMembership()) === EffectiveMembership.Invite;
    }

    public destroy(): void {
        super.destroy();
        const cli = this.room.client;
        this.room.removeListener(RoomEvent.Receipt, this.handleReadReceipt);
        this.room.removeListener(RoomEvent.MyMembership, this.handleMembershipUpdate);
        this.room.removeListener(RoomEvent.LocalEchoUpdated, this.handleLocalEchoUpdated);
        this.room.removeListener(RoomEvent.Timeline, this.handleRoomEventUpdate);
        this.room.removeListener(RoomEvent.Redaction, this.handleRoomEventUpdate);
        if (cli.canSupport.get(Feature.ThreadUnreadNotifications) === ServerSupport.Unsupported) {
            this.room.removeListener(RoomEvent.UnreadNotifications, this.handleNotificationCountUpdate);
        } else if (this.threadsState) {
            this.threadsState.removeListener(NotificationStateEvents.Update, this.handleThreadsUpdate);
        }
        cli.removeListener(MatrixEventEvent.Decrypted, this.onEventDecrypted);
        cli.removeListener(ClientEvent.AccountData, this.handleAccountDataUpdate);
    }

    private handleThreadsUpdate = (): void => {
        this.updateNotificationState();
    };

    private handleLocalEchoUpdated = (): void => {
        this.updateNotificationState();
    };

    private handleReadReceipt = (event: MatrixEvent, room: Room): void => {
        if (!readReceiptChangeIsFor(event, MatrixClientPeg.get())) return; // not our own - ignore
        if (room.roomId !== this.room.roomId) return; // not for us - ignore
        this.updateNotificationState();
    };

    private handleMembershipUpdate = (): void => {
        this.updateNotificationState();
    };

    private handleNotificationCountUpdate = (): void => {
        this.updateNotificationState();
    };

    private onEventDecrypted = (event: MatrixEvent): void => {
        if (event.getRoomId() !== this.room.roomId) return; // ignore - not for us or notifications timeline

        this.updateNotificationState();
    };

    private handleRoomEventUpdate = (event: MatrixEvent): void => {
        if (event?.getRoomId() !== this.room.roomId) return; // ignore - not for us or notifications timeline
        this.updateNotificationState();
    };

    private handleAccountDataUpdate = (ev: MatrixEvent): void => {
        if (ev.getType() === "m.push_rules") {
            this.updateNotificationState();
        }
    };

    private updateNotificationState(): void {
        const snapshot = this.snapshot();

        if (getUnsentMessages(this.room).length > 0) {
            // When there are unsent messages we show a red `!`
            this._color = NotificationColor.Unsent;
            this._symbol = "!";
            this._count = 1; // not used, technically
        } else if (
            RoomNotifs.getRoomNotifsState(this.room.client, this.room.roomId) === RoomNotifs.RoomNotifState.Mute
        ) {
            // When muted we suppress all notification states, even if we have context on them.
            this._color = NotificationColor.None;
            this._symbol = null;
            this._count = 0;
        } else if (this.roomIsInvite) {
            this._color = NotificationColor.Red;
            this._symbol = "!";
            this._count = 1; // not used, technically
        } else {
            const redNotifs = RoomNotifs.getUnreadNotificationCount(this.room, NotificationCountType.Highlight);
            const greyNotifs = RoomNotifs.getUnreadNotificationCount(this.room, NotificationCountType.Total);

            // For a 'true count' we pick the grey notifications first because they include the
            // red notifications. If we don't have a grey count for some reason we use the red
            // count. If that count is broken for some reason, assume zero. This avoids us showing
            // a badge for 'NaN' (which formats as 'NaNB' for NaN Billion).
            const trueCount = greyNotifs ? greyNotifs : redNotifs ? redNotifs : 0;

            // Note: we only set the symbol if we have an actual count. We don't want to show
            // zero on badges.

            if (redNotifs > 0) {
                this._color = NotificationColor.Red;
                this._count = trueCount;
                this._symbol = null; // symbol calculated by component
            } else if (greyNotifs > 0) {
                this._color = NotificationColor.Grey;
                this._count = trueCount;
                this._symbol = null; // symbol calculated by component
            } else {
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
