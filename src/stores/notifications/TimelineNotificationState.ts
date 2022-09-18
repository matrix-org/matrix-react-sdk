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

import { NotificationColor } from "./NotificationColor";
import { IDestroyable } from "../../utils/IDestroyable";
import { MatrixClientPeg } from "../../MatrixClientPeg";
import { readReceiptChangeIsFor } from "../../utils/read-receipts";
import * as RoomNotifs from '../../RoomNotifs';
import { NotificationState } from "./NotificationState";

export class TimelineNotificationState extends NotificationState implements IDestroyable {
    constructor(public readonly room: Room) {
        super();
        this.room.on(RoomEvent.Receipt, this.handleReadReceipt);
        this.room.on(RoomEvent.Timeline, this.handleRoomEventUpdate);
        this.room.on(RoomEvent.Redaction, this.handleRoomEventUpdate);
        this.room.on(RoomEvent.LocalEchoUpdated, this.handleLocalEchoUpdated);
        MatrixClientPeg.get()?.on(MatrixEventEvent.Decrypted, this.onEventDecrypted);
        MatrixClientPeg.get()?.on(ClientEvent.AccountData, this.handleAccountDataUpdate);
        this.updateNotificationState();
    }

    public destroy(): void {
        super.destroy();
        this.room.removeListener(RoomEvent.Receipt, this.handleReadReceipt);
        this.room.removeListener(RoomEvent.Timeline, this.handleRoomEventUpdate);
        this.room.removeListener(RoomEvent.Redaction, this.handleRoomEventUpdate);
        this.room.removeListener(RoomEvent.LocalEchoUpdated, this.handleLocalEchoUpdated);
        MatrixClientPeg.get()?.removeListener(MatrixEventEvent.Decrypted, this.onEventDecrypted);
        MatrixClientPeg.get()?.removeListener(ClientEvent.AccountData, this.handleAccountDataUpdate);
    }

    protected handleLocalEchoUpdated = (): void => {
        this.updateNotificationState();
    };

    protected handleReadReceipt = (event: MatrixEvent): void => {
        if (!readReceiptChangeIsFor(event, MatrixClientPeg.get())) return; // not our own - ignore
        this.updateNotificationState();
    }; f;

    protected onEventDecrypted = (event: MatrixEvent): void => {
        this.updateNotificationState();
    };

    protected handleRoomEventUpdate = (event: MatrixEvent): void => {
        this.updateNotificationState();
    };

    protected handleAccountDataUpdate = (ev: MatrixEvent): void => {
        if (ev.getType() === "m.push_rules") {
            this.updateNotificationState();
        }
    };

    protected updateNotificationState(): void {
        const redNotifs = RoomNotifs.getUnreadNotificationCount(this.room, NotificationCountType.Highlight);
        const greyNotifs = RoomNotifs.getUnreadNotificationCount(this.room, NotificationCountType.Total);

        // For a 'true count' we pick the grey notifications first because they include the
        // red notifications. If we don't have a grey count for some reason we use the red
        // count. If that count is broken for some reason, assume zero. This avoids us showing
        // a badge for 'NaN' (which formats as 'NaNB' for NaN Billion).
        const trueCount = greyNotifs ? greyNotifs : (redNotifs ? redNotifs : 0);

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
        }
    }
}
