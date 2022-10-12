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

import { logger } from "matrix-js-sdk/src/logger";
import { MatrixClient, MatrixEvent, RelationType } from "matrix-js-sdk/src/matrix";
import { TypedEventEmitter } from "matrix-js-sdk/src/models/typed-event-emitter";

import { VoiceBroadcastInfoEventType, VoiceBroadcastInfoState } from "..";

export enum VoiceBroadcastRecordingEvent {
    StateChanged = "liveness_changed",
}

interface EventMap {
    [VoiceBroadcastRecordingEvent.StateChanged]: (state: VoiceBroadcastInfoState) => void;
}

export class VoiceBroadcastRecording extends TypedEventEmitter<VoiceBroadcastRecordingEvent, EventMap> {
    private _state: VoiceBroadcastInfoState;

    public constructor(
        public readonly infoEvent: MatrixEvent,
        private client: MatrixClient,
    ) {
        super();

        const room = this.client.getRoom(this.infoEvent.getRoomId());
        const relations = room?.getUnfilteredTimelineSet()?.relations?.getChildEventsForEvent(
            this.infoEvent.getId(),
            RelationType.Reference,
            VoiceBroadcastInfoEventType,
        );
        const relatedEvents = relations?.getRelations();
        this._state = !relatedEvents?.find((event: MatrixEvent) => {
            return event.getContent()?.state === VoiceBroadcastInfoState.Stopped;
        }) ? VoiceBroadcastInfoState.Started : VoiceBroadcastInfoState.Stopped;

        // TODO Michael W: add listening for updates
    }

    private setState(state: VoiceBroadcastInfoState): void {
        this._state = state;
        this.emit(VoiceBroadcastRecordingEvent.StateChanged, this.state);
    }

    private onChunkRecorded = async (chunk: ChunkRecordedPayload): Promise<void> => {
        const { url, file } = await this.uploadFile(chunk);
        await this.sendVoiceMessage(chunk, url, file);
    };

    private uploadFile(chunk: ChunkRecordedPayload): ReturnType<typeof uploadFile> {
        return uploadFile(
            this.client,
            this.infoEvent.getRoomId(),
            new Blob(
                [chunk.buffer],
                {
                    type: this.getRecorder().contentType,
                },
            ),
        );
    }

    private async sendVoiceMessage(chunk: ChunkRecordedPayload, url: string, file: IEncryptedFile): Promise<void> {
        const content = createVoiceMessageContent(
            url,
            this.getRecorder().contentType,
            Math.round(chunk.length * 1000),
            chunk.buffer.length,
            file,
        );
        content["m.relates_to"] = {
            rel_type: RelationType.Reference,
            event_id: this.infoEvent.getId(),
        };
        content["io.element.voice_broadcast_chunk"] = {
            sequence: this.sequence++,
        };

        await this.client.sendMessage(this.infoEvent.getRoomId(), content);
    }

    private async sendStoppedStateEvent(): Promise<void> {
        // TODO Michael W: add error handling for state event
        await this.client.sendStateEvent(
            this.infoEvent.getRoomId(),
            VoiceBroadcastInfoEventType,
            {
                device_id: this.client.getDeviceId(),
                state: VoiceBroadcastInfoState.Stopped,
                ["m.relates_to"]: {
                    rel_type: RelationType.Reference,
                    event_id: this.infoEvent.getId(),
                },
            },
            this.client.getUserId(),
        );
    }

    public get state(): VoiceBroadcastInfoState {
        return this._state;
    }
}
