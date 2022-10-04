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

import UAParser from 'ua-parser-js';

export enum DeviceType {
    Desktop = 'Desktop',
    Mobile = 'Mobile',
    Web = 'Web',
    Unknown = 'Unknown',
}
export type ExtendedDeviceInformation = {
    deviceType: DeviceType;
    // eg Google Pixel 6
    deviceModel?: string;
    // eg Android 11
    deviceOperatingSystem?: string;
    // eg Firefox
    clientName?: string;
    // eg 1.1.0
    clientVersion?: string;
};

// Element/1.8.21 (iPhone XS Max; iOS 15.2; Scale/3.00)
const IOS_KEYWORD = "; iOS ";

const getDeviceType = (
    userAgent: string,
    device: UAParser.IDevice,
    browser: UAParser.IBrowser,
    operatingSystem: UAParser.IOS,
): DeviceType => {
    if (browser.name === 'Electron') {
        return DeviceType.Desktop;
    }
    if (
        device.type === 'mobile' ||
        operatingSystem.name?.indexOf('Android') > -1 ||
        userAgent.indexOf(IOS_KEYWORD) > -1
    ) {
        return DeviceType.Mobile;
    }
    if (!!browser.name) {
        return DeviceType.Web;
    }
    return DeviceType.Unknown;
}

export const parseUserAgent = (userAgent?: string): ExtendedDeviceInformation => {
    if (!userAgent) {
        return {
            deviceType: DeviceType.Unknown,
        };
    }

    const parser = new UAParser(userAgent);

    const browser = parser.getBrowser();
    const device = parser.getDevice();
    const operatingSystem = parser.getOS();
    console.log(userAgent, { browser, device, operatingSystem }, parser.getResult());

    const deviceOperatingSystem = operatingSystem.name && [
        operatingSystem.name, operatingSystem.version,
    ].filter(Boolean).join(' ');
    const deviceModel = device.vendor && [device.vendor, device.model].filter(Boolean).join(' ');
    const deviceType = getDeviceType(userAgent, device, browser, operatingSystem);

    return {
        deviceType,
        deviceModel,
        deviceOperatingSystem,
        clientName: browser.name,
        clientVersion: browser.major ?? browser.version,
    }
};
