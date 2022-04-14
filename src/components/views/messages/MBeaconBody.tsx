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

import React, { useEffect, useState } from 'react';
import { Beacon, BeaconEvent, MatrixEvent } from 'matrix-js-sdk/src/matrix';
import { BeaconLocationState } from 'matrix-js-sdk/src/content-helpers';
import { randomString } from 'matrix-js-sdk/src/randomstring';

import { Icon as LocationMarkerIcon } from '../../../../res/img/element-icons/location.svg';
import { useEventEmitterState } from '../../../hooks/useEventEmitter';
import { useBeacon } from '../../../utils/beacon';
import { isSelfLocation } from '../../../utils/location';
import { BeaconDisplayStatus, getBeaconDisplayStatus } from '../beacon/displayStatus';
import Spinner from '../elements/Spinner';
import Map from '../location/Map';
import SmartMarker from '../location/SmartMarker';
import BeaconStatus from '../beacon/BeaconStatus';
import { IBodyProps } from "./IBodyProps";
import { _t } from '../../../languageHandler';

const useBeaconState = (beaconInfoEvent: MatrixEvent): {
    beacon?: Beacon;
    description?: string;
    latestLocationState?: BeaconLocationState;
    isLive?: boolean;
} => {
    const beacon = useBeacon(beaconInfoEvent);

    const isLive = useEventEmitterState(
        beacon,
        BeaconEvent.LivenessChange,
        () => beacon?.isLive);

    const latestLocationState = useEventEmitterState(
        beacon,
        BeaconEvent.LocationUpdate,
        () => beacon?.latestLocationState);

    if (!beacon) {
        return {};
    }

    const { description } = beacon.beaconInfo;

    return {
        beacon,
        description,
        isLive,
        latestLocationState,
    };
};

// multiple instances of same map might be in document
// eg thread and main timeline, reply
// maplibregl needs a unique id to attach the map instance to
const useUniqueId = (eventId: string): string => {
    const [id, setId] = useState(`${eventId}_${randomString(8)}`);

    useEffect(() => {
        setId(`${eventId}_${randomString(8)}`);
    }, [eventId]);

    return id;
};

const MBeaconBody: React.FC<IBodyProps> = React.forwardRef(({ mxEvent }, ref) => {
    const {
        beacon,
        isLive,
        latestLocationState,
    } = useBeaconState(mxEvent);
    const mapId = useUniqueId(mxEvent.getId());

    const [error, setError] = useState<Error>();

    const displayStatus = getBeaconDisplayStatus(isLive, latestLocationState, error);

    const markerRoomMember = isSelfLocation(mxEvent.getContent()) ? mxEvent.sender : undefined;

    return (
        <div className='mx_MBeaconBody' ref={ref}>
            { displayStatus === BeaconDisplayStatus.Active ?
                <Map
                    id={mapId}
                    centerGeoUri={latestLocationState.uri}
                    onError={setError}
                    className="mx_MBeaconBody_map"
                >
                    {
                        ({ map }) =>
                            <SmartMarker
                                map={map}
                                id={`${mapId}-marker`}
                                geoUri={latestLocationState.uri}
                                roomMember={markerRoomMember}
                            />
                    }
                </Map>
                : <div className='mx_MBeaconBody_map mx_MBeaconBody_mapFallback'>
                    { displayStatus === BeaconDisplayStatus.Loading ?
                        <Spinner h={32} w={32} /> :
                        <LocationMarkerIcon className='mx_MBeaconBody_mapFallbackIcon' />
                    }
                </div>
            }
            <BeaconStatus
                className='mx_MBeaconBody_chin'
                beacon={beacon}
                displayStatus={displayStatus}
                label={_t('View live location')}
            />
        </div>
    );
});

export default MBeaconBody;

