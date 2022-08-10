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

import DeviceTile from './DeviceTile';
import { DevicesDictionary, DeviceWithVerification } from './useOwnDevices';

export enum DeviceSortOrder {
    LatestActivity = 'LatestActivity',
}

interface Props {
    devices: DevicesDictionary;
}

const sortDevicesByLatestActivity = (left: DeviceWithVerification, right: DeviceWithVerification) =>
    left.last_seen_ts - right.last_seen_ts;

const getSortedDeviceIds = (devices: DevicesDictionary) =>
    Object.values(devices).sort(sortDevicesByLatestActivity).map(device => device.device_id);

const SortedDeviceList: React.FC<Props> = ({ devices }) => {
    const [sortedIds, setSortedIds] = useState([]);

    useEffect(() => {
        setSortedIds(getSortedDeviceIds(devices));
    }, [devices]);

    return <ol className='mx_SortedDeviceList'>
        { sortedIds.map((deviceId) =>
        <li key={deviceId}>

            <DeviceTile
                
                device={devices[deviceId]}
            />
        </li>

        )}
    </ol>;
};

export default SortedDeviceList;
