/*
Copyright 2023 The Matrix.org Foundation C.I.C.

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

import { Mocked } from "jest-mock";
import { GeneratedSecretStorageKey } from "matrix-js-sdk/src/crypto-api";
import { MatrixClient } from "matrix-js-sdk/src/matrix";
import { SECRET_STORAGE_ALGORITHM_V1_AES, SecretStorageKeyDescription } from "matrix-js-sdk/src/secret-storage";

import { MatrixClientPeg } from "../../src/MatrixClientPeg";
import { getMockClientWithEventEmitter, mockPlatformPeg } from "../test-utils";
import BasePlatform from "../../src/BasePlatform";
import { getSSSSKeyFromPlatformSecret, storeSSSSKeyAsPlatformSecret } from "../../src/utils/KeyPersistenceUtils";

describe("KeyPersistenceUtils", () => {
    let mockClient: Mocked<MatrixClient>;
    let mockPlatform: Mocked<BasePlatform>;

    const aliceId = "@alice:server";

    const fixtureKey: GeneratedSecretStorageKey = {
        keyInfo: {
            pubkey: "0bCJCAw2aO6aWjAW5DtWRaW28UWkqRLImcJxYS9ecVs",
        },
        encodedPrivateKey: "EsUB qAtc mFej v9sV NMTe ywCK NF7Y FfqA 6oa4 QXnA j3pK TvTE",
        privateKey: new Uint8Array([
            231, 199, 233, 255, 28, 12, 57, 168, 125, 66, 68, 80, 55, 134, 84, 196, 59, 217, 223, 40, 152, 139, 87, 158,
            74, 89, 127, 171, 158, 208, 46, 42,
        ]),
    };
    const fixtureKeyInfo = {
        algorithm: SECRET_STORAGE_ALGORITHM_V1_AES,
        iv: "5aXcYBI82fhueAGN51b0xA==",
        mac: "AJfZkV0zMqI8G4TbQmGLeVRU9bxLBzOcAc/9wBUmOdI=",
    } as SecretStorageKeyDescription;
    const fixtureKeyId = "7u94zhoLfRKa3j0ePyvDOMAAq8hRTcJy";

    beforeEach(async () => {
        mockPlatform = mockPlatformPeg();
        mockClient = getMockClientWithEventEmitter({
            getUserId: jest.fn().mockReturnValue(aliceId),
            secretStorage: {
                checkKey: jest.fn(),
                getKey: jest.fn(),
            },
        });
        jest.spyOn(MatrixClientPeg, "get").mockReturnValue(mockClient);
        jest.spyOn(MatrixClientPeg, "safeGet").mockReturnValue(mockClient);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("storeSSSSKeyAsPlatformSecret", () => {
        let savePlatformSecretSpy: jest.SpyInstance;

        beforeEach(() => {
            savePlatformSecretSpy = jest.spyOn(mockPlatform, "savePlatformSecret");
        });

        it("should send the key to the platform", async () => {
            await storeSSSSKeyAsPlatformSecret(fixtureKeyId, fixtureKey.encodedPrivateKey!);

            expect(savePlatformSecretSpy).toHaveBeenCalled();
            expect(savePlatformSecretSpy.mock.lastCall![0]).toContain(fixtureKeyId);
            expect(savePlatformSecretSpy.mock.lastCall![1]).toBe(fixtureKey.encodedPrivateKey);
        });

        it("should return true when the key is saved correctly", async () => {
            savePlatformSecretSpy.mockResolvedValue(fixtureKey.encodedPrivateKey!);

            const result = await storeSSSSKeyAsPlatformSecret(fixtureKeyId, fixtureKey.encodedPrivateKey!);

            expect(result).toBe(true);
        });

        it("should return false when no key can be saved", async () => {
            savePlatformSecretSpy.mockResolvedValue(null);

            const result = await storeSSSSKeyAsPlatformSecret(fixtureKeyId, fixtureKey.encodedPrivateKey!);

            expect(result).toBe(false);
        });

        it("should return false when the key is not saved correctly", async () => {
            savePlatformSecretSpy.mockResolvedValue(fixtureKey.encodedPrivateKey!.substring(1));

            const result = await storeSSSSKeyAsPlatformSecret(fixtureKeyId, fixtureKey.encodedPrivateKey!);

            expect(result).toBe(false);
        });
    });

    describe("getSSSSKeyFromPlatformSecret", () => {
        let checkKey: typeof mockClient.secretStorage.checkKey;
        let getPlatformSecretSpy: jest.SpyInstance;

        beforeEach(() => {
            checkKey = mockClient.secretStorage.checkKey;
            getPlatformSecretSpy = jest.spyOn(mockPlatform, "getPlatformSecret");
        });

        it("should get the key from the platform", async () => {
            await getSSSSKeyFromPlatformSecret(fixtureKeyId, fixtureKeyInfo);

            expect(getPlatformSecretSpy).toHaveBeenCalled();
            expect(getPlatformSecretSpy.mock.lastCall![0]).toContain(fixtureKeyId);
        });

        it("should return the key when it is found", async () => {
            getPlatformSecretSpy.mockResolvedValue(fixtureKey.encodedPrivateKey!);
            checkKey.mockResolvedValue(true);

            const result = await getSSSSKeyFromPlatformSecret(fixtureKeyId, fixtureKeyInfo);

            expect(result).toEqual(fixtureKey.privateKey);
            expect(checkKey).toHaveBeenCalledWith(fixtureKey.privateKey, fixtureKeyInfo);
        });

        it("should return null when no key is found", async () => {
            getPlatformSecretSpy.mockResolvedValue(null);

            const result = await getSSSSKeyFromPlatformSecret(fixtureKeyId, fixtureKeyInfo);

            expect(result).toBe(null);
        });

        it("should return null when the key cannot be fetched", async () => {
            getPlatformSecretSpy.mockRejectedValue(null);

            const result = await getSSSSKeyFromPlatformSecret(fixtureKeyId, fixtureKeyInfo);

            expect(result).toBe(null);
        });

        it("should return null when a corrupted key is found", async () => {
            getPlatformSecretSpy.mockResolvedValue(fixtureKey.encodedPrivateKey!);
            checkKey.mockResolvedValue(true);

            const result = await getSSSSKeyFromPlatformSecret(fixtureKeyId, fixtureKeyInfo);

            expect(result).toEqual(fixtureKey.privateKey);
            expect(checkKey).toHaveBeenCalledWith(fixtureKey.privateKey, fixtureKeyInfo);
        });

        it("should return null when the found key does not match", async () => {
            getPlatformSecretSpy.mockResolvedValue(fixtureKey.encodedPrivateKey!);
            checkKey.mockResolvedValue(false);

            const result = await getSSSSKeyFromPlatformSecret(fixtureKeyId, fixtureKeyInfo);

            expect(result).toEqual(null);
            expect(checkKey).toHaveBeenCalledWith(fixtureKey.privateKey, fixtureKeyInfo);
        });
    });
});
