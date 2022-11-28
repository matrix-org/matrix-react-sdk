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

import { MatrixEvent, MatrixEventEvent } from "matrix-js-sdk/src/models/event";
import { THREAD_RELATION_TYPE } from "matrix-js-sdk/src/models/thread";
import { Room, RoomEvent } from "matrix-js-sdk/src/models/room";
import { IRoomTimelineData } from "matrix-js-sdk/src/models/event-timeline-set";
import { Dispatcher } from "flux";

import { AsyncStoreWithClient } from "../../stores/AsyncStoreWithClient";
import { CHAT_EFFECTS } from "../index";
import { containsEmoji } from "../utils";
import SettingsStore from "../../settings/SettingsStore";
import dis from "../../dispatcher/dispatcher";
import { ActionPayload } from "../../dispatcher/payloads";
import { SdkContextClass } from "../../contexts/SDKContext";

export class ChatEffectsStore extends AsyncStoreWithClient<{}> {
    public constructor(dispatcher: Dispatcher<ActionPayload>, private readonly stores: SdkContextClass) {
        super(dispatcher, {});
    }

    protected async onReady(): Promise<void> {
        await super.onReady();
        this.matrixClient.on(RoomEvent.Timeline, this.onRoomTimeline);
        this.matrixClient.on(MatrixEventEvent.Decrypted, this.onEventDecrypted);
    }

    protected async onNotReady(): Promise<void> {
        await super.onNotReady();
        this.matrixClient.off(RoomEvent.Timeline, this.onRoomTimeline);
        this.matrixClient.off(MatrixEventEvent.Decrypted, this.onEventDecrypted);
    }

    protected async onAction(payload: ActionPayload): Promise<void> {
        // Nothing yet
    }

    private get room(): Room | undefined {
        return this.matrixClient.getRoom(this.stores.roomViewStore.getRoomId());
    }

    private onRoomTimeline = (
        ev: MatrixEvent,
        room: Room | null,
        toStartOfTimeline: boolean,
        removed: boolean,
        data: IRoomTimelineData,
    ): void => {
        // ignore events for other rooms or the notification timeline set
        if (!room || room.roomId !== this.room?.roomId) return;

        // ignore events from filtered timelines
        if (data.timeline.getTimelineSet() !== room.getUnfilteredTimelineSet()) return;

        // ignore anything but real-time updates at the end of the room:
        // updates from pagination will happen when the paginate completes.
        if (toStartOfTimeline || !data?.liveEvent) return;

        // No point handling anything while we're waiting for the join to finish: we'll only be showing a spinner.
        if (this.stores.roomViewStore.isJoining()) return;

        if (!ev.isBeingDecrypted() && !ev.isDecryptionFailure()) {
            this.handleEffects(ev);
        }
    };

    private onEventDecrypted = (ev: MatrixEvent): void => {
        const room = this.room;
        if (!room || !this.matrixClient.isInitialSyncComplete()) return; // not ready at all
        if (ev.getRoomId() !== room.roomId) return; // not for us
        if (ev.isDecryptionFailure()) return;
        this.handleEffects(ev);
    };

    private handleEffects = (ev: MatrixEvent): void => {
        const notifState = this.stores.roomNotificationStateStore.getRoomState(this.room);
        if (!notifState.isUnread) return;

        CHAT_EFFECTS.forEach(effect => {
            if (containsEmoji(ev.getContent(), effect.emojis) || ev.getContent().msgtype === effect.msgType) {
                // For initial threads launch, chat effects are disabled see #19731
                if (!SettingsStore.getValue("feature_thread") || !ev.isRelation(THREAD_RELATION_TYPE.name)) {
                    dis.dispatch({ action: `effects.${effect.command}` });
                }
            }
        });
    };
}
