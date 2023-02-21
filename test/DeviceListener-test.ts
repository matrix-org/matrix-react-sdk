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

import { Mocked, mocked } from "jest-mock";
import { MatrixEvent, Room, MatrixClient } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";
import { DeviceInfo } from "matrix-js-sdk/src/crypto/deviceinfo";
import { CrossSigningInfo, DeviceTrustLevel } from "matrix-js-sdk/src/crypto/CrossSigning";
import { CryptoEvent } from "matrix-js-sdk/src/crypto";
import { IKeyBackupInfo } from "matrix-js-sdk/src/crypto/keybackup";

import DeviceListener from "../src/DeviceListener";
import { MatrixClientPeg } from "../src/MatrixClientPeg";
import * as SetupEncryptionToast from "../src/toasts/SetupEncryptionToast";
import * as UnverifiedSessionToast from "../src/toasts/UnverifiedSessionToast";
import * as BulkUnverifiedSessionsToast from "../src/toasts/BulkUnverifiedSessionsToast";
import { isSecretStorageBeingAccessed } from "../src/SecurityManager";
import dis from "../src/dispatcher/dispatcher";
import { Action } from "../src/dispatcher/actions";
import SettingsStore from "../src/settings/SettingsStore";
import { SettingLevel } from "../src/settings/SettingLevel";
import { getMockClientWithEventEmitter, mockPlatformPeg } from "./test-utils";
import { UIFeature } from "../src/settings/UIFeature";
import { isBulkUnverifiedDeviceReminderSnoozed } from "../src/utils/device/snoozeBulkUnverifiedDeviceReminder";

// don't litter test console with logs
jest.mock("matrix-js-sdk/src/logger");

jest.mock("../src/dispatcher/dispatcher", () => ({
    dispatch: jest.fn(),
    register: jest.fn(),
}));

jest.mock("../src/SecurityManager", () => ({
    isSecretStorageBeingAccessed: jest.fn(),
    accessSecretStorage: jest.fn(),
}));

jest.mock("../src/utils/device/snoozeBulkUnverifiedDeviceReminder", () => ({
    isBulkUnverifiedDeviceReminderSnoozed: jest.fn(),
}));

const userId = "@user:server";
const deviceId = "my-device-id";
const mockDispatcher = mocked(dis);
const flushPromises = async () => await new Promise(process.nextTick);

