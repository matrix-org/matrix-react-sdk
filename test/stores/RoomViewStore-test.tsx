/*
Copyright 2017 - 2022 The Matrix.org Foundation C.I.C.

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

import { Room } from 'matrix-js-sdk/src/matrix';

import { RoomViewStore } from '../../src/stores/RoomViewStore';
import { Action } from '../../src/dispatcher/actions';
import { getMockClientWithEventEmitter, untilDispatch, untilEmission } from '../test-utils';
import SettingsStore from '../../src/settings/SettingsStore';
import { SlidingSyncManager } from '../../src/SlidingSyncManager';
import { TimelineRenderingType } from '../../src/contexts/RoomContext';
import { MatrixDispatcher } from '../../src/dispatcher/dispatcher';
import { UPDATE_EVENT } from '../../src/stores/AsyncStore';

jest.mock('../../src/utils/DMRoomMap', () => {
    const mock = {
        getUserIdForRoomId: jest.fn(),
        getDMRoomsForUserId: jest.fn(),
    };

    return {
        shared: jest.fn().mockReturnValue(mock),
        sharedInstance: mock,
    };
});

describe('RoomViewStore', function() {
    const userId = '@alice:server';
    const mockClient = getMockClientWithEventEmitter({
        joinRoom: jest.fn(),
        getRoom: jest.fn(),
        getRoomIdForAlias: jest.fn(),
        isGuest: jest.fn(),
    });
    const room = new Room('!room:server', mockClient, userId);
    let dis: MatrixDispatcher;

    beforeEach(function() {
        jest.clearAllMocks();
        mockClient.credentials = { userId: userId };
        mockClient.joinRoom.mockResolvedValue(room);
        mockClient.getRoom.mockReturnValue(room);
        mockClient.isGuest.mockReturnValue(false);

        // Reset the state of the store
        dis = new MatrixDispatcher();
        RoomViewStore.instance.reset();
        RoomViewStore.instance.resetDispatcher(dis);
    });

    it('can be used to view a room by ID and join', async () => {
        dis.dispatch({ action: Action.ViewRoom, room_id: '!randomcharacters:aser.ver' });
        dis.dispatch({ action: Action.JoinRoom });
        await untilDispatch(Action.JoinRoomReady, dis);
        expect(mockClient.joinRoom).toHaveBeenCalledWith('!randomcharacters:aser.ver', { viaServers: [] });
        expect(RoomViewStore.instance.isJoining()).toBe(true);
    });

    it('can be used to view a room by alias and join', async () => {
        const roomId = "!randomcharacters:aser.ver";
        const alias = "#somealias2:aser.ver";

        mockClient.getRoomIdForAlias.mockResolvedValue({ room_id: roomId, servers: [] });
        dis.dispatch({ action: Action.ViewRoom, room_alias: alias });
        await untilDispatch((p) => { // wait for the re-dispatch with the room ID
            return p.action === Action.ViewRoom && p.room_id === roomId;
        }, dis);

        // roomId is set to id of the room alias
        expect(RoomViewStore.instance.getRoomId()).toBe(roomId);

        // join the room
        dis.dispatch({ action: Action.JoinRoom }, true);

        await untilDispatch(Action.JoinRoomReady, dis);

        expect(RoomViewStore.instance.isJoining()).toBeTruthy();
        expect(mockClient.joinRoom).toHaveBeenCalledWith(alias, { viaServers: [] });
    });

    it('remembers the event being replied to when swapping rooms', async () => {
        dis.dispatch({ action: Action.ViewRoom, room_id: '!randomcharacters:aser.ver' });
        await untilDispatch(Action.ActiveRoomChanged, dis);
        const replyToEvent = {
            getRoomId: () => '!randomcharacters:aser.ver',
        };
        dis.dispatch({ action: 'reply_to_event', event: replyToEvent, context: TimelineRenderingType.Room });
        await untilEmission(RoomViewStore.instance, UPDATE_EVENT);
        expect(RoomViewStore.instance.getQuotingEvent()).toEqual(replyToEvent);
        // view the same room, should remember the event.
        // set the highlighed flag to make sure there is a state change so we get an update event
        dis.dispatch({ action: Action.ViewRoom, room_id: '!randomcharacters:aser.ver', highlighted: true });
        await untilEmission(RoomViewStore.instance, UPDATE_EVENT);
        expect(RoomViewStore.instance.getQuotingEvent()).toEqual(replyToEvent);
    });

    describe('Sliding Sync', function() {
        beforeEach(() => {
            jest.spyOn(SettingsStore, 'getValue').mockImplementation((settingName, roomId, value) => {
                return settingName === "feature_sliding_sync"; // this is enabled, everything else is disabled.
            });
            RoomViewStore.instance.reset();
        });

        it("subscribes to the room", async () => {
            const setRoomVisible = jest.spyOn(SlidingSyncManager.instance, "setRoomVisible").mockReturnValue(
                Promise.resolve(""),
            );
            const subscribedRoomId = "!sub1:localhost";
            dis.dispatch({ action: Action.ViewRoom, room_id: subscribedRoomId });
            await untilDispatch(Action.ActiveRoomChanged, dis);
            expect(RoomViewStore.instance.getRoomId()).toBe(subscribedRoomId);
            expect(setRoomVisible).toHaveBeenCalledWith(subscribedRoomId, true);
        });

        // Regression test for an in-the-wild bug where rooms would rapidly switch forever in sliding sync mode
        it("doesn't get stuck in a loop if you view rooms quickly", async () => {
            const setRoomVisible = jest.spyOn(SlidingSyncManager.instance, "setRoomVisible").mockReturnValue(
                Promise.resolve(""),
            );
            const subscribedRoomId = "!sub1:localhost";
            const subscribedRoomId2 = "!sub2:localhost";
            dis.dispatch({ action: Action.ViewRoom, room_id: subscribedRoomId }, true);
            dis.dispatch({ action: Action.ViewRoom, room_id: subscribedRoomId2 }, true);
            await untilDispatch(Action.ActiveRoomChanged, dis);
            // sub(1) then unsub(1) sub(2), unsub(1)
            const wantCalls = [
                [subscribedRoomId, true],
                [subscribedRoomId, false],
                [subscribedRoomId2, true],
                [subscribedRoomId, false],
            ];
            expect(setRoomVisible).toHaveBeenCalledTimes(wantCalls.length);
            wantCalls.forEach((v, i) => {
                try {
                    expect(setRoomVisible.mock.calls[i][0]).toEqual(v[0]);
                    expect(setRoomVisible.mock.calls[i][1]).toEqual(v[1]);
                } catch(err) {
                    throw new Error(`i=${i} got ${setRoomVisible.mock.calls[i]} want ${v}`);
                }
            });
        });
    });
});
