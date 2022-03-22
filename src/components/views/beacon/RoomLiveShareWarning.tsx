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

import React, { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { Room, Beacon } from 'matrix-js-sdk/src/matrix';

import { _t } from '../../../languageHandler';
import { useEventEmitterState } from '../../../hooks/useEventEmitter';
import { OwnBeaconStore, OwnBeaconStoreEvent } from '../../../stores/OwnBeaconStore';
import AccessibleButton from '../elements/AccessibleButton';
import StyledLiveBeaconIcon from './StyledLiveBeaconIcon';
import { formatDuration } from '../../../DateUtils';
import { getBeaconMsUntilExpiry, sortBeaconsByLatestExpiry } from '../../../utils/beacon';
import Spinner from '../elements/Spinner';

interface Props {
    roomId: Room['roomId'];
}

const MINUTE_MS = 60000;
const HOUR_MS = MINUTE_MS * 60;

const getUpdateInterval = (ms: number) => {
    // every 10 mins when more than an hour
    if (ms > HOUR_MS) {
        return MINUTE_MS * 10;
    }
    // every minute when more than a minute
    if (ms > MINUTE_MS) {
        return MINUTE_MS;
    }
    // otherwise every second
    return 1000;
};
const useMsRemaining = (beacon?: Beacon): number => {
    const [msRemaining, setMsRemaining] = useState(() => beacon ? getBeaconMsUntilExpiry(beacon) : 0);
    const updateExpiryTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

    useEffect(() => {
        setMsRemaining(beacon ? getBeaconMsUntilExpiry(beacon) : 0);
    }, [beacon]);

    useEffect(() => {
        clearTimeout(updateExpiryTimeoutRef.current);
        if (beacon) {
            updateExpiryTimeoutRef.current = window.setTimeout(() => {
                const ms = getBeaconMsUntilExpiry(beacon);
                setMsRemaining(ms);
            },
            getUpdateInterval(msRemaining),
            );
        }
    }, [msRemaining, setMsRemaining, beacon]);

    return msRemaining;
};

/**
 * It's technically possible to have multiple live beacons in one room
 * Select the latest expiry to display,
 * and kill all beacons on stop sharing
 */
type LiveBeaconsState = {
    liveBeaconIds: string[];
    beacon?: Beacon;
    onStopSharing?: () => void;
    stoppingInProgress?: boolean;
};
const useLiveBeacons = (roomId: Room['roomId']): LiveBeaconsState => {
    const [stoppingInProgress, setStoppingInProgress] = useState(false);

    const liveBeaconIds = useEventEmitterState(
        OwnBeaconStore.instance,
        OwnBeaconStoreEvent.LivenessChange,
        () => OwnBeaconStore.instance.getLiveBeaconIds(roomId),
    );

    // reset stopping in progress on change in live ids
    useEffect(() => {
        setStoppingInProgress(false);
    }, [liveBeaconIds]);

    if (!liveBeaconIds?.length) {
        return { liveBeaconIds };
    }

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
            setStoppingInProgress(false);
        }
    };

    return { liveBeaconIds, onStopSharing, beacon, stoppingInProgress };
};

const RoomLiveShareWarning: React.FC<Props> = ({ roomId }) => {
    const {
        liveBeaconIds,
        onStopSharing,
        beacon,
        stoppingInProgress,
    } = useLiveBeacons(roomId);

    const msRemaining = useMsRemaining(beacon);

    if (!liveBeaconIds?.length) {
        return null;
    }

    const timeRemaining = formatDuration(msRemaining);
    const liveTimeRemaining = _t(`%(timeRemaining)s left`, { timeRemaining });

    return <div
        className={classNames('mx_RoomLiveShareWarning')}
    >
        <StyledLiveBeaconIcon className="mx_RoomLiveShareWarning_icon" />
        <span className="mx_RoomLiveShareWarning_label">
            { _t('You are sharing %(count)s live locations', { count: liveBeaconIds.length }) }
        </span>

        { stoppingInProgress ?
            <span className='mx_RoomLiveShareWarning_spinner'><Spinner h={16} w={16} /></span> :
            <span
                data-test-id='room-live-share-expiry'
                className="mx_RoomLiveShareWarning_expiry"
            >{ liveTimeRemaining }</span>
        }
        <AccessibleButton
            data-test-id='room-live-share-stop-sharing'
            onClick={onStopSharing}
            kind='danger'
            element='button'
            disabled={stoppingInProgress}
        >
            { _t('Stop sharing') }
        </AccessibleButton>
    </div>;
};

export default RoomLiveShareWarning;
