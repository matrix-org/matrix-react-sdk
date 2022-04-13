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

import BaseDialog from "../dialogs/BaseDialog";
import { IDialogProps } from "../dialogs/IDialogProps";
import Map from '../location/Map';
import SmartMarker from '../location/SmartMarker';
import { useLiveBeacons } from '../../../utils/beacon/useLiveBeacons';

interface IProps extends IDialogProps {
    roomId: Room['roomId'];
    matrixClient: MatrixClient;
}

// TODO actual center is coming soon
// for now just center around first beacon in list
const useMapCenterUri = (beacons: Beacon[]): string => {
    const firstBeacon = beacons[0];

    return firstBeacon.latestLocationState?.uri;
};

/**
 * Dialog to view live beacons maximised
 */
const BeaconViewDialog: React.FC<IProps> = ({ roomId, matrixClient, onFinished }) => {
    const liveBeacons = useLiveBeacons(roomId, matrixClient);

    const mapCenterUri = useMapCenterUri(liveBeacons);

    // only pass member to marker when should render avatar marker
    // const markerRoomMember = isSelfLocation(mxEvent.getContent()) ? mxEvent.sender : undefined;
    // const geoUri = locationEventGeoUri(mxEvent);
    return (
        <BaseDialog
            className='mx_BeaconViewDialog'
            onFinished={onFinished}
            fixedWidth={false}
        >
            <Map
                id='mx_BeaconViewDialog'
                centerGeoUri={mapCenterUri}
                interactive
                className="mx_BeaconViewDialog_map"
            >
                {
                    ({ map }) =>
                        <>
                            { /* <SmartMarker
                                map={map}
                                id={`${this.getBodyId()}-marker`}
                                geoUri={geoUri}
                                roomMember={markerRoomMember}
                            /> */ }
                        </>
                }
            </Map>
        </BaseDialog>
    );
};

export default BeaconViewDialog;
