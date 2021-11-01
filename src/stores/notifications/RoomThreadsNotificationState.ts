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

import { NotificationCountType } from "matrix-js-sdk/src/@types/receipt";
import * as RoomNotifs from '../../RoomNotifs';
import { RoomNotificationState } from "./RoomNotificationState";

export class RoomThreadsNotificationState extends RoomNotificationState {
    protected updateNotificationState(): void {
        const snapshot = this.snapshot();

        if (this.isRoomMuted) {
            this.setMutedState();
        } else {
            const redNotifs = RoomNotifs.getThreadsUnreadNotificationCount(this.room, NotificationCountType.Highlight);
            const greyNotifs = RoomNotifs.getThreadsUnreadNotificationCount(this.room, NotificationCountType.Total);
            this.setNotificationState(redNotifs, greyNotifs);
        }

        // finally, publish an update if needed
        this.emitIfUpdated(snapshot);
    }
}
