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

import React from 'react';
import { MatrixClient } from 'matrix-js-sdk/src/client';
import {
    Beacon,
    Room,
} from 'matrix-js-sdk/src/matrix';
import maplibregl from 'maplibre-gl';

import { useLiveBeacons } from '../../../utils/beacon/useLiveBeacons';
import MatrixClientContext from '../../../contexts/MatrixClientContext';
import BaseDialog from "../dialogs/BaseDialog";
import { IDialogProps } from "../dialogs/IDialogProps";
import Map from '../location/Map';
import ZoomButtons from '../location/ZoomButtons';
import BeaconMarker from './BeaconMarker';
import { Bounds, getBeaconBounds } from '../../../utils/beacon/bounds';
import { getGeoUri } from '../../../utils/beacon';

interface IProps extends IDialogProps {
    roomId: Room['roomId'];
    matrixClient: MatrixClient;
    // open the map centered on this beacon's location
    focusBeacon?: Beacon;
}

const getBoundsCenter = (bounds: Bounds): string => {
    if (!bounds) {
        return;
    }
    return getGeoUri({
        latitude: (bounds.north + bounds.south) / 2,
        longitude: (bounds.east + bounds.west) / 2,
        timestamp: Date.now(),
    })
};

/**
 * Dialog to view live beacons maximised
 */
const BeaconViewDialog: React.FC<IProps> = ({
    focusBeacon,
    roomId,
    matrixClient,
    onFinished,
}) => {
    const liveBeacons = useLiveBeacons(roomId, matrixClient);

    const bounds = getBeaconBounds(liveBeacons);
    const centerGeoUri = focusBeacon?.latestLocationState?.uri || getBoundsCenter(bounds);
    
    return (
        <BaseDialog
            className='mx_BeaconViewDialog'
            onFinished={onFinished}
            fixedWidth={false}
        >
            <MatrixClientContext.Provider value={matrixClient}>
                { !!bounds ? <Map
                    id='mx_BeaconViewDialog'
                    bounds={bounds}
                    centerGeoUri={centerGeoUri}
                    interactive
                    className="mx_BeaconViewDialog_map"
                >
                    {
                        ({ map }: { map: maplibregl.Map}) =>
                            <>
                                { liveBeacons.map(beacon => <BeaconMarker
                                    key={beacon.identifier}
                                    map={map}
                                    beacon={beacon}
                                />) }
                                <ZoomButtons map={map} />
                            </>
                    }
                </Map> :
                // TODO fallback map image
                <span>no bounds</span>
                }
            </MatrixClientContext.Provider>
        </BaseDialog>
    );
};

export default BeaconViewDialog;
