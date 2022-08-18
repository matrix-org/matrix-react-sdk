/*
Copyright 2022 grimhilt <grimhilt@users.noreply.github.com>

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

import { mocked } from 'jest-mock';
import { logger } from 'matrix-js-sdk/src/logger';
import { EventTimeline, MatrixEvent, Room } from 'matrix-js-sdk/src/matrix';

import { createAudioContext, decodeOgg } from '../../src/audio/compat';
import { PlaybackState } from "../../src/audio/Playback";
import { PlaybackManager } from '../../src/audio/PlaybackManager';
import { PlaybackQueue } from '../../src/audio/PlaybackQueue';
import { MatrixClientPeg } from '../../src/MatrixClientPeg';
import { mkEvent, stubClient } from '../test-utils';
import { UPDATE_EVENT } from '../../src/stores/AsyncStore';

jest.mock('../../src/audio/compat', () => ({
    createAudioContext: jest.fn(),
    decodeOgg: jest.fn(),
}));

describe('PlaybackQueue', () => {
    stubClient();
    const cli = MatrixClientPeg.get();
    const buffer = new ArrayBuffer(8);
    const waveform = null;

    const updateCli = (events: MatrixEvent[], roomId: string): void => {
        cli.getRoom = () => ({
            roomId: roomId,
            getLiveTimeline: () => ({
                getEvents: () => events,
            } as unknown as EventTimeline),
        } as unknown as Room);
    };

    const mockAudioBufferSourceNode = {
        addEventListener: jest.fn(),
        connect: jest.fn(),
        start: jest.fn(),
    };
    const mockAudioContext = {
        decodeAudioData: jest.fn(),
        suspend: jest.fn(),
        resume: jest.fn(),
        createBufferSource: jest.fn().mockReturnValue(mockAudioBufferSourceNode),
    };

    const mockAudioBuffer = {
        duration: 99,
        getChannelData: jest.fn(),
    };

    const mockChannelData = new Float32Array();

    beforeEach(() => {
        jest.spyOn(logger, 'error').mockRestore();
        mockAudioBuffer.getChannelData.mockClear().mockReturnValue(mockChannelData);
        mockAudioContext.decodeAudioData.mockReset().mockImplementation(
            (_b, callback) => callback(mockAudioBuffer),
        );
        mockAudioContext.resume.mockClear().mockResolvedValue(undefined);
        mockAudioContext.suspend.mockClear().mockResolvedValue(undefined);
        mocked(decodeOgg).mockClear().mockResolvedValue(new ArrayBuffer(1));
        mocked(createAudioContext).mockReturnValue(mockAudioContext as unknown as AudioContext);
    });

    it('two consecutive voice messages are played', async () => {
        const roomIdTest = '!room0:server';
        const ev0 = mkEvent({
            event: true,
            type: "m.room.message",
            user: "@user1:server",
            room: roomIdTest,
            content: {
                "org.matrix.msc2516.voice": {},
            },
        });

        const ev1 = mkEvent({
            event: true,
            type: "m.room.message",
            user: "@user1:server",
            room: roomIdTest,
            content: {
                "org.matrix.msc2516.voice": {},
            },
        });

        updateCli([ev0, ev1], roomIdTest);

        const playback0 = PlaybackManager.instance.createPlaybackInstance(buffer, waveform);
        const playback1 = PlaybackManager.instance.createPlaybackInstance(buffer, waveform);
        const PlaybackQueueInstance = PlaybackQueue.forRoom(ev0.getRoomId());
        PlaybackQueueInstance.unsortedEnqueue(ev0, playback0);
        await playback0.prepare();
        PlaybackQueueInstance.unsortedEnqueue(ev1, playback1);
        await playback1.prepare();

        await playback0.toggle();
        await playback0.stop();

        let needToBeTested = true;
        playback1.on(UPDATE_EVENT, (state) => {
            if (needToBeTested) {
                expect(state).toBe(PlaybackState.Playing);
                needToBeTested = false;
            }
        });
    });

    it('a non-voice message stop the queue', async () => {
        const roomIdTest = '!room1:server';
        const ev0 = mkEvent({
            event: true,
            type: "m.room.message",
            user: "@user1:server",
            room: roomIdTest,
            content: {
                "org.matrix.msc2516.voice": {},
            },
        });

        const ev1 = mkEvent({
            event: true,
            type: "m.room.message",
            user: "@user1:server",
            room: roomIdTest,
            content: {},
        });

        const ev2 = mkEvent({
            event: true,
            type: "m.room.message",
            user: "@user1:server",
            room: roomIdTest,
            content: {
                "org.matrix.msc2516.voice": {},
            },
        });

        updateCli([ev0, ev1, ev2], roomIdTest);

        const playback0 = PlaybackManager.instance.createPlaybackInstance(buffer, waveform);
        const playback1 = PlaybackManager.instance.createPlaybackInstance(buffer, waveform);
        const PlaybackQueueInstance = PlaybackQueue.forRoom(ev0.getRoomId());
        PlaybackQueueInstance.unsortedEnqueue(ev0, playback0);
        await playback0.prepare();
        PlaybackQueueInstance.unsortedEnqueue(ev2, playback1);
        await playback1.prepare();

        await playback0.toggle();
        await playback0.stop();

        playback1.on(UPDATE_EVENT, (state) => {
            expect(state).toBe(PlaybackState.Stopped);
        });
    });

    it('paused voice messages are not auto played after the queue', async () => {
        const roomIdTest = '!room2:server';
        const ev0 = mkEvent({
            event: true,
            type: "m.room.message",
            user: "@user1:server",
            room: roomIdTest,
            content: {
                "org.matrix.msc2516.voice": {},
            },
        });

        const ev1 = mkEvent({
            event: true,
            type: "m.room.message",
            user: "@user1:server",
            room: roomIdTest,
            content: {
                "org.matrix.msc2516.voice": {},
            },
        });

        updateCli([ev0, ev1], roomIdTest);

        const playback0 = PlaybackManager.instance.createPlaybackInstance(buffer, waveform);
        const playback1 = PlaybackManager.instance.createPlaybackInstance(buffer, waveform);
        const PlaybackQueueInstance = PlaybackQueue.forRoom(ev0.getRoomId());
        PlaybackQueueInstance.unsortedEnqueue(ev0, playback0);
        await playback0.prepare();
        PlaybackQueueInstance.unsortedEnqueue(ev1, playback1);
        await playback1.prepare();

        await playback0.toggle();
        await playback0.pause();

        await playback1.toggle();
        await playback1.stop();

        playback0.on(UPDATE_EVENT, (state) => {
            expect(state).toBe(PlaybackState.Paused);
        });
    });

    it('own voice message stop the queue', async () => {
        const roomIdTest = '!room3:server';
        const ev0 = mkEvent({
            event: true,
            type: "m.room.message",
            user: "@user1:server",
            room: roomIdTest,
            content: {
                "org.matrix.msc2516.voice": {},
            },
        });

        const ev1 = mkEvent({
            event: true,
            type: "m.room.message",
            user: cli.getUserId(),
            room: roomIdTest,
            content: {
                "org.matrix.msc2516.voice": {},
            },
        });

        updateCli([ev0, ev1], roomIdTest);

        const playback0 = PlaybackManager.instance.createPlaybackInstance(buffer, waveform);
        const playback1 = PlaybackManager.instance.createPlaybackInstance(buffer, waveform);
        const PlaybackQueueInstance = PlaybackQueue.forRoom(ev0.getRoomId());
        PlaybackQueueInstance.unsortedEnqueue(ev0, playback0);
        await playback0.prepare();
        PlaybackQueueInstance.unsortedEnqueue(ev1, playback1);
        await playback1.prepare();

        await playback0.toggle();
        await playback0.stop();

        playback1.on(UPDATE_EVENT, (state) => {
            expect(state).toBe(PlaybackState.Stopped);
        });
    });
});
