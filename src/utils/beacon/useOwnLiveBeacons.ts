import { useEffect, useState } from "react";
import { Beacon, BeaconIdentifier } from "matrix-js-sdk/src/matrix";

import { useEventEmitterState } from "../../hooks/useEventEmitter";
import { OwnBeaconStore, OwnBeaconStoreEvent } from "../../stores/OwnBeaconStore";
import { sortBeaconsByLatestExpiry } from "./duration";

/**
 * It's technically possible to have multiple live beacons in one room
 * Select the latest expiry to display,
 * and kill all beacons on stop sharing
 */
type LiveBeaconsState = {
    beacon?: Beacon;
    onStopSharing?: () => void;
    onResetWireError?: () => void;
    stoppingInProgress?: boolean;
    hasStopSharingError?: boolean;
    hasWireError?: boolean;
};

/**
 * Monitor the current users own beacons
 */
export const useOwnLiveBeacons = (liveBeaconIds: BeaconIdentifier[]): LiveBeaconsState => {
    const [stoppingInProgress, setStoppingInProgress] = useState(false);
    const [error, setError] = useState<Error>();

    const hasWireError = useEventEmitterState(
        OwnBeaconStore.instance,
        OwnBeaconStoreEvent.WireError,
        () =>
            liveBeaconIds.some(OwnBeaconStore.instance.beaconHasWireError),
    );

    // reset stopping in progress on change in live ids
    useEffect(() => {
        setStoppingInProgress(false);
        setError(undefined);
    }, [liveBeaconIds]);

    // select the beacon with latest expiry to display expiry time
    const beacon = liveBeaconIds.map(beaconId => OwnBeaconStore.instance.getBeaconById(beaconId))
        .sort(sortBeaconsByLatestExpiry)
        .shift();

    const onStopSharing = async () => {
        setStoppingInProgress(true);
        try {
            await Promise.all(liveBeaconIds.map(beaconId => OwnBeaconStore.instance.stopBeacon(beaconId)));
        } catch (error) {
            // only clear loading in case of error
            // to avoid flash of not-loading state
            // after beacons have been stopped but we wait for sync
            setError(error);
            setStoppingInProgress(false);
        }
    };

    const onResetWireError = () => {
        liveBeaconIds.map(beaconId => OwnBeaconStore.instance.resetWireError(beaconId));
    };

    return {
        onStopSharing,
        onResetWireError,
        beacon,
        stoppingInProgress,
        hasWireError,
        hasStopSharingError: !!error,
    };
};
