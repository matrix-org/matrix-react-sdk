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

import classNames from 'classnames';
import React from 'react';
import { Room } from 'matrix-js-sdk/src/matrix';

import { useEventEmitterState } from '../../../hooks/useEventEmitter';
import { _t } from '../../../languageHandler';
import { OwnBeaconStore, OwnBeaconStoreEvent } from '../../../stores/OwnBeaconStore';
import { Icon as LiveLocationIcon } from '../../../../res/img/location/live-location.svg';
import AccessibleButton from '../elements/AccessibleButton';

interface Props {
    roomId: Room['roomId'];
}

const RoomLiveShareWarning: React.FC<Props> = ({ roomId }) => {
    const liveBeaconIds = useEventEmitterState(
        OwnBeaconStore.instance,
        OwnBeaconStoreEvent.LivenessChange,
        () => OwnBeaconStore.instance.getLiveBeaconIds(roomId),
    );

    if (!liveBeaconIds?.length) {
        return null;
    }

    if (liveBeaconIds.length > 1) {
        throw new Error('not handled yet');
    }

    const beaconId = liveBeaconIds[0];

    const beacon = OwnBeaconStore.instance.getBeaconById(liveBeaconIds[0]);
    const liveTimeRemaining = `${beacon.beaconInfo.timeout}`;

    const onStopSharing = () => {
        OwnBeaconStore.instance.stopBeacon(beaconId);
    };

    return <div
        className={classNames('mx_RoomLiveShareWarning')}
    >
        <LiveLocationIcon />
        <span className="mx_RoomLiveShareWarning_label">

            { _t('You are sharing your live location') }
        </span>
        <span
            data-test-id='room-live-share-expiry'
            className="mx_RoomLiveShareWarning_expiry"
        >{ liveTimeRemaining }</span>
        <AccessibleButton
            data-test-id='room-live-share-stop-sharing'
            onClick={ onStopSharing }
            kind='danger'
            element='button'
        >
            { _t('Stop sharing') }
        </AccessibleButton>
    </div>;
};

export default RoomLiveShareWarning;
