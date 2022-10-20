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

import EventEmitter from "events";
import { MethodKeysOf, mocked, MockedObject, PropertyKeysOf } from "jest-mock";
import { Feature, ServerSupport } from "matrix-js-sdk/src/feature";
import { MatrixClient, User } from "matrix-js-sdk/src/matrix";

import { MatrixClientPeg } from "../../src/MatrixClientPeg";

/**
 * Mock client with real event emitter
 * useful for testing code that listens
 * to MatrixClient events
 */
export class MockClientWithEventEmitter extends EventEmitter {
    constructor(mockProperties: Partial<Record<MethodKeysOf<MatrixClient>, unknown>> = {}) {
        super();

        Object.assign(this, mockProperties);
    }
}

/**
 * - make a mock client
 * - cast the type to mocked(MatrixClient)
 * - spy on MatrixClientPeg.get to return the mock
 * eg
 * ```
 * const mockClient = getMockClientWithEventEmitter({
        getUserId: jest.fn().mockReturnValue(aliceId),
    });
 * ```
 */
export const getMockClientWithEventEmitter = (
    mockProperties: Partial<Record<MethodKeysOf<MatrixClient>, unknown>>,
): MockedObject<MatrixClient> => {
    const mock = mocked(new MockClientWithEventEmitter(mockProperties) as unknown as MatrixClient);

    jest.spyOn(MatrixClientPeg, 'get').mockReturnValue(mock);

    mock.canSupport = new Map();
    Object.keys(Feature).forEach(feature => {
        mock.canSupport.set(feature as Feature, ServerSupport.Stable);
    });
    return mock;
};

export const unmockClientPeg = () => jest.spyOn(MatrixClientPeg, 'get').mockRestore();

/**
 * Returns basic mocked client methods related to the current user
 * ```
 * const mockClient = getMockClientWithEventEmitter({
        ...mockClientMethodsUser('@mytestuser:domain'),
    });
 * ```
 */
export const mockClientMethodsUser = (userId = '@alice:domain') => ({
    getUserId: jest.fn().mockReturnValue(userId),
    getUser: jest.fn().mockReturnValue(new User(userId)),
    isGuest: jest.fn().mockReturnValue(false),
    mxcUrlToHttp: jest.fn().mockReturnValue('mock-mxcUrlToHttp'),
    credentials: { userId },
    getThreePids: jest.fn().mockResolvedValue({ threepids: [] }),
    getAccessToken: jest.fn(),
    getDeviceId: jest.fn(),
    getAccountData: jest.fn(),
});

/**
 * Returns basic mocked client methods related to rendering events
 * ```
 * const mockClient = getMockClientWithEventEmitter({
        ...mockClientMethodsUser('@mytestuser:domain'),
    });
 * ```
 */
export const mockClientMethodsEvents = () => ({
    decryptEventIfNeeded: jest.fn(),
    getPushActionsForEvent: jest.fn(),
});

/**
 * Returns basic mocked client methods related to server support
 */
export const mockClientMethodsServer = (): Partial<Record<MethodKeysOf<MatrixClient>, unknown>> => ({
    doesServerSupportSeparateAddAndBind: jest.fn(),
    getIdentityServerUrl: jest.fn(),
    getHomeserverUrl: jest.fn(),
    getCapabilities: jest.fn().mockReturnValue({}),
    getClientWellKnown: jest.fn().mockReturnValue({}),
    doesServerSupportUnstableFeature: jest.fn().mockResolvedValue(false),
    getVersions: jest.fn().mockResolvedValue({}),
    isFallbackICEServerAllowed: jest.fn(),
});

export const mockClientMethodsDevice = (
    deviceId = 'test-device-id',
): Partial<Record<MethodKeysOf<MatrixClient>, unknown>> => ({
    getDeviceId: jest.fn().mockReturnValue(deviceId),
    getDeviceEd25519Key: jest.fn(),
    getDevices: jest.fn().mockResolvedValue({ devices: [] }),
});

export const mockClientMethodsCrypto = (): Partial<Record<
    MethodKeysOf<MatrixClient> & PropertyKeysOf<MatrixClient>, unknown>
> => ({
    isCryptoEnabled: jest.fn(),
    isSecretStorageReady: jest.fn(),
    isCrossSigningReady: jest.fn(),
    isKeyBackupKeyStored: jest.fn(),
    getCrossSigningCacheCallbacks: jest.fn().mockReturnValue({ getCrossSigningKeyCache: jest.fn() }),
    getStoredCrossSigningForUser: jest.fn(),
    checkKeyBackup: jest.fn().mockReturnValue({}),
    crypto: {
        getSessionBackupPrivateKey: jest.fn(),
        secretStorage: { hasKey: jest.fn() },
        crossSigningInfo: {
            getId: jest.fn(),
            isStoredInSecretStorage: jest.fn(),
        },
    },
});

