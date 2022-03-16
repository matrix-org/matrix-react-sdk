import { Room, Beacon, BeaconEvent } from "matrix-js-sdk/src/matrix";

import { OwnBeaconStore, OwnBeaconStoreEvent } from "../../src/stores/OwnBeaconStore";
import { makeBeaconInfoEvent } from "../test-utils/beacon";
import { getMockClientWithEventEmitter } from "../test-utils/client";

jest.useFakeTimers();

describe('OwnBeaconStore', () => {
    // 14.03.2022 16:15
    const now = 1647270879403;
    const HOUR_MS = 3600000;

    const aliceId = '@alice:server.org';
    const bobId = '@bob:server.org';
    const mockClient = getMockClientWithEventEmitter({
        getUserId: jest.fn().mockReturnValue(aliceId),
        getVisibleRooms: jest.fn().mockReturnValue([]),
    });
    const room1Id = '$room1:server.org';
    const room2Id = '$room2:server.org';

    // beacon_info events
    // created 'an hour ago'
    // with timeout of 3 hours

    // event creation sets timestamp to Date.now()
    jest.spyOn(global.Date, 'now').mockReturnValue(now - HOUR_MS);
    const alicesRoom1BeaconInfo = makeBeaconInfoEvent(aliceId, room1Id, { isLive: true }, '$alice-room1-1');
    const alicesRoom2BeaconInfo = makeBeaconInfoEvent(aliceId, room2Id, { isLive: true }, '$alice-room2-1');
    const alicesOldRoomIdBeaconInfo = makeBeaconInfoEvent(aliceId, room1Id, { isLive: false }, '$alice-room1-2');
    const bobsRoom1BeaconInfo = makeBeaconInfoEvent(bobId, room1Id, { isLive: true }, '$bob-room1-1');
    const bobsOldRoom1BeaconInfo = makeBeaconInfoEvent(bobId, room1Id, { isLive: false }, '$bob-room1-2');

    // make fresh rooms every time
    // as we update room state
    const makeRoomsWithStateEvents = (stateEvents = []): [Room, Room] => {
        const room1 = new Room(room1Id, mockClient, aliceId);
        const room2 = new Room(room2Id, mockClient, aliceId);

        room1.currentState.setStateEvents(stateEvents);
        room2.currentState.setStateEvents(stateEvents);
        mockClient.getVisibleRooms.mockReturnValue([room1, room2]);

        return [room1, room2];
    };

    const advanceDateAndTime = (ms: number) => {
        // bc liveness check uses Date.now we have to advance this mock
        jest.spyOn(global.Date, 'now').mockReturnValue(now + ms);
        // then advance time for the interval by the same amount
        jest.advanceTimersByTime(ms);
    };

    const makeOwnBeaconStore = async () => {
        const store = new OwnBeaconStore();
        // @ts-ignore
        await store.onReady();
        return store;
    };

    beforeEach(() => {
        mockClient.getVisibleRooms.mockReturnValue([]);
        jest.spyOn(global.Date, 'now').mockReturnValue(now);
    });

    describe('onReady()', () => {
        it('initialises correctly with no beacons', async () => {
            makeRoomsWithStateEvents();
            const store = await makeOwnBeaconStore();
            expect(store.hasLiveBeacons()).toBe(false);
            expect(store.getLiveBeaconIds()).toEqual([]);
        });

        it('does not add other users beacons to beacon state', async () => {
            makeRoomsWithStateEvents([bobsRoom1BeaconInfo, bobsOldRoom1BeaconInfo]);
            const store = await makeOwnBeaconStore();
            expect(store.hasLiveBeacons()).toBe(false);
            expect(store.getLiveBeaconIds()).toEqual([]);
        });

        it('adds own users beacons to state', async () => {
            makeRoomsWithStateEvents([
                alicesRoom1BeaconInfo,
                alicesRoom2BeaconInfo,
                alicesOldRoomIdBeaconInfo,
                bobsRoom1BeaconInfo,
                bobsOldRoom1BeaconInfo,
            ]);
            const store = await makeOwnBeaconStore();
            expect(store.hasLiveBeacons()).toBe(true);
            expect(store.getLiveBeaconIds()).toEqual([
                alicesRoom1BeaconInfo.getId(),
                alicesRoom2BeaconInfo.getId(),
            ]);
        });
    });

    describe('hasLiveBeacons()', () => {
        beforeEach(() => {
            makeRoomsWithStateEvents([
                alicesRoom1BeaconInfo,
                alicesRoom2BeaconInfo,
                alicesOldRoomIdBeaconInfo,
                bobsRoom1BeaconInfo,
                bobsOldRoom1BeaconInfo,
            ]);
        });

        it('returns true when user has live beacons', async () => {
            makeRoomsWithStateEvents([
                alicesRoom1BeaconInfo,
                alicesOldRoomIdBeaconInfo,
                bobsRoom1BeaconInfo,
                bobsOldRoom1BeaconInfo,
            ]);
            const store = await makeOwnBeaconStore();
            expect(store.hasLiveBeacons()).toBe(true);
        });

        it('returns false when user does not have live beacons', async () => {
            makeRoomsWithStateEvents([
                alicesOldRoomIdBeaconInfo,
                bobsOldRoom1BeaconInfo,
            ]);
            const store = await makeOwnBeaconStore();
            expect(store.hasLiveBeacons()).toBe(false);
        });

        it('returns true when user has live beacons for roomId', async () => {
            makeRoomsWithStateEvents([
                alicesRoom1BeaconInfo,
                alicesOldRoomIdBeaconInfo,
                bobsRoom1BeaconInfo,
                bobsOldRoom1BeaconInfo,
            ]);
            const store = await makeOwnBeaconStore();
            expect(store.hasLiveBeacons(room1Id)).toBe(true);
        });

        it('returns false when user does not have live beacons for roomId', async () => {
            makeRoomsWithStateEvents([
                alicesRoom1BeaconInfo,
                alicesOldRoomIdBeaconInfo,
                bobsRoom1BeaconInfo,
                bobsOldRoom1BeaconInfo,
            ]);
            const store = await makeOwnBeaconStore();
            expect(store.hasLiveBeacons(room2Id)).toBe(false);
        });
    });

    describe('getLiveBeaconIds()', () => {
        beforeEach(() => {
            makeRoomsWithStateEvents([
                alicesRoom1BeaconInfo,
                alicesRoom2BeaconInfo,
                alicesOldRoomIdBeaconInfo,
                bobsRoom1BeaconInfo,
                bobsOldRoom1BeaconInfo,
            ]);
        });

        it('returns live beacons when user has live beacons', async () => {
            makeRoomsWithStateEvents([
                alicesRoom1BeaconInfo,
                alicesOldRoomIdBeaconInfo,
                bobsRoom1BeaconInfo,
                bobsOldRoom1BeaconInfo,
            ]);
            const store = await makeOwnBeaconStore();
            expect(store.getLiveBeaconIds()).toEqual([
                alicesRoom1BeaconInfo.getId(),
            ]);
        });

        it('returns empty array when user does not have live beacons', async () => {
            makeRoomsWithStateEvents([
                alicesOldRoomIdBeaconInfo,
                bobsOldRoom1BeaconInfo,
            ]);
            const store = await makeOwnBeaconStore();
            expect(store.getLiveBeaconIds()).toEqual([]);
        });

        it('returns beacon ids for room when user has live beacons for roomId', async () => {
            makeRoomsWithStateEvents([
                alicesRoom1BeaconInfo,
                alicesRoom2BeaconInfo,
                alicesOldRoomIdBeaconInfo,
                bobsRoom1BeaconInfo,
                bobsOldRoom1BeaconInfo,
            ]);
            const store = await makeOwnBeaconStore();
            expect(store.getLiveBeaconIds(room1Id)).toEqual([
                alicesRoom1BeaconInfo.getId(),
            ]);
            expect(store.getLiveBeaconIds(room2Id)).toEqual([
                alicesRoom2BeaconInfo.getId(),
            ]);
        });

        it('returns empty array when user does not have live beacons for roomId', async () => {
            makeRoomsWithStateEvents([
                alicesRoom1BeaconInfo,
                alicesOldRoomIdBeaconInfo,
                bobsRoom1BeaconInfo,
                bobsOldRoom1BeaconInfo,
            ]);
            const store = await makeOwnBeaconStore();
            expect(store.getLiveBeaconIds(room2Id)).toEqual([]);
        });
    });

    describe('on new beacon event', () => {
        it('ignores events for irrelevant beacons', async () => {
            makeRoomsWithStateEvents([]);
            const store = await makeOwnBeaconStore();
            const bobsLiveBeacon = new Beacon(bobsRoom1BeaconInfo);
            const monitorSpy = jest.spyOn(bobsLiveBeacon, 'monitorLiveness');

            mockClient.emit(BeaconEvent.New, bobsLiveBeacon);

            // we dont care about bob
            expect(monitorSpy).not.toHaveBeenCalled();
            expect(store.hasLiveBeacons()).toBe(false);
        });

        it('adds users beacons to state and monitors liveness', async () => {
            makeRoomsWithStateEvents([]);
            const store = await makeOwnBeaconStore();
            const alicesLiveBeacon = new Beacon(alicesRoom1BeaconInfo);
            const monitorSpy = jest.spyOn(alicesLiveBeacon, 'monitorLiveness');

            mockClient.emit(BeaconEvent.New, alicesLiveBeacon);

            expect(monitorSpy).toHaveBeenCalled();
            expect(store.hasLiveBeacons()).toBe(true);
            expect(store.hasLiveBeacons(room1Id)).toBe(true);
        });

        it('emits a liveness change event when new beacons change live state', async () => {
            makeRoomsWithStateEvents([]);
            const store = await makeOwnBeaconStore();
            const emitSpy = jest.spyOn(store, 'emit');
            const alicesLiveBeacon = new Beacon(alicesRoom1BeaconInfo);

            mockClient.emit(BeaconEvent.New, alicesLiveBeacon);

            expect(emitSpy).toHaveBeenCalledWith(OwnBeaconStoreEvent.LivenessChange, true);
        });

        it('does not emit a liveness change event when new beacons do not change live state', async () => {
            makeRoomsWithStateEvents([
                alicesRoom2BeaconInfo,
            ]);
            const store = await makeOwnBeaconStore();
            // already live
            expect(store.hasLiveBeacons()).toBe(true);
            const emitSpy = jest.spyOn(store, 'emit');
            const alicesLiveBeacon = new Beacon(alicesRoom1BeaconInfo);

            mockClient.emit(BeaconEvent.New, alicesLiveBeacon);

            expect(emitSpy).not.toHaveBeenCalled();
        });
    });

    describe('on liveness change event', () => {
        it('ignores events for irrelevant beacons', async () => {
            makeRoomsWithStateEvents([
                alicesRoom1BeaconInfo,
            ]);
            const store = await makeOwnBeaconStore();
            const emitSpy = jest.spyOn(store, 'emit');
            const oldLiveBeaconIds = store.getLiveBeaconIds();
            const bobsLiveBeacon = new Beacon(bobsRoom1BeaconInfo);

            mockClient.emit(BeaconEvent.LivenessChange, true, bobsLiveBeacon);

            expect(emitSpy).not.toHaveBeenCalled();
            // strictly equal
            expect(store.getLiveBeaconIds()).toBe(oldLiveBeaconIds);
        });

        it('updates state and when beacon liveness changes from true to false', async () => {
            makeRoomsWithStateEvents([
                alicesRoom1BeaconInfo,
            ]);
            const store = await makeOwnBeaconStore();
            expect(store.hasLiveBeacons()).toBe(false);
            const emitSpy = jest.spyOn(store, 'emit');
            const alicesBeacon = new Beacon(alicesRoom1BeaconInfo);

            // time travel until beacon is expired
            advanceDateAndTime(HOUR_MS * 3);

            mockClient.emit(BeaconEvent.LivenessChange, false, alicesBeacon);

            expect(store.hasLiveBeacons()).toBe(false);
            expect(store.hasLiveBeacons(room1Id)).toBe(false);
            expect(emitSpy).toHaveBeenCalledWith(OwnBeaconStoreEvent.LivenessChange, false);
        });

        it('updates state and when beacon liveness changes from false to true', async () => {
            makeRoomsWithStateEvents([
                alicesOldRoomIdBeaconInfo,
            ]);
            const store = await makeOwnBeaconStore();
            expect(store.hasLiveBeacons()).toBe(false);
            const emitSpy = jest.spyOn(store, 'emit');
            const alicesBeacon = new Beacon(alicesOldRoomIdBeaconInfo);
            const liveUpdate = makeBeaconInfoEvent(
                aliceId, room1Id, { isLive: true }, alicesOldRoomIdBeaconInfo.getId(),
            );

            // bring the beacon back to life
            alicesBeacon.update(liveUpdate);

            mockClient.emit(BeaconEvent.LivenessChange, true, alicesBeacon);

            expect(store.hasLiveBeacons()).toBe(true);
            expect(store.hasLiveBeacons(room1Id)).toBe(true);
            expect(emitSpy).toHaveBeenCalledWith(OwnBeaconStoreEvent.LivenessChange, true);
        });
    });

    describe('on LivenessChange event', () => {
        it('ignores events for irrelevant beacons', async () => {

        });
    });
});
