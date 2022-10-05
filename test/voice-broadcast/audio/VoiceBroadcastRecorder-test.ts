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

import { mocked } from "jest-mock";

import { VoiceRecording } from "../../../src/audio/VoiceRecording";
import SdkConfig from "../../../src/SdkConfig";
import { concat } from "../../../src/utils/arrays";
import {
    ChunkRecordedPayload,
    createVoiceBroadcastRecorder,
    VoiceBroadcastRecorder,
    VoiceBroadcastRecorderEvent,
} from "../../../src/voice-broadcast";

describe("VoiceBroadcastRecorder", () => {
    describe("createVoiceBroadcastRecorder", () => {
        beforeEach(() => {
            jest.spyOn(SdkConfig, "get").mockImplementation((key: string) => {
                if (key === "voice_broadcast") {
                    return {
                        chunk_length: 1337,
                    };
                }
            });
        });

        afterEach(() => {
            mocked(SdkConfig.get).mockRestore();
        });

        it("should return a VoiceBroadcastRecorder instance with targetChunkLength from config", () => {
            const voiceBroadcastRecorder = createVoiceBroadcastRecorder();
            expect(voiceBroadcastRecorder).toBeInstanceOf(VoiceBroadcastRecorder);
            expect(voiceBroadcastRecorder.targetChunkLength).toBe(1337);
        });
    });

    describe("instance", () => {
        const chunkLength = 30;
        const headers1 = new Uint8Array([1, 2]);
        const headers2 = new Uint8Array([3, 4]);
        const chunk1 = new Uint8Array([5, 6]);
        const chunk2a = new Uint8Array([7, 8]);
        const chunk2b = new Uint8Array([9, 10]);
        const contentType = "test content type";

        let voiceRecording: VoiceRecording;
        let voiceBroadcastRecording: VoiceBroadcastRecorder;

        const itShouldNotEmitAChunkRecordedEvent = () => {
            it("should not emit a ChunkRecorded event", () => {
                expect(voiceRecording.emit).not.toHaveBeenCalledWith(
                    VoiceBroadcastRecorderEvent.ChunkRecorded,
                    expect.anything(),
                );
            });
        };

        beforeEach(() => {
            voiceRecording = {
                contentType,
                start: jest.fn().mockResolvedValue(undefined),
                stop: jest.fn().mockResolvedValue(undefined),
                on: jest.fn(),
                off: jest.fn(),
                emit: jest.fn(),
                destroy: jest.fn(),
                recorderSeconds: 23,
            } as unknown as VoiceRecording;
            voiceBroadcastRecording = new VoiceBroadcastRecorder(voiceRecording, chunkLength);
        });

        it("on should forward the call to VoiceRecording", () => {
            const callback = () => {};
            const result = voiceBroadcastRecording.on("test on", callback);
            expect(voiceRecording.on).toHaveBeenCalledWith("test on", callback);
            expect(result).toBe(voiceBroadcastRecording);
        });

        it("off should forward the call to VoiceRecording", () => {
            const callback = () => {};
            const result = voiceBroadcastRecording.off("test off", callback);
            expect(voiceRecording.off).toHaveBeenCalledWith("test off", callback);
            expect(result).toBe(voiceBroadcastRecording);
        });

        it("start should forward the call to VoiceRecording.start", async () => {
            await voiceBroadcastRecording.start();
            expect(voiceRecording.start).toHaveBeenCalled();
        });

        describe("stop", () => {
            beforeEach(async () => {
                await voiceBroadcastRecording.stop();
            });

            it("should forward the call to VoiceRecording.stop", async () => {
                expect(voiceRecording.stop).toHaveBeenCalled();
            });

            itShouldNotEmitAChunkRecordedEvent();
        });

        it("destroy should forward the call to VoiceRecording.destroy", () => {
            voiceBroadcastRecording.destroy();
            expect(voiceRecording.destroy).toHaveBeenCalled();
        });

        it("contentType should return the value from VoiceRecording", () => {
            expect(voiceBroadcastRecording.contentType).toBe(contentType);
        });

        describe("when the first page from recorder has been received", () => {
            beforeEach(() => {
                voiceRecording.onDataAvailable(headers1);
            });

            itShouldNotEmitAChunkRecordedEvent();
        });

        describe("when a second page from recorder has been received", () => {
            beforeEach(() => {
                voiceRecording.onDataAvailable(headers1);
                voiceRecording.onDataAvailable(headers2);
            });

            itShouldNotEmitAChunkRecordedEvent();
        });

        describe("when a third page from recorder has been received", () => {
            beforeEach(() => {
                voiceRecording.onDataAvailable(headers1);
                voiceRecording.onDataAvailable(headers2);
                voiceRecording.onDataAvailable(chunk1);
            });

            itShouldNotEmitAChunkRecordedEvent();

            describe("stop", () => {
                let stopPayload: ChunkRecordedPayload;

                beforeEach(async () => {
                    stopPayload = await voiceBroadcastRecording.stop();
                });

                it("should return the remaining chunk", () => {
                    expect(stopPayload).toEqual({
                        buffer: concat(headers1, headers2, chunk1),
                        length: 23,
                    });
                });
            });
        });

        describe("when some chunks have been received", () => {
            beforeEach(() => {
                // simulate first chunk
                voiceRecording.onDataAvailable(headers1);
                voiceRecording.onDataAvailable(headers2);
                // set recorder seconds to something greater than the test chunk length of 30
                // @ts-ignore
                voiceRecording.recorderSeconds = 42;
                voiceRecording.onDataAvailable(chunk1);

                // simulate a second chunk
                voiceRecording.onDataAvailable(chunk2a);
                // add another 30 seconds for the next chunk
                // @ts-ignore
                voiceRecording.recorderSeconds = 72;
                voiceRecording.onDataAvailable(chunk2b);
            });

            it("should emit ChunkRecorded events", () => {
                expect(voiceRecording.emit).toHaveBeenNthCalledWith(
                    1,
                    VoiceBroadcastRecorderEvent.ChunkRecorded,
                    {
                        buffer: concat(headers1, headers2, chunk1),
                        length: 42,
                    },
                );

                expect(voiceRecording.emit).toHaveBeenNthCalledWith(
                    2,
                    VoiceBroadcastRecorderEvent.ChunkRecorded,
                    {
                        buffer: concat(headers1, headers2, chunk2a, chunk2b),
                        length: 72 - 42, // 72 (position at second chunk) - 42 (position of first chunk)
                    },
                );
            });
        });
    });
});
