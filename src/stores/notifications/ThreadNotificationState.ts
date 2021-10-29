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

import { NotificationColor } from "./NotificationColor";
import { NotificationCountType } from "matrix-js-sdk/src/@types/receipt";
import { NotificationState } from "./NotificationState";
import { IDestroyable } from "../../utils/IDestroyable";
import { Thread, ThreadEvent } from "matrix-js-sdk/src/models/thread";

export class ThreadNotificationState extends NotificationState implements IDestroyable {
    public _symbol: string = null;
    public _count = 0;

    constructor(public readonly thread: Thread) {
        super();
        this.thread.room.on(ThreadEvent.Update, this.updateNotificationState);
        this.updateNotificationState();
    }

    public destroy(): void {
        super.destroy();
        this.thread.room.removeListener(ThreadEvent.Update, this.updateNotificationState);
    }

    protected updateNotificationState = (): void => {
        const snapshot = this.snapshot();

        const redNotifs = this.thread.getUnreadNotificationCount(NotificationCountType.Highlight);
        const greyNotifs = this.thread.getUnreadNotificationCount(NotificationCountType.Total);

        if (redNotifs > 0) {
            this._color = NotificationColor.BoldRed;
        } else if (greyNotifs > 0) {
            this._color = NotificationColor.Bold;
        } else {
            this._color = NotificationColor.None;
        }

        // finally, publish an update if needed
        this.emitIfUpdated(snapshot);
    };
}
