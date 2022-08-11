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

import { DeviceWithVerification } from "./useOwnDevices";

// TODO put somewhere good when security card is merged
export enum DeviceSecurityVariation {
    Verified = 'Verified',
    Unverified = 'Unverified',
    Inactive = 'Inactive',
}

type DeviceFilterCondition = (device: DeviceWithVerification) => boolean;

export const INACTIVE_DEVICE_AGE_MS = 7.776e+9; // 90 days

export const isDeviceInactive: DeviceFilterCondition = device => !!device.last_seen_ts &&
device.last_seen_ts < Date.now() - INACTIVE_DEVICE_AGE_MS;

const filters: Record<DeviceSecurityVariation, DeviceFilterCondition> = {
    [DeviceSecurityVariation.Verified]: device => !!device.isVerified,
    [DeviceSecurityVariation.Unverified]: device => !device.isVerified,
    [DeviceSecurityVariation.Inactive]: isDeviceInactive,
};

export const filterDevicesBySecurityRecommendation = (
    devices: DeviceWithVerification[],
    securityVariations: DeviceSecurityVariation[],
) => {
    const activeFilters = securityVariations.map(variation => filters[variation]);
    if (!activeFilters.length) {
        return devices;
    }
    return devices.filter(device => activeFilters.every(filter => filter(device)));
};
