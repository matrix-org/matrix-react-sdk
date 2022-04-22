import { EventType, MatrixEvent } from "matrix-js-sdk/src/matrix";

import { shouldDisplayAsBeaconTile } from "../../../src/utils/beacon/timeline";
import { makeBeaconInfoEvent } from "../../test-utils";

describe('shouldDisplayAsBeaconTile', () => {
    const userId = '@user:server';
    const roomId = '!room:server';
    const liveBeacon = makeBeaconInfoEvent(userId, roomId, { isLive: true });
    const notLiveBeacon = makeBeaconInfoEvent(userId, roomId, { isLive: false });
    const memberEvent = new MatrixEvent({ type: EventType.RoomMember });

    it('returns true for a beacon with live property set to true', () => {
        expect(shouldDisplayAsBeaconTile(liveBeacon)).toBe(true);
    });

    it('returns false for a beacon with live property set to false', () => {
        expect(shouldDisplayAsBeaconTile(notLiveBeacon)).toBe(false);
    });

    it('returns false for a non beacon event', () => {
        expect(shouldDisplayAsBeaconTile(memberEvent)).toBe(false);
    });
});
