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
import { fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";

import SecurityUserSettingsTab from "../../../../../../src/components/views/settings/tabs/user/SecurityUserSettingsTab";
import MatrixClientContext from "../../../../../../src/contexts/MatrixClientContext";
import SettingsStore from "../../../../../../src/settings/SettingsStore";
import { UIFeature } from "../../../../../../src/settings/UIFeature";
import {
    getMockClientWithEventEmitter,
    mockClientMethodsServer,
    mockClientMethodsUser,
    mockClientMethodsCrypto,
    mockClientMethodsDevice,
    mockPlatformPeg,
    flushPromises,
} from "../../../../../test-utils";

describe("<SecurityUserSettingsTab />", () => {
    const defaultProps = {
        closeSettingsFn: jest.fn(),
    };

    const userId = "@alice:server.org";
    const deviceId = "alices-device";
    const mockClient = getMockClientWithEventEmitter({
        ...mockClientMethodsUser(userId),
        ...mockClientMethodsServer(),
        ...mockClientMethodsDevice(deviceId),
        ...mockClientMethodsCrypto(),
        getRooms: jest.fn().mockReturnValue([]),
        getIgnoredUsers: jest.fn(),
        setIgnoredUsers: jest.fn(),
        getVersions: jest.fn().mockResolvedValue({
            unstable_features: {
                "org.matrix.msc3882": true,
                "org.matrix.msc3886": true,
            },
        }),
    });

    const getComponent = () => (
        <MatrixClientContext.Provider value={mockClient}>
            <SecurityUserSettingsTab {...defaultProps} />
        </MatrixClientContext.Provider>
    );

    const settingsValueSpy = jest.spyOn(SettingsStore, "getValue");

    beforeEach(() => {
        mockPlatformPeg();
        jest.clearAllMocks();
        settingsValueSpy.mockReturnValue(false);
        mockClient.getIgnoredUsers.mockReturnValue([]);
    });

    it("renders sessions section when new session manager is disabled", () => {
        settingsValueSpy.mockReturnValue(false);
        const { getByTestId } = render(getComponent());

        expect(getByTestId("devices-section")).toBeTruthy();
    });

    it("does not render sessions section when new session manager is enabled", () => {
        settingsValueSpy.mockReturnValue(true);
        const { queryByTestId } = render(getComponent());

        expect(queryByTestId("devices-section")).toBeFalsy();
    });

    it("renders qr code login section", async () => {
        const { getByText } = render(getComponent());

        // wait for versions call to settle
        await flushPromises();

        expect(getByText("Sign in with QR code")).toBeTruthy();
    });

    it("enters qr code login section when show QR code button clicked", async () => {
        const { getByText, getByTestId } = render(getComponent());
        // wait for versions call to settle
        await flushPromises();

        fireEvent.click(getByText("Show QR code"));

        expect(getByTestId("login-with-qr")).toBeTruthy();
    });

    describe("ignored users", () => {
        const bert = "@bert:sesame.org";
        const ernie = "@ernie:sesame.org";

        beforeEach(() => {
            mockClient.getIgnoredUsers.mockReturnValue([bert, ernie]);
            settingsValueSpy.mockImplementation((settingName) => settingName === UIFeature.AdvancedSettings);
        });

        it("does not render ignored users section when advanced settings not enabled", () => {
            settingsValueSpy.mockReturnValue(false);
            render(getComponent());

            expect(screen.queryByText("Ignored users")).not.toBeInTheDocument();
        });

        it("renders empty ignored users section", () => {
            mockClient.getIgnoredUsers.mockReturnValue([]);

            render(getComponent());

            expect(screen.getByText("Ignored users")).toBeInTheDocument();
            expect(screen.getByText("You have no ignored users.")).toBeInTheDocument();
        });

        it("renders ignored users section", () => {
            render(getComponent());

            const section = screen.getByTestId("ignored-users-section");
            expect(within(section).getByText(bert)).toBeInTheDocument();
            expect(within(section).getByText(ernie)).toBeInTheDocument();
        });

        it("unignores a user", () => {
            render(getComponent());

            fireEvent.click(screen.getByTestId(`mx_SecurityUserSettingsTab_ignoredUser_${ernie}_button`));

            // ernie removed
            expect(mockClient.setIgnoredUsers).toHaveBeenCalledWith([bert]);

            // disabled while loading
            expect(screen.getByTestId(`mx_SecurityUserSettingsTab_ignoredUser_${ernie}_button`)).toHaveAttribute(
                "disabled",
            );
        });
    });
});
