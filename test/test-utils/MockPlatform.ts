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

import { MethodKeysOf, mocked, MockedObject } from "jest-mock";

import BasePlatform from "../../src/BasePlatform";
import PlatformPeg from "../../src/PlatformPeg";

export const getMockPlatform = (
    mockProperties: Partial<Record<MethodKeysOf<BasePlatform>, unknown>>,
): MockedObject<BasePlatform> => {
    const mock = mocked(new MockPlatform(mockProperties) as unknown as BasePlatform);

    jest.spyOn(PlatformPeg, 'get').mockReturnValue(mock);
    return mock;
};

export class MockPlatform extends BasePlatform {
    constructor(mockProperties: Partial<Record<MethodKeysOf<BasePlatform>, unknown>> = {}) {
        super();

        Object.assign(this, mockProperties);
    }

    public getAppVersion = jest.fn().mockResolvedValue("version: test");
    public getConfig = jest.fn().mockResolvedValue({});
    public getHumanReadableName = jest.fn().mockReturnValue("Test Platform");
    public getDefaultDeviceDisplayName = jest.fn().mockReturnValue("Test device");
    public reload = jest.fn();
    public requestNotificationPermission = jest.fn().mockResolvedValue("fine!");
}
