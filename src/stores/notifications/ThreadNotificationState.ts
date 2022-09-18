/*
Copyright 2021 - 2022 The Matrix.org Foundation C.I.C.

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
import { Room } from "matrix-js-sdk/src/models/room";

import { NotificationColor } from "./NotificationColor";
import { TimelineNotificationState } from "./TimelineNotificationState";

export class ThreadNotificationState extends TimelineNotificationState {
    protected _symbol = null;
    protected _count = 0;
    protected _color = NotificationColor.None;

    constructor(public readonly room: Room, public readonly threadId: string) {
        super(room);
    }

    protected handleReadReceipt = (event: MatrixEvent): void => {
        if (event.threadRootId !== this.threadId) return; // not for us - ignore
        super.handleReadReceipt(event);
    };

    protected onEventDecrypted = (event: MatrixEvent): void => {
        if (event.threadRootId !== this.threadId) return; // ignore - not for us or notifications timeline

        super.onEventDecrypted(event);
    };

    protected handleRoomEventUpdate = (event: MatrixEvent): void => {
        if (event.threadRootId !== this.threadId) return; // ignore - not for us or notifications timeline
        super.handleRoomEventUpdate(event);
    };

    protected updateNotificationState(): void {
        const snapshot = this.snapshot();

        super.updateNotificationState();

        // finally, publish an update if needed
        this.emitIfUpdated(snapshot);
    }
}
