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
import { EventType, MatrixClient, MatrixEvent, MsgType, RelationType } from "matrix-js-sdk/src/matrix";
import { Relations } from "matrix-js-sdk/src/models/relations";

import { Playback, PlaybackState } from "../../../src/audio/Playback";
import { PlaybackManager } from "../../../src/audio/PlaybackManager";
import { getReferenceRelationsForEvent } from "../../../src/events";
import { MediaEventHelper } from "../../../src/utils/MediaEventHelper";
import {
    VoiceBroadcastChunkEventType,
    VoiceBroadcastInfoEventType,
    VoiceBroadcastPlayback,
    VoiceBroadcastPlaybackEvent,
    VoiceBroadcastPlaybackState,
} from "../../../src/voice-broadcast";
import { mkEvent, stubClient } from "../../test-utils";
import { createTestPlayback } from "../../test-utils/audio";

jest.mock("../../../src/events/getReferenceRelationsForEvent", () => ({
    getReferenceRelationsForEvent: jest.fn(),
}));

jest.mock("../../../src/utils/MediaEventHelper", () => ({
    MediaEventHelper: jest.fn(),
}));

describe("VoiceBroadcastPlayback", () => {
    const userId = "@user:example.com";
    const roomId = "!room:example.com";
    let client: MatrixClient;
    let infoEvent: MatrixEvent;
    let playback: VoiceBroadcastPlayback;
    let onStateChanged: (state: VoiceBroadcastPlaybackState) => void;
    let chunk1Event: MatrixEvent;
    let chunk2Event: MatrixEvent;
    const chunk1Data = new ArrayBuffer(1);
    const chunk2Data = new ArrayBuffer(2);
    let chunk1Helper: MediaEventHelper;
    let chunk2Helper: MediaEventHelper;
    let chunk1Playback: Playback;
    let chunk2Playback: Playback;

    const itShouldSetTheStateTo = (state: VoiceBroadcastPlaybackState) => {
        it(`should set the state to ${state}`, () => {
            expect(playback.getState()).toBe(state);
        });
    };

    const itShouldEmitAStateChangedEvent = (state: VoiceBroadcastPlaybackState) => {
        it(`should emit a ${state} state changed event`, () => {
            expect(mocked(onStateChanged)).toHaveBeenCalledWith(state);
        });
    };

    beforeAll(() => {
        client = stubClient();
        infoEvent = mkEvent({
            event: true,
            type: VoiceBroadcastInfoEventType,
            user: userId,
            room: roomId,
            content: {},
        });

        chunk1Event = mkEvent({
            event: true,
            user: client.getUserId(),
            room: roomId,
            type: EventType.RoomMessage,
            content: {
                msgtype: MsgType.Audio,
                [VoiceBroadcastChunkEventType]: {
                    sequence: 1,
                },
            },
        });

        chunk2Event = mkEvent({
            event: true,
            user: client.getUserId(),
            room: roomId,
            type: EventType.RoomMessage,
            content: {
                msgtype: MsgType.Audio,
                [VoiceBroadcastChunkEventType]: {
                    sequence: 2,
                },
            },
        });

        chunk1Helper = {
            sourceBlob: {
                cachedValue: null,
                done: false,
                value: {
                    // @ts-ignore
                    arrayBuffer: jest.fn().mockResolvedValue(chunk1Data),
                },
            },
        };
        chunk2Helper = {
            sourceBlob: {
                cachedValue: null,
                done: false,
                value: {
                    // @ts-ignore
                    arrayBuffer: jest.fn().mockResolvedValue(chunk2Data),
                },
            },
        };

        chunk1Playback = createTestPlayback();
        chunk2Playback = createTestPlayback();

        jest.spyOn(PlaybackManager.instance, "createPlaybackInstance").mockImplementation(
            (buffer: ArrayBuffer, _waveForm?: number[]) => {
                if (buffer === chunk1Data) return chunk1Playback;
                if (buffer === chunk2Data) return chunk2Playback;
            },
        );

        mocked(MediaEventHelper).mockImplementation((event: MatrixEvent) => {
            if (event === chunk1Event) return chunk1Helper;
            if (event === chunk2Event) return chunk2Helper;
        });
    });

    beforeEach(() => {
        onStateChanged = jest.fn();

        playback = new VoiceBroadcastPlayback(infoEvent, client);
        jest.spyOn(playback, "removeAllListeners");
        playback.on(VoiceBroadcastPlaybackEvent.StateChanged, onStateChanged);

        const relations = new Relations(RelationType.Reference, EventType.RoomMessage, client);
        jest.spyOn(relations, "getRelations").mockReturnValue([chunk2Event, chunk1Event]);
        mocked(getReferenceRelationsForEvent).mockReturnValue(relations);
    });

    it("should expose the info event", () => {
        expect(playback.infoEvent).toBe(infoEvent);
    });

    it("should be in state Stopped", () => {
        expect(playback.getState()).toBe(VoiceBroadcastPlaybackState.Stopped);
    });

    describe("when calling start", () => {
        beforeEach(async () => {
            await playback.start();
        });

        itShouldSetTheStateTo(VoiceBroadcastPlaybackState.Playing);

        it("should play the chunks", () => {
            // assert that the first chunk is being played
            expect(chunk1Playback.play).toHaveBeenCalled();
            expect(chunk2Playback.play).not.toHaveBeenCalled();

            // simulate end of first chunk
            chunk1Playback.emit(PlaybackState.Stopped);

            // assert that the second chunk is being played
            expect(chunk2Playback.play).toHaveBeenCalled();

            // simulate end of second chunk
            chunk2Playback.emit(PlaybackState.Stopped);

            // assert that the entire playback is now in stopped state
            expect(playback.getState()).toBe(VoiceBroadcastPlaybackState.Stopped);
        });

        describe("and calling toggle", () => {
            beforeEach(async () => {
                await playback.toggle();
            });

            itShouldSetTheStateTo(VoiceBroadcastPlaybackState.Stopped);
            itShouldEmitAStateChangedEvent(VoiceBroadcastPlaybackState.Stopped);
        });
    });

    describe("when calling stop", () => {
        beforeEach(() => {
            playback.stop();
        });

        itShouldSetTheStateTo(VoiceBroadcastPlaybackState.Stopped);

        describe("and calling toggle", () => {
            beforeEach(async () => {
                mocked(onStateChanged).mockReset();
                await playback.toggle();
            });

            itShouldSetTheStateTo(VoiceBroadcastPlaybackState.Playing);
            itShouldEmitAStateChangedEvent(VoiceBroadcastPlaybackState.Playing);
        });
    });

    describe("when calling destroy", () => {
        beforeEach(() => {
            playback.destroy();
        });

        it("should call removeAllListeners", () => {
            expect(playback.removeAllListeners).toHaveBeenCalled();
        });
    });
});
