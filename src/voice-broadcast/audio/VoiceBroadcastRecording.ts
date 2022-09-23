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

import { VoiceRecording } from "../../audio/VoiceRecording";
import SdkConfig from "../../SdkConfig";
import { concat } from "../../utils/arrays";
import { IDestroyable } from "../../utils/IDestroyable";

export enum VoiceBroadcastRecordingEvents {
    ChunkRecorded = "chunk_recorded",
}

interface ChunkRecordedPayload {
    buffer: Uint8Array;
    length: number;
}

/**
 * This class provides the function to seamlessly record fixed length chunks.
 * Subscribe with on(VoiceBroadcastRecordingEvents.ChunkRecorded, (payload: ChunkRecordedPayload) => {})
 * to retrieve chunks while recording.
 */
export class VoiceBroadcastRecording implements IDestroyable {
    private headers = new Uint8Array(0);
    private chunkBuffer = new Uint8Array(0);
    private previousChunkEndTimePosition = 0;
    private pagesFromRecorderCount = 0;

    public constructor(
        private voiceRecording: VoiceRecording,
        public readonly targetChunkLength: number,
    ) {
        this.voiceRecording.onDataAvailable = this.onDataAvailable;
    }

    public async start(): Promise<void> {
        return this.voiceRecording.start();
    }

    public async stop(): Promise<void> {
        await this.voiceRecording.stop();
        this.emitAndResetChunk();
    }

    public on(event: string | symbol, listener: (...args: any[]) => void): this {
        this.voiceRecording.on(event, listener);
        return this;
    }

    public off(event: string | symbol, listener: (...args: any[]) => void): this {
        this.voiceRecording.off(event, listener);
        return this;
    }

    private onDataAvailable = (data: ArrayBuffer) => {
        const dataArray = new Uint8Array(data);
        this.pagesFromRecorderCount++;

        if (this.pagesFromRecorderCount <= 2) {
            // first two pages contain the headers
            this.headers = concat(this.headers, dataArray);
            return;
        }

        this.handleData(dataArray);
    };

    private handleData(data: Uint8Array) {
        this.chunkBuffer = concat(this.chunkBuffer, data);
        this.emitChunkIfTargetLengthReached();
    }

    private emitChunkIfTargetLengthReached() {
        if (this.chunkLength >= this.targetChunkLength) {
            this.emitAndResetChunk();
        }
    }

    private emitAndResetChunk() {
        if (this.chunkBuffer.length === 0) {
            return;
        }

        const currentRecorderTime = this.voiceRecording.recorderSeconds;
        const payload: ChunkRecordedPayload = {
            buffer: concat(this.headers, this.chunkBuffer),
            length: this.chunkLength,
        };
        this.chunkBuffer = new Uint8Array(0);
        this.previousChunkEndTimePosition = currentRecorderTime;
        this.voiceRecording.emit(VoiceBroadcastRecordingEvents.ChunkRecorded, payload);
    }

    private get chunkLength() {
        return this.voiceRecording.recorderSeconds - this.previousChunkEndTimePosition;
    }

    public destroy(): void {
        this.voiceRecording.destroy();
    }
}

export const createVoiceBroadcastRecording = () => {
    // Use target chunk length from config. Default to 5 minutes.
    const targetChunkLength = SdkConfig.get("voice_broadcast")?.chunk_length || 500;
    return new VoiceBroadcastRecording(new VoiceRecording(), targetChunkLength);
};
