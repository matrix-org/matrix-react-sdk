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

import { mocked } from "jest-mock";
import { logger } from "matrix-js-sdk/src/logger";
import * as MatrixJs from "matrix-js-sdk/src/matrix";
import StorageEvictedDialog from "../src/components/views/dialogs/StorageEvictedDialog";
import { restoreFromLocalStorage } from "../src/Lifecycle";
import { MatrixClientPeg } from "../src/MatrixClientPeg";
import Modal from "../src/Modal";
import PlatformPeg from "../src/PlatformPeg";
import * as StorageManager from "../src/utils/StorageManager";

import { getMockClientWithEventEmitter, mockPlatformPeg } from "./test-utils";

describe("Lifecycle", () => {
    const mockPlatform = mockPlatformPeg({
        getPickleKey: jest.fn(),
    });

    const realLocalStorage = global.localStorage;

    const mockClient = getMockClientWithEventEmitter({
        clearStores: jest.fn(),
        getAccountData: jest.fn(),
        getUserId: jest.fn(),
        getDeviceId: jest.fn(),
        isVersionSupported: jest.fn().mockResolvedValue(true),
        getCrypto: jest.fn(),
        getClientWellKnown: jest.fn(),
    });

    beforeEach(() => {
        mockPlatform.getPickleKey.mockResolvedValue(null);

        // stub this
        jest.spyOn(MatrixClientPeg, "replaceUsingCreds").mockImplementation(() => {});
        jest.spyOn(MatrixClientPeg, "start").mockResolvedValue(undefined);

        // reset any mocking
        global.localStorage = realLocalStorage;
    });

    const initLocalStorageMock = (mockStore: Record<string, unknown> = {}): void => {
        jest.spyOn(localStorage.__proto__, "getItem")
            .mockClear()
            .mockImplementation((key: unknown) => mockStore[key as string] ?? null);
        jest.spyOn(localStorage.__proto__, "removeItem")
            .mockClear()
            .mockImplementation((key: unknown) => mockStore[key as string] ?? null);
        jest.spyOn(localStorage.__proto__, "setItem").mockClear();
    };

    const initSessionStorageMock = (mockStore: Record<string, unknown> = {}): void => {
        jest.spyOn(sessionStorage.__proto__, "getItem")
            .mockClear()
            .mockImplementation((key: unknown) => mockStore[key as string] ?? null);
        jest.spyOn(sessionStorage.__proto__, "removeItem")
            .mockClear()
            .mockImplementation((key: unknown) => mockStore[key as string] ?? null);
        jest.spyOn(sessionStorage.__proto__, "setItem").mockClear();
    };

    const initIdbMock = (mockStore: Record<string, Record<string, unknown>> = {}): void => {
        jest.spyOn(StorageManager, "idbLoad")
            .mockClear()
            .mockImplementation(
                // @ts-ignore mock type
                async (table: string, key: string) => mockStore[table]?.[key] ?? null,
            );
        jest.spyOn(StorageManager, "idbSave").mockClear().mockResolvedValue(undefined);
    };

    const homeserverUrl = "https://server.org";
    const identityServerUrl = "https://is.org";
    const userId = "@alice:server.org";
    const deviceId = "abc123";
    const accessToken = "test-access-token";
    const localStorageSession = {
        mx_hs_url: homeserverUrl,
        mx_is_url: identityServerUrl,
        mx_user_id: userId,
        mx_device_id: deviceId,
    };
    const idbStorageSession = {
        account: {
            mx_access_token: accessToken,
        },
    };

    describe("restoreFromLocalStorage()", () => {
        beforeEach(() => {
            initLocalStorageMock();
            initSessionStorageMock();
            initIdbMock();

            jest.clearAllMocks();
            jest.spyOn(logger, "log").mockClear();

            jest.spyOn(MatrixJs, "createClient").mockReturnValue(mockClient);

            // stub this out
            jest.spyOn(Modal, "createDialog").mockReturnValue({ finished: Promise.resolve([true]) });
        });

        it("should return false when localStorage is not available", async () => {
            // @ts-ignore dirty mocking
            delete global.localStorage;
            // @ts-ignore dirty mocking
            global.localStorage = undefined;

            expect(await restoreFromLocalStorage()).toEqual(false);
        });

        it("should return false when no session data is found in local storage", async () => {
            expect(await restoreFromLocalStorage()).toEqual(false);
            expect(logger.log).toHaveBeenCalledWith("No previous session found.");
        });

        it("should abort login when we expect to find an access token but don't", async () => {
            initLocalStorageMock({ mx_has_access_token: "true" });

            await expect(() => restoreFromLocalStorage()).rejects.toThrow();
            expect(Modal.createDialog).toHaveBeenCalledWith(StorageEvictedDialog);
            expect(mockClient.clearStores).toHaveBeenCalled();
        });

        describe("when session is found in storage", () => {
            beforeEach(() => {
                initLocalStorageMock(localStorageSession);
                initIdbMock(idbStorageSession);
            });

            describe("guest account", () => {
                it("should ignore guest accounts when ignoreGuest is true", async () => {
                    initLocalStorageMock({ ...localStorageSession, mx_is_guest: "true" });

                    expect(await restoreFromLocalStorage({ ignoreGuest: true })).toEqual(false);
                    expect(logger.log).toHaveBeenCalledWith(`Ignoring stored guest account: ${userId}`);
                });

                it("should restore guest accounts when ignoreGuest is false", async () => {
                    initLocalStorageMock({ ...localStorageSession, mx_is_guest: "true" });

                    expect(await restoreFromLocalStorage({ ignoreGuest: false })).toEqual(true);

                    expect(MatrixClientPeg.replaceUsingCreds).toHaveBeenCalledWith(
                        expect.objectContaining({
                            userId,
                            guest: true,
                        }),
                    );
                    expect(localStorage.setItem).toHaveBeenCalledWith("mx_is_guest", "true");
                });
            });

            describe("without a pickle key", () => {
                it("should persist credentials", async () => {
                    expect(await restoreFromLocalStorage()).toEqual(true);

                    expect(localStorage.setItem).toHaveBeenCalledWith("mx_user_id", userId);
                    expect(localStorage.setItem).toHaveBeenCalledWith("mx_has_access_token", "true");
                    expect(localStorage.setItem).toHaveBeenCalledWith("mx_is_guest", "false");
                    expect(localStorage.setItem).toHaveBeenCalledWith("mx_device_id", deviceId);

                    expect(StorageManager.idbSave).toHaveBeenCalledWith("account", "mx_access_token", accessToken);
                    // dont put accessToken in localstorage when we have idb
                    expect(localStorage.setItem).not.toHaveBeenCalledWith("mx_access_token", accessToken);
                });

                it("should persist access token when idb is not available", async () => {
                    jest.spyOn(StorageManager, "idbSave").mockRejectedValue("oups");
                    expect(await restoreFromLocalStorage()).toEqual(true);

                    expect(StorageManager.idbSave).toHaveBeenCalledWith("account", "mx_access_token", accessToken);
                    // put accessToken in localstorage as fallback
                    expect(localStorage.setItem).toHaveBeenCalledWith("mx_access_token", accessToken);
                });

                it("should create new matrix client with credentials", async () => {
                    expect(await restoreFromLocalStorage()).toEqual(true);

                    expect(MatrixClientPeg.replaceUsingCreds).toHaveBeenCalledWith({
                        userId,
                        accessToken,
                        homeserverUrl,
                        identityServerUrl,
                        deviceId,
                        freshLogin: false,
                        guest: false,
                        pickleKey: undefined,
                    });
                });

                it("should remove fresh login flag from session storage", async () => {
                    expect(await restoreFromLocalStorage()).toEqual(true);

                    expect(sessionStorage.removeItem).toHaveBeenCalledWith("mx_fresh_login");
                });

                it("should start matrix client", async () => {
                    expect(await restoreFromLocalStorage()).toEqual(true);

                    expect(MatrixClientPeg.start).toHaveBeenCalled();
                });
            });
        });
    });
});
