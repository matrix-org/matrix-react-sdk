/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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
import { Room } from "matrix-js-sdk/src/models/room";
import { Thread, ThreadEvent } from "matrix-js-sdk/src/models/thread";
import * as RoomNotifs from '../../RoomNotifs';
import SettingsStore from "../../settings/SettingsStore";
import { NOTIFICATION_STATE_UPDATE } from "./NotificationState";
import { RoomNotificationState } from "./RoomNotificationState";
import { RoomNotificationStateStore } from "./RoomNotificationStateStore";

export class RoomThreadsNotificationState extends RoomNotificationState {
    constructor(room: Room) {
        super(room);

        if (SettingsStore.getValue("feature_thread")) {
            for (const [, thread] of room.threads) {
                this.listenToThreadNotification(thread);
            }
            room.on(ThreadEvent.New, this.listenToThreadNotification);
        }
    }

    private listenToThreadNotification = (thread: Thread): void => {
        const notificationState = RoomNotificationStateStore.instance.getThreadState(thread);
        notificationState.on(NOTIFICATION_STATE_UPDATE, this.updateNotificationState);
    };

    protected updateNotificationState = (): void => {
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
    };
}
