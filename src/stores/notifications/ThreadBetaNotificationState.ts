/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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
import { Thread, ThreadEvent } from "matrix-js-sdk/src/models/thread";

import { NotificationColor } from "./NotificationColor";
import { MatrixClientPeg } from "../../MatrixClientPeg";
import { ThreadNotificationState } from "./ThreadNotificationState";

export class ThreadBetaNotificationState extends ThreadNotificationState {
    protected _symbol = null;
    protected _count = 0;
    protected _color = NotificationColor.None;

    constructor(public readonly thread: Thread) {
        super(thread);
        this.thread.on(ThreadEvent.NewReply, this.handleNewThreadReply);
        this.thread.on(ThreadEvent.ViewThread, this.resetThreadNotification);
        if (this.thread.replyToEvent) {
            // Process the current tip event
            this.handleNewThreadReply(this.thread, this.thread.replyToEvent);
        }
    }

    public destroy(): void {
        super.destroy();
        this.thread.off(ThreadEvent.NewReply, this.handleNewThreadReply);
        this.thread.off(ThreadEvent.ViewThread, this.resetThreadNotification);
    }

    protected handleNewThreadReply = (thread: Thread, event: MatrixEvent) => {
        const client = MatrixClientPeg.get();

        const myUserId = client.getUserId();

        const isOwn = myUserId === event.getSender();
        const readReceipt = this.thread.room.getReadReceiptForUserId(myUserId);

        if (!isOwn && !readReceipt || (readReceipt && event.getTs() >= readReceipt.data.ts)) {
            const actions = client.getPushActionsForEvent(event, true);

            if (actions?.tweaks) {
                const color = !!actions.tweaks.highlight
                    ? NotificationColor.Red
                    : NotificationColor.Grey;

                this.updateNotificationState(color);
            }
        }
    };

    protected resetThreadNotification = (): void => {
        this.updateNotificationState(NotificationColor.None);
    };

    protected updateNotificationState(color: NotificationColor) {
        const snapshot = this.snapshot();

        this._color = color;

        // finally, publish an update if needed
        this.emitIfUpdated(snapshot);
    }
}
