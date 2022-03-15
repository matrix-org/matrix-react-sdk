import { Room } from "matrix-js-sdk/src/matrix";
// import { makeBeaconInfoEvent } from "matrix-js-sdk/spec/test-utils/beacon";

import { OwnBeaconStore } from "../../src/stores/OwnBeaconStore";
import { getMockClientWithEventEmitter } from "../test-utils/client";

describe('OwnBeaconStore', () => {
    const aliceId = '@alice:server.org';
    const mockClient = getMockClientWithEventEmitter({
        getUserId: jest.fn().mockReturnValue(aliceId),
        getVisibleRooms: jest.fn().mockReturnValue([]),
    });
    const room1 = new Room('$room1:server.org', mockClient, aliceId);
    const room2 = new Room('$room2:server.org', mockClient, aliceId);

    // const alicesRoom1BeaconInfo = makeBeaconInfoEvent(aliceId, room1.roomId, { isLive: true }, '$alice-room1-1');

    beforeEach(() => {
        mockClient.getVisibleRooms.mockReturnValue([room1, room2]);
    });

    it('initialises correctly with no beacons', () => {
        const store = new OwnBeaconStore();
        expect(store.hasLiveBeacons()).toBe(false);
        expect(store.hasLiveBeacons(room1.roomId)).toBe(false);
    });
});
