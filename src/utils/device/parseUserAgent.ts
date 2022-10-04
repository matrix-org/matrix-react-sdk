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

// Element dbg/1.5.0-dev (Xiaomi; Mi 9T; Android 11; RKQ1.200826.002 test-keys; Flavour GooglePlay; MatrixAndroidSdk2 1.5.0)
// Legacy : Element/1.0.0 (Linux; U; Android 6.0.1; SM-A510F Build/MMB29; Flavour GPlay; MatrixAndroidSdk2 1.0)
const ANDROID_KEYWORD = "; MatrixAndroidSdk2";

// Element/1.8.21 (iPhone XS Max; iOS 15.2; Scale/3.00)
const IOS_KEYWORD = "; iOS ";

// Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) ElementNightly/2022091301
// Chrome/104.0.5112.102 Electron/20.1.1 Safari/537.36
const DESKTOP_KEYWORD = " Electron/";

// Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36
const WEB_KEYWORD = "Mozilla/";

type UserAgentParser = (userAgent?: string) => ExtendedDeviceInformation;

const androidParser: UserAgentParser = (userAgent) => {
    return {
        deviceType: DeviceType.Mobile,
    };
}
const iosParser: UserAgentParser = (userAgent) => {
    return {
        deviceType: DeviceType.Mobile,
    };
}
const makeWebParser = (deviceType: DeviceType): UserAgentParser => (userAgent) => {
    return {
        deviceType,
    };
}
const unknownUserAgentParser: UserAgentParser = (userAgent) => ({
    deviceType: DeviceType.Unknown,
});

const getParser = (userAgent: string): UserAgentParser => {
    if (userAgent.indexOf(ANDROID_KEYWORD) > -1) return androidParser;
    if (userAgent.indexOf(IOS_KEYWORD) > -1) return iosParser;
    if (userAgent.indexOf(DESKTOP_KEYWORD) > -1) return makeWebParser(DeviceType.Desktop);
    if (userAgent.indexOf(WEB_KEYWORD) > -1) return makeWebParser(DeviceType.Web);

    return unknownUserAgentParser;
};

export const parseUserAgent = (userAgent?: string): ExtendedDeviceInformation => {
    if (!userAgent) {
        return {
            deviceType: DeviceType.Unknown,
        };
    }

    const parser = getParser(userAgent);

    return parser(userAgent);
};