describe("DeviceListener", () => {
    let mockClient: Mocked<MatrixClient> | undefined;

    // spy on various toasts' hide and show functions
    // easier than mocking
    jest.spyOn(SetupEncryptionToast, "showToast");
    jest.spyOn(SetupEncryptionToast, "hideToast");
    jest.spyOn(BulkUnverifiedSessionsToast, "showToast");
    jest.spyOn(BulkUnverifiedSessionsToast, "hideToast");
    jest.spyOn(UnverifiedSessionToast, "showToast");
    jest.spyOn(UnverifiedSessionToast, "hideToast");

    beforeEach(() => {
        jest.resetAllMocks();
        mockPlatformPeg({
            getAppVersion: jest.fn().mockResolvedValue("1.2.3"),
        });
        mockClient = getMockClientWithEventEmitter({
            isGuest: jest.fn(),
            getUserId: jest.fn().mockReturnValue(userId),
            getKeyBackupVersion: jest.fn().mockResolvedValue(undefined),
            getRooms: jest.fn().mockReturnValue([]),
            doesServerSupportUnstableFeature: jest.fn().mockResolvedValue(true),
            isCrossSigningReady: jest.fn().mockResolvedValue(true),
            isSecretStorageReady: jest.fn().mockResolvedValue(true),
            isCryptoEnabled: jest.fn().mockReturnValue(true),
            isInitialSyncComplete: jest.fn().mockReturnValue(true),
            getKeyBackupEnabled: jest.fn(),
            getStoredDevicesForUser: jest.fn().mockReturnValue([]),
            getCrossSigningId: jest.fn(),
            getStoredCrossSigningForUser: jest.fn(),
            waitForClientWellKnown: jest.fn(),
            downloadKeys: jest.fn(),
            isRoomEncrypted: jest.fn(),
            getClientWellKnown: jest.fn(),
            getDeviceId: jest.fn().mockReturnValue(deviceId),
            setAccountData: jest.fn(),
            getAccountData: jest.fn(),
            deleteAccountData: jest.fn(),
            checkDeviceTrust: jest.fn().mockReturnValue(new DeviceTrustLevel(false, false, false, false)),
        });
        jest.spyOn(MatrixClientPeg, "get").mockReturnValue(mockClient);
        jest.spyOn(SettingsStore, "getValue").mockReturnValue(false);
        mocked(isBulkUnverifiedDeviceReminderSnoozed).mockClear().mockReturnValue(false);
    });

    const createAndStart = async (): Promise<DeviceListener> => {
        const instance = new DeviceListener();
        instance.start();
        await flushPromises();
        return instance;
    };

    describe("client information", () => {
        it("watches device client information setting", async () => {
            const watchSettingSpy = jest.spyOn(SettingsStore, "watchSetting");
            const unwatchSettingSpy = jest.spyOn(SettingsStore, "unwatchSetting");
            const deviceListener = await createAndStart();

            expect(watchSettingSpy).toHaveBeenCalledWith("deviceClientInformationOptIn", null, expect.any(Function));

            deviceListener.stop();

            expect(unwatchSettingSpy).toHaveBeenCalled();
        });

        describe("when device client information feature is enabled", () => {
            beforeEach(() => {
                jest.spyOn(SettingsStore, "getValue").mockImplementation(
                    (settingName) => settingName === "deviceClientInformationOptIn",
                );
            });
            it("saves client information on start", async () => {
                await createAndStart();

                expect(mockClient!.setAccountData).toHaveBeenCalledWith(
                    `io.element.matrix_client_information.${deviceId}`,
                    { name: "Element", url: "localhost", version: "1.2.3" },
                );
            });

            it("catches error and logs when saving client information fails", async () => {
                const errorLogSpy = jest.spyOn(logger, "error");
                const error = new Error("oups");
                mockClient!.setAccountData.mockRejectedValue(error);

                // doesn't throw
                await createAndStart();

                expect(errorLogSpy).toHaveBeenCalledWith("Failed to update client information", error);
            });

            it("saves client information on logged in action", async () => {
                const instance = await createAndStart();

                mockClient!.setAccountData.mockClear();

                // @ts-ignore calling private function
                instance.onAction({ action: Action.OnLoggedIn });

                await flushPromises();

                expect(mockClient!.setAccountData).toHaveBeenCalledWith(
                    `io.element.matrix_client_information.${deviceId}`,
                    { name: "Element", url: "localhost", version: "1.2.3" },
                );
            });
        });

        describe("when device client information feature is disabled", () => {
            const clientInfoEvent = new MatrixEvent({
                type: `io.element.matrix_client_information.${deviceId}`,
                content: { name: "hello" },
            });
            const emptyClientInfoEvent = new MatrixEvent({ type: `io.element.matrix_client_information.${deviceId}` });
            beforeEach(() => {
                jest.spyOn(SettingsStore, "getValue").mockReturnValue(false);

                mockClient!.getAccountData.mockReturnValue(undefined);
            });

            it("does not save client information on start", async () => {
                await createAndStart();

                expect(mockClient!.setAccountData).not.toHaveBeenCalled();
            });

            it("removes client information on start if it exists", async () => {
                mockClient!.getAccountData.mockReturnValue(clientInfoEvent);
                await createAndStart();

                expect(mockClient!.deleteAccountData).toHaveBeenCalledWith(
                    `io.element.matrix_client_information.${deviceId}`,
                );
            });

            it("does not try to remove client info event that are already empty", async () => {
                mockClient!.getAccountData.mockReturnValue(emptyClientInfoEvent);
                await createAndStart();

                expect(mockClient!.deleteAccountData).not.toHaveBeenCalled();
            });

            it("does not save client information on logged in action", async () => {
                const instance = await createAndStart();

                // @ts-ignore calling private function
                instance.onAction({ action: Action.OnLoggedIn });

                await flushPromises();

                expect(mockClient!.setAccountData).not.toHaveBeenCalled();
            });

            it("saves client information after setting is enabled", async () => {
                const watchSettingSpy = jest.spyOn(SettingsStore, "watchSetting");
                await createAndStart();

                const [settingName, roomId, callback] = watchSettingSpy.mock.calls[0];
                expect(settingName).toEqual("deviceClientInformationOptIn");
                expect(roomId).toBeNull();

                callback("deviceClientInformationOptIn", null, SettingLevel.DEVICE, SettingLevel.DEVICE, true);

                await flushPromises();

                expect(mockClient!.setAccountData).toHaveBeenCalledWith(
                    `io.element.matrix_client_information.${deviceId}`,
                    { name: "Element", url: "localhost", version: "1.2.3" },
                );
            });
        });
    });

    describe("recheck", () => {
        it("does nothing when cross signing feature is not supported", async () => {
            mockClient!.doesServerSupportUnstableFeature.mockResolvedValue(false);
            await createAndStart();

            expect(mockClient!.isCrossSigningReady).not.toHaveBeenCalled();
        });
        it("does nothing when crypto is not enabled", async () => {
            mockClient!.isCryptoEnabled.mockReturnValue(false);
            await createAndStart();

            expect(mockClient!.isCrossSigningReady).not.toHaveBeenCalled();
        });
        it("does nothing when initial sync is not complete", async () => {
            mockClient!.isInitialSyncComplete.mockReturnValue(false);
            await createAndStart();

            expect(mockClient!.isCrossSigningReady).not.toHaveBeenCalled();
        });

        describe("set up encryption", () => {
            const rooms = [{ roomId: "!room1" }, { roomId: "!room2" }] as unknown as Room[];

            beforeEach(() => {
                mockClient!.isCrossSigningReady.mockResolvedValue(false);
                mockClient!.isSecretStorageReady.mockResolvedValue(false);
                mockClient!.getRooms.mockReturnValue(rooms);
                mockClient!.isRoomEncrypted.mockReturnValue(true);
            });

            it("hides setup encryption toast when cross signing and secret storage are ready", async () => {
                mockClient!.isCrossSigningReady.mockResolvedValue(true);
                mockClient!.isSecretStorageReady.mockResolvedValue(true);
                await createAndStart();
                expect(SetupEncryptionToast.hideToast).toHaveBeenCalled();
            });

            it("hides setup encryption toast when it is dismissed", async () => {
                const instance = await createAndStart();
                instance.dismissEncryptionSetup();
                await flushPromises();
                expect(SetupEncryptionToast.hideToast).toHaveBeenCalled();
            });

            it("does not do any checks or show any toasts when secret storage is being accessed", async () => {
                mocked(isSecretStorageBeingAccessed).mockReturnValue(true);
                await createAndStart();

                expect(mockClient!.downloadKeys).not.toHaveBeenCalled();
                expect(SetupEncryptionToast.showToast).not.toHaveBeenCalled();
            });

            it("does not do any checks or show any toasts when no rooms are encrypted", async () => {
                mockClient!.isRoomEncrypted.mockReturnValue(false);
                await createAndStart();

                expect(mockClient!.downloadKeys).not.toHaveBeenCalled();
                expect(SetupEncryptionToast.showToast).not.toHaveBeenCalled();
            });

            describe("when user does not have a cross signing id on this device", () => {
                beforeEach(() => {
                    mockClient!.getCrossSigningId.mockReturnValue(null);
                });

                it("shows verify session toast when account has cross signing", async () => {
                    mockClient!.getStoredCrossSigningForUser.mockReturnValue(new CrossSigningInfo(userId));
                    await createAndStart();

                    expect(mockClient!.downloadKeys).toHaveBeenCalled();
                    expect(SetupEncryptionToast.showToast).toHaveBeenCalledWith(
                        SetupEncryptionToast.Kind.VERIFY_THIS_SESSION,
                    );
                });

                it("checks key backup status when when account has cross signing", async () => {
                    mockClient!.getCrossSigningId.mockReturnValue(null);
                    mockClient!.getStoredCrossSigningForUser.mockReturnValue(new CrossSigningInfo(userId));
                    await createAndStart();

                    expect(mockClient!.getKeyBackupEnabled).toHaveBeenCalled();
                });
            });

            describe("when user does have a cross signing id on this device", () => {
                beforeEach(() => {
                    mockClient!.getCrossSigningId.mockReturnValue("abc");
                });

                it("shows upgrade encryption toast when user has a key backup available", async () => {
                    // non falsy response
                    mockClient!.getKeyBackupVersion.mockResolvedValue({} as unknown as IKeyBackupInfo);
                    await createAndStart();

                    expect(SetupEncryptionToast.showToast).toHaveBeenCalledWith(
                        SetupEncryptionToast.Kind.UPGRADE_ENCRYPTION,
                    );
                });
            });
        });

        describe("key backup status", () => {
            it("checks keybackup status when cross signing and secret storage are ready", async () => {
                // default mocks set cross signing and secret storage to ready
                await createAndStart();
                expect(mockClient!.getKeyBackupEnabled).toHaveBeenCalled();
                expect(mockDispatcher.dispatch).not.toHaveBeenCalled();
            });

            it("checks keybackup status when setup encryption toast has been dismissed", async () => {
                mockClient!.isCrossSigningReady.mockResolvedValue(false);
                const instance = await createAndStart();

                instance.dismissEncryptionSetup();
                await flushPromises();

                expect(mockClient!.getKeyBackupEnabled).toHaveBeenCalled();
            });

            it("does not dispatch keybackup event when key backup check is not finished", async () => {
                // returns null when key backup status hasn't finished being checked
                mockClient!.getKeyBackupEnabled.mockReturnValue(null);
                await createAndStart();
                expect(mockDispatcher.dispatch).not.toHaveBeenCalled();
            });

            it("dispatches keybackup event when key backup is not enabled", async () => {
                mockClient!.getKeyBackupEnabled.mockReturnValue(false);
                await createAndStart();
                expect(mockDispatcher.dispatch).toHaveBeenCalledWith({ action: Action.ReportKeyBackupNotEnabled });
            });

            it("does not check key backup status again after check is complete", async () => {
                mockClient!.getKeyBackupEnabled.mockReturnValue(null);
                const instance = await createAndStart();
                expect(mockClient!.getKeyBackupEnabled).toHaveBeenCalled();

                // keyback check now complete
                mockClient!.getKeyBackupEnabled.mockReturnValue(true);

                // trigger a recheck
                instance.dismissEncryptionSetup();
                await flushPromises();
                expect(mockClient!.getKeyBackupEnabled).toHaveBeenCalledTimes(2);

                // trigger another recheck
                instance.dismissEncryptionSetup();
                await flushPromises();
                // not called again, check was complete last time
                expect(mockClient!.getKeyBackupEnabled).toHaveBeenCalledTimes(2);
            });
        });

        describe("unverified sessions toasts", () => {
            const currentDevice = new DeviceInfo(deviceId);
            const device2 = new DeviceInfo("d2");
            const device3 = new DeviceInfo("d3");

            const deviceTrustVerified = new DeviceTrustLevel(true, false, false, false);
            const deviceTrustUnverified = new DeviceTrustLevel(false, false, false, false);

            beforeEach(() => {
                mockClient!.isCrossSigningReady.mockResolvedValue(true);
                mockClient!.getStoredDevicesForUser.mockReturnValue([currentDevice, device2, device3]);
                // all devices verified by default
                mockClient!.checkDeviceTrust.mockReturnValue(deviceTrustVerified);
                mockClient!.deviceId = currentDevice.deviceId;
                jest.spyOn(SettingsStore, "getValue").mockImplementation(
                    (settingName) => settingName === UIFeature.BulkUnverifiedSessionsReminder,
                );
            });
            describe("bulk unverified sessions toasts", () => {
                it("hides toast when cross signing is not ready", async () => {
                    mockClient!.isCrossSigningReady.mockResolvedValue(false);
                    await createAndStart();
                    expect(BulkUnverifiedSessionsToast.hideToast).toHaveBeenCalled();
                    expect(BulkUnverifiedSessionsToast.showToast).not.toHaveBeenCalled();
                });

                it("hides toast when all devices at app start are verified", async () => {
                    await createAndStart();
                    expect(BulkUnverifiedSessionsToast.hideToast).toHaveBeenCalled();
                    expect(BulkUnverifiedSessionsToast.showToast).not.toHaveBeenCalled();
                });

                it("hides toast when feature is disabled", async () => {
                    // BulkUnverifiedSessionsReminder set to false
                    jest.spyOn(SettingsStore, "getValue").mockReturnValue(false);
                    // currentDevice, device2 are verified, device3 is unverified
                    // ie if reminder was enabled it should be shown
                    mockClient!.checkDeviceTrust.mockImplementation((_userId, deviceId) => {
                        switch (deviceId) {
                            case currentDevice.deviceId:
                            case device2.deviceId:
                                return deviceTrustVerified;
                            default:
                                return deviceTrustUnverified;
                        }
                    });
                    await createAndStart();
                    expect(BulkUnverifiedSessionsToast.hideToast).toHaveBeenCalled();
                });

                it("hides toast when current device is unverified", async () => {
                    // device2 verified, current and device3 unverified
                    mockClient!.checkDeviceTrust.mockImplementation((_userId, deviceId) => {
                        switch (deviceId) {
                            case device2.deviceId:
                                return deviceTrustVerified;
                            default:
                                return deviceTrustUnverified;
                        }
                    });
                    await createAndStart();
                    expect(BulkUnverifiedSessionsToast.hideToast).toHaveBeenCalled();
                    expect(BulkUnverifiedSessionsToast.showToast).not.toHaveBeenCalled();
                });

                it("hides toast when reminder is snoozed", async () => {
                    mocked(isBulkUnverifiedDeviceReminderSnoozed).mockReturnValue(true);
                    // currentDevice, device2 are verified, device3 is unverified
                    mockClient!.checkDeviceTrust.mockImplementation((_userId, deviceId) => {
                        switch (deviceId) {
                            case currentDevice.deviceId:
                            case device2.deviceId:
                                return deviceTrustVerified;
                            default:
                                return deviceTrustUnverified;
                        }
                    });
                    await createAndStart();
                    expect(BulkUnverifiedSessionsToast.showToast).not.toHaveBeenCalled();
                    expect(BulkUnverifiedSessionsToast.hideToast).toHaveBeenCalled();
                });

                it("shows toast with unverified devices at app start", async () => {
                    // currentDevice, device2 are verified, device3 is unverified
                    mockClient!.checkDeviceTrust.mockImplementation((_userId, deviceId) => {
                        switch (deviceId) {
                            case currentDevice.deviceId:
                            case device2.deviceId:
                                return deviceTrustVerified;
                            default:
                                return deviceTrustUnverified;
                        }
                    });
                    await createAndStart();
                    expect(BulkUnverifiedSessionsToast.showToast).toHaveBeenCalledWith(
                        new Set<string>([device3.deviceId]),
                    );
                    expect(BulkUnverifiedSessionsToast.hideToast).not.toHaveBeenCalled();
                });

                it("hides toast when unverified sessions at app start have been dismissed", async () => {
                    // currentDevice, device2 are verified, device3 is unverified
                    mockClient!.checkDeviceTrust.mockImplementation((_userId, deviceId) => {
                        switch (deviceId) {
                            case currentDevice.deviceId:
                            case device2.deviceId:
                                return deviceTrustVerified;
                            default:
                                return deviceTrustUnverified;
                        }
                    });
                    const instance = await createAndStart();
                    expect(BulkUnverifiedSessionsToast.showToast).toHaveBeenCalledWith(
                        new Set<string>([device3.deviceId]),
                    );

                    await instance.dismissUnverifiedSessions([device3.deviceId]);
                    await flushPromises();

                    expect(BulkUnverifiedSessionsToast.hideToast).toHaveBeenCalled();
                });

                it("hides toast when unverified sessions are added after app start", async () => {
                    // currentDevice, device2 are verified, device3 is unverified
                    mockClient!.checkDeviceTrust.mockImplementation((_userId, deviceId) => {
                        switch (deviceId) {
                            case currentDevice.deviceId:
                            case device2.deviceId:
                                return deviceTrustVerified;
                            default:
                                return deviceTrustUnverified;
                        }
                    });
                    mockClient!.getStoredDevicesForUser.mockReturnValue([currentDevice, device2]);
                    await createAndStart();

                    expect(BulkUnverifiedSessionsToast.hideToast).toHaveBeenCalled();

                    // add an unverified device
                    mockClient!.getStoredDevicesForUser.mockReturnValue([currentDevice, device2, device3]);
                    // trigger a recheck
                    mockClient!.emit(CryptoEvent.DevicesUpdated, [userId], false);
                    await flushPromises();

                    // bulk unverified sessions toast only shown for devices that were
                    // there at app start
                    // individual nags are shown for new unverified devices
                    expect(BulkUnverifiedSessionsToast.hideToast).toHaveBeenCalledTimes(2);
                    expect(BulkUnverifiedSessionsToast.showToast).not.toHaveBeenCalled();
                });
            });
        });
    });
});
