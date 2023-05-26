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
import React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { DeviceInfo } from "matrix-js-sdk/src/crypto/deviceinfo";
import { sleep } from "matrix-js-sdk/src/utils";
import { PUSHER_DEVICE_ID, PUSHER_ENABLED } from "matrix-js-sdk/src/@types/event";

import DevicesPanel from "../../../../src/components/views/settings/DevicesPanel";
import { flushPromises, getMockClientWithEventEmitter, mkPusher, mockClientMethodsUser } from "../../../test-utils";
import MatrixClientContext from "../../../../src/contexts/MatrixClientContext";

describe("<DevicesPanel />", () => {
    const userId = "@alice:server.org";

    // the local device
    const ownDevice = { device_id: "device_1" };

    // a device which we have verified via cross-signing
    const verifiedDevice = { device_id: "device_2" };

    // a device which we have *not* verified via cross-signing
    const unverifiedDevice = { device_id: "device_3" };

    // a device which is returned by `getDevices` but getDeviceVerificationStatus returns `null` for
    // (as it would for a device with no E2E keys).
    const nonCryptoDevice = { device_id: "non_crypto" };

    const mockCrypto = {
        getDeviceVerificationStatus: jest.fn().mockImplementation((_userId, deviceId) => {
            if (_userId !== userId) {
                throw new Error(`bad user id ${_userId}`);
            }
            if (deviceId === ownDevice.device_id || deviceId === verifiedDevice.device_id) {
                return { crossSigningVerified: true };
            } else if (deviceId === unverifiedDevice.device_id) {
                return {
                    crossSigningVerified: false,
                };
            } else {
                return null;
            }
        }),
    };
    const mockClient = getMockClientWithEventEmitter({
        ...mockClientMethodsUser(userId),
        getDevices: jest.fn(),
        getDeviceId: jest.fn().mockReturnValue(ownDevice.device_id),
        deleteMultipleDevices: jest.fn(),
        getStoredDevice: jest.fn().mockReturnValue(new DeviceInfo("id")),
        generateClientSecret: jest.fn(),
        getPushers: jest.fn(),
        setPusher: jest.fn(),
        getCrypto: jest.fn().mockReturnValue(mockCrypto),
    });

    const getComponent = () => (
        <MatrixClientContext.Provider value={mockClient}>
            <DevicesPanel />
        </MatrixClientContext.Provider>
    );

    beforeEach(() => {
        jest.clearAllMocks();

        mockClient.getDevices
            .mockReset()
            .mockResolvedValue({ devices: [ownDevice, verifiedDevice, unverifiedDevice, nonCryptoDevice] });

        mockClient.getPushers.mockReset().mockResolvedValue({
            pushers: [
                mkPusher({
                    [PUSHER_DEVICE_ID.name]: ownDevice.device_id,
                    [PUSHER_ENABLED.name]: true,
                }),
            ],
        });
    });

    it("renders device panel with devices", async () => {
        const { container } = render(getComponent());
        await flushPromises();
        expect(container).toMatchSnapshot();
    });

    describe("device deletion", () => {
        const interactiveAuthError = { httpStatus: 401, data: { flows: [{ stages: ["m.login.password"] }] } };

        const toggleDeviceSelection = (container: HTMLElement, deviceId: string) =>
            act(() => {
                const checkbox = container.querySelector(`#device-tile-checkbox-${deviceId}`)!;
                fireEvent.click(checkbox);
            });

        beforeEach(() => {
            mockClient.deleteMultipleDevices.mockReset();
        });

        it("deletes selected devices when interactive auth is not required", async () => {
            mockClient.deleteMultipleDevices.mockResolvedValue({});
            mockClient.getDevices
                .mockResolvedValueOnce({ devices: [ownDevice, verifiedDevice, unverifiedDevice] })
                // pretend it was really deleted on refresh
                .mockResolvedValueOnce({ devices: [ownDevice, unverifiedDevice] });

            const { container, getByTestId } = render(getComponent());
            await flushPromises();

            expect(container.getElementsByClassName("mx_DevicesPanel_device").length).toEqual(3);

            toggleDeviceSelection(container, verifiedDevice.device_id);

            mockClient.getDevices.mockClear();

            act(() => {
                fireEvent.click(getByTestId("sign-out-devices-btn"));
            });

            expect(container.getElementsByClassName("mx_Spinner").length).toBeTruthy();
            expect(mockClient.deleteMultipleDevices).toHaveBeenCalledWith([verifiedDevice.device_id], undefined);

            await flushPromises();

            // devices refreshed
            expect(mockClient.getDevices).toHaveBeenCalled();
            // and rerendered
            expect(container.getElementsByClassName("mx_DevicesPanel_device").length).toEqual(2);
        });

        it("deletes selected devices when interactive auth is required", async () => {
            mockClient.deleteMultipleDevices
                // require auth
                .mockRejectedValueOnce(interactiveAuthError)
                // then succeed
                .mockResolvedValueOnce({});

            mockClient.getDevices
                .mockResolvedValueOnce({ devices: [ownDevice, verifiedDevice, unverifiedDevice] })
                // pretend it was really deleted on refresh
                .mockResolvedValueOnce({ devices: [ownDevice, unverifiedDevice] });

            const { container, getByTestId, getByLabelText } = render(getComponent());

            await flushPromises();

            // reset mock count after initial load
            mockClient.getDevices.mockClear();

            toggleDeviceSelection(container, verifiedDevice.device_id);

            act(() => {
                fireEvent.click(getByTestId("sign-out-devices-btn"));
            });

            await flushPromises();
            // modal rendering has some weird sleeps
            await sleep(100);

            expect(mockClient.deleteMultipleDevices).toHaveBeenCalledWith([verifiedDevice.device_id], undefined);

            const modal = document.getElementsByClassName("mx_Dialog");
            expect(modal).toMatchSnapshot();

            // fill password and submit for interactive auth
            act(() => {
                fireEvent.change(getByLabelText("Password"), { target: { value: "topsecret" } });
                fireEvent.submit(getByLabelText("Password"));
            });

            await flushPromises();

            // called again with auth
            expect(mockClient.deleteMultipleDevices).toHaveBeenCalledWith([verifiedDevice.device_id], {
                identifier: {
                    type: "m.id.user",
                    user: userId,
                },
                password: "",
                type: "m.login.password",
                user: userId,
            });
            // devices refreshed
            expect(mockClient.getDevices).toHaveBeenCalled();
            // and rerendered
            expect(container.getElementsByClassName("mx_DevicesPanel_device").length).toEqual(2);
        });

        it("clears loading state when interactive auth fail is cancelled", async () => {
            mockClient.deleteMultipleDevices
                // require auth
                .mockRejectedValueOnce(interactiveAuthError)
                // then succeed
                .mockResolvedValueOnce({});

            mockClient.getDevices
                .mockResolvedValueOnce({ devices: [ownDevice, verifiedDevice, unverifiedDevice] })
                // pretend it was really deleted on refresh
                .mockResolvedValueOnce({ devices: [ownDevice, unverifiedDevice] });

            const { container, getByTestId } = render(getComponent());

            await flushPromises();

            // reset mock count after initial load
            mockClient.getDevices.mockClear();

            toggleDeviceSelection(container, verifiedDevice.device_id);

            act(() => {
                fireEvent.click(getByTestId("sign-out-devices-btn"));
            });

            expect(container.getElementsByClassName("mx_Spinner").length).toBeTruthy();

            await flushPromises();
            // modal rendering has some weird sleeps
            await sleep(20);

            // close the modal without submission
            act(() => {
                const modalCloseButton = document.querySelector('[aria-label="Close dialog"]')!;
                fireEvent.click(modalCloseButton);
            });

            await flushPromises();

            // not refreshed
            expect(mockClient.getDevices).not.toHaveBeenCalled();
            // spinner removed
            expect(container.getElementsByClassName("mx_Spinner").length).toBeFalsy();
        });
    });
});
