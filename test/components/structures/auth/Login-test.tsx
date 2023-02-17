/*
Copyright 2019 New Vector Ltd

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
import { fireEvent, render, screen, waitForElementToBeRemoved } from "@testing-library/react";
import { mocked, MockedObject } from "jest-mock";
import { createClient, MatrixClient } from "matrix-js-sdk/src/matrix";
import fetchMock from "fetch-mock-jest";
import { DELEGATED_OIDC_COMPATIBILITY, IdentityProviderBrand } from "matrix-js-sdk/src/@types/auth";

import SdkConfig from "../../../../src/SdkConfig";
import { mkServerConfig, mockPlatformPeg, unmockPlatformPeg } from "../../../test-utils";
import Login from "../../../../src/components/structures/auth/Login";
import BasePlatform from "../../../../src/BasePlatform";

jest.mock("matrix-js-sdk/src/matrix");

jest.useRealTimers();

describe("Login", function () {
    let platform: MockedObject<BasePlatform>;

    const mockClient = mocked({
        login: jest.fn().mockResolvedValue({}),
        loginFlows: jest.fn(),
    } as unknown as MatrixClient);

    beforeEach(function () {
        SdkConfig.put({
            brand: "test-brand",
            disable_custom_urls: true,
        });
        mockClient.login.mockClear().mockResolvedValue({});
        mockClient.loginFlows.mockClear().mockResolvedValue({ flows: [{ type: "m.login.password" }] });
        mocked(createClient).mockImplementation((opts) => {
            mockClient.idBaseUrl = opts.idBaseUrl;
            mockClient.baseUrl = opts.baseUrl;
            return mockClient;
        });
        fetchMock.get("https://matrix.org/_matrix/client/versions", {
            unstable_features: {},
            versions: [],
        });
        platform = mockPlatformPeg({
            startSingleSignOn: jest.fn(),
        });
    });

    afterEach(function () {
        fetchMock.restore();
        SdkConfig.unset(); // we touch the config, so clean up
        unmockPlatformPeg();
    });

    function getRawComponent(hsUrl = "https://matrix.org", isUrl = "https://vector.im") {
        return (
            <Login
                serverConfig={mkServerConfig(hsUrl, isUrl)}
                onLoggedIn={() => {}}
                onRegisterClick={() => {}}
                onServerConfigChange={() => {}}
            />
        );
    }

    function getComponent(hsUrl?: string, isUrl?: string) {
        return render(getRawComponent(hsUrl, isUrl));
    }

    it("should show form with change server link", async () => {
        SdkConfig.put({
            brand: "test-brand",
            disable_custom_urls: false,
        });
        const { container } = getComponent();
        await waitForElementToBeRemoved(() => screen.queryAllByLabelText("Loading…"));

        expect(container.querySelector("form")).toBeTruthy();

        expect(container.querySelector(".mx_ServerPicker_change")).toBeTruthy();
    });

    it("should show form without change server link when custom URLs disabled", async () => {
        const { container } = getComponent();
        await waitForElementToBeRemoved(() => screen.queryAllByLabelText("Loading…"));

        expect(container.querySelector("form")).toBeTruthy();
        expect(container.querySelectorAll(".mx_ServerPicker_change")).toHaveLength(0);
    });

    it("should show SSO button if that flow is available", async () => {
        mockClient.loginFlows.mockResolvedValue({ flows: [{ type: "m.login.sso" }] });

        const { container } = getComponent();
        await waitForElementToBeRemoved(() => screen.queryAllByLabelText("Loading…"));

        const ssoButton = container.querySelector(".mx_SSOButton");
        expect(ssoButton).toBeTruthy();
    });

    it("should show both SSO button and username+password if both are available", async () => {
        mockClient.loginFlows.mockResolvedValue({ flows: [{ type: "m.login.password" }, { type: "m.login.sso" }] });

        const { container } = getComponent();
        await waitForElementToBeRemoved(() => screen.queryAllByLabelText("Loading…"));

        expect(container.querySelector("form")).toBeTruthy();

        const ssoButton = container.querySelector(".mx_SSOButton");
        expect(ssoButton).toBeTruthy();
    });

    it("should show multiple SSO buttons if multiple identity_providers are available", async () => {
        mockClient.loginFlows.mockResolvedValue({
            flows: [
                {
                    type: "m.login.sso",
                    identity_providers: [
                        {
                            id: "a",
                            name: "Provider 1",
                        },
                        {
                            id: "b",
                            name: "Provider 2",
                        },
                        {
                            id: "c",
                            name: "Provider 3",
                        },
                    ],
                },
            ],
        });

        const { container } = getComponent();
        await waitForElementToBeRemoved(() => screen.queryAllByLabelText("Loading…"));

        const ssoButtons = container.querySelectorAll(".mx_SSOButton");
        expect(ssoButtons.length).toBe(3);
    });

    it("should show single SSO button if identity_providers is null", async () => {
        mockClient.loginFlows.mockResolvedValue({
            flows: [
                {
                    type: "m.login.sso",
                },
            ],
        });

        const { container } = getComponent();
        await waitForElementToBeRemoved(() => screen.queryAllByLabelText("Loading…"));

        const ssoButtons = container.querySelectorAll(".mx_SSOButton");
        expect(ssoButtons.length).toBe(1);
    });

    it("should handle serverConfig updates correctly", async () => {
        mockClient.loginFlows.mockResolvedValue({
            flows: [
                {
                    type: "m.login.sso",
                },
            ],
        });

        const { container, rerender } = render(getRawComponent());
        await waitForElementToBeRemoved(() => screen.queryAllByLabelText("Loading…"));

        fireEvent.click(container.querySelector(".mx_SSOButton")!);
        expect(platform.startSingleSignOn.mock.calls[0][0].baseUrl).toBe("https://matrix.org");

        fetchMock.get("https://server2/_matrix/client/versions", {
            unstable_features: {},
            versions: [],
        });
        rerender(getRawComponent("https://server2"));

        fireEvent.click(container.querySelector(".mx_SSOButton")!);
        expect(platform.startSingleSignOn.mock.calls[1][0].baseUrl).toBe("https://server2");
    });

    it("should show single Continue button if OIDC MSC3824 compatibility is given by server", async () => {
        mockClient.loginFlows.mockResolvedValue({
            flows: [
                {
                    type: "m.login.sso",
                    [DELEGATED_OIDC_COMPATIBILITY.name]: true,
                },
                {
                    type: "m.login.password",
                },
            ],
        });

        const { container } = getComponent();
        await waitForElementToBeRemoved(() => screen.queryAllByLabelText("Loading…"));

        const ssoButtons = container.querySelectorAll(".mx_SSOButton");

        expect(ssoButtons.length).toBe(1);
        expect(ssoButtons[0].textContent).toBe("Continue");

        // no password form visible
        expect(container.querySelector("form")).toBeFalsy();
    });

    it("should show branded SSO buttons", async () => {
        const idpsWithIcons = Object.values(IdentityProviderBrand).map((brand) => ({
            id: brand,
            brand,
            name: `Provider ${brand}`,
        }));

        mockClient.loginFlows.mockResolvedValue({
            flows: [
                {
                    type: "m.login.sso",
                    identity_providers: [
                        ...idpsWithIcons,
                        {
                            id: "foo",
                            name: "Provider foo",
                        },
                    ],
                },
            ],
        });

        const { container } = getComponent();
        await waitForElementToBeRemoved(() => screen.queryAllByLabelText("Loading…"));

        for (const idp of idpsWithIcons) {
            const ssoButton = container.querySelector(`.mx_SSOButton.mx_SSOButton_brand_${idp.brand}`);
            expect(ssoButton).toBeTruthy();
            expect(ssoButton?.querySelector(`img[alt="${idp.brand}"]`)).toBeTruthy();
        }

        const ssoButtons = container.querySelectorAll(".mx_SSOButton");
        expect(ssoButtons.length).toBe(idpsWithIcons.length + 1);
    });
});
