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

import Heading from '../../typography/Heading';
import { DeviceWithVerification } from './types';

interface Props {
    device: DeviceWithVerification;
    isLoading: boolean;
    setDeviceName: (deviceName: string) => void;
}

export const DeviceDetailHeading: React.FC<Props> = ({
    device, isLoading, setDeviceName,
}) => {
    return <div className='mx_DeviceDetailHeading'>
        <Heading size='h3'>{ device.display_name ?? device.device_id }</Heading>
    </div>;
};
