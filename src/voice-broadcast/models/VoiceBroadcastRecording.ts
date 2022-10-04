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

import {
    ChunkRecordedPayload,
    createVoiceBroadcastRecorder,
    VoiceBroadcastInfoEventType,
    VoiceBroadcastInfoState,
    VoiceBroadcastRecorder,
    VoiceBroadcastRecorderEvent,
} from "..";
import { uploadFile } from "../../ContentMessages";
import { createVoiceMessageContent } from "../../utils/createVoiceMessageContent";
import { IDestroyable } from "../../utils/IDestroyable";

export enum VoiceBroadcastRecordingEvent {
    StateChanged = "liveness_changed",
}

interface EventMap {
    [VoiceBroadcastRecordingEvent.StateChanged]: (state: VoiceBroadcastInfoState) => void;
}

export class VoiceBroadcastRecording
    extends TypedEventEmitter<VoiceBroadcastRecordingEvent, EventMap>
    implements IDestroyable {
    private _state: VoiceBroadcastInfoState;
    private _recorder: VoiceBroadcastRecorder;

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

    public async start() {
        return this.recorder.start();
    }

    public async stop() {
        this.setState(VoiceBroadcastInfoState.Stopped);
        await this.stopRecorder();
        await this.sendStoppedStateEvent();
    }

    public get state(): VoiceBroadcastInfoState {
        return this._state;
    }

    public destroy() {
        if (this._recorder) {
            this._recorder.off(VoiceBroadcastRecorderEvent.ChunkRecorded, this.onChunkRecorded);
            this._recorder.stop();
        }

        this.removeAllListeners();
    }

    private setState(state: VoiceBroadcastInfoState): void {
        this._state = state;
        this.emit(VoiceBroadcastRecordingEvent.StateChanged, this.state);
    }

    private get recorder(): VoiceBroadcastRecorder {
        if (!this._recorder) {
            this._recorder = createVoiceBroadcastRecorder();
            this._recorder.on(VoiceBroadcastRecorderEvent.ChunkRecorded, this.onChunkRecorded);
        }

        return this._recorder;
    }

    private onChunkRecorded = async (chunk: ChunkRecordedPayload) => {
        const roomId = this.infoEvent.getRoomId();

        const upload = await uploadFile(
            this.client,
            roomId,
            new Blob(
                [chunk.buffer],
                {
                    type: this.recorder.contentType,
                },
            ),
        );

        const content = createVoiceMessageContent(
            upload.url,
            this.recorder.contentType,
            Math.round(chunk.length * 1000),
            chunk.buffer.length,
            upload.file,
        );
        content["m.relates_to"] = {
            rel_type: RelationType.Reference,
            event_id: this.infoEvent.getId(),
        };

        this.client.sendMessage(roomId, content);
    };

    private async sendStoppedStateEvent() {
        // TODO Michael W: add error handling for state event
        await this.client.sendStateEvent(
            this.infoEvent.getRoomId(),
            VoiceBroadcastInfoEventType,
            {
                state: VoiceBroadcastInfoState.Stopped,
                ["m.relates_to"]: {
                    rel_type: RelationType.Reference,
                    event_id: this.infoEvent.getId(),
                },
            },
            this.client.getUserId(),
        );
    }

    private async stopRecorder() {
        if (!this._recorder) {
            return;
        }

        try {
            const lastChunk = await this._recorder.stop();
            if (lastChunk) {
                await this.onChunkRecorded(lastChunk);
            }
        } catch (err) {
            logger.warn("error stopping voice broadcast recorder", err);
        }
    }
}
