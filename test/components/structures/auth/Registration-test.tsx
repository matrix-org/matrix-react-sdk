/*
Copyright 2019 New Vector Ltd
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
import { fireEvent, render, screen, waitForElementToBeRemoved } from "@testing-library/react";
import { createClient, MatrixClient, MatrixError, OidcClientConfig } from "matrix-js-sdk/src/matrix";
import { mocked, MockedObject } from "jest-mock";
import fetchMock from "fetch-mock-jest";

import SdkConfig, { DEFAULTS } from "../../../../src/SdkConfig";
import { getMockClientWithEventEmitter, mkServerConfig, mockPlatformPeg, unmockPlatformPeg } from "../../../test-utils";
import Registration from "../../../../src/components/structures/auth/Registration";

jest.mock("../../../../src/utils/oidc/authorize", () => ({
    startOidcLogin: jest.fn(),
}));

jest.mock("matrix-js-sdk/src/matrix", () => ({
    ...jest.requireActual("matrix-js-sdk/src/matrix"),
    createClient: jest.fn(),
}));
jest.useFakeTimers();

/** The matrix versions our mock server claims to support */
const SERVER_SUPPORTED_MATRIX_VERSIONS = ["v1.1", "v1.5", "v1.6", "v1.8", "v1.9"];

describe("Registration", function () {
    let mockClient!: MockedObject<MatrixClient>;

    beforeEach(function () {
        SdkConfig.put({
            ...DEFAULTS,
            disable_custom_urls: true,
        });
        mockClient = getMockClientWithEventEmitter({
            registerRequest: jest.fn(),
            loginFlows: jest.fn(),
            getVersions: jest.fn().mockResolvedValue({ versions: SERVER_SUPPORTED_MATRIX_VERSIONS }),
        });
        mockClient.registerRequest.mockRejectedValueOnce(
            new MatrixError(
                {
                    flows: [{ stages: [] }],
                },
                401,
            ),
        );
        mockClient.loginFlows.mockResolvedValue({ flows: [{ type: "m.login.password" }] });
        mocked(createClient).mockImplementation((opts) => {
            mockClient.idBaseUrl = opts.idBaseUrl;
            mockClient.baseUrl = opts.baseUrl;
            return mockClient;
        });
        fetchMock.catch(404);
        fetchMock.get("https://matrix.org/_matrix/client/versions", {
            unstable_features: {},
            versions: SERVER_SUPPORTED_MATRIX_VERSIONS,
        });
        mockPlatformPeg({
            startSingleSignOn: jest.fn(),
        });
    });

    afterEach(function () {
        jest.restoreAllMocks();
        fetchMock.restore();
        SdkConfig.reset(); // we touch the config, so clean up
        unmockPlatformPeg();
    });

    const defaultProps = {
        defaultDeviceDisplayName: "test-device-display-name",
        onLoggedIn: jest.fn(),
        onLoginClick: jest.fn(),
        onServerConfigChange: jest.fn(),
    };

    const defaultHsUrl = "https://matrix.org";
    const defaultIsUrl = "https://vector.im";

    function getRawComponent(hsUrl = defaultHsUrl, isUrl = defaultIsUrl, authConfig?: OidcClientConfig) {
        return <Registration {...defaultProps} serverConfig={mkServerConfig(hsUrl, isUrl, authConfig)} />;
    }

    function getComponent(hsUrl?: string, isUrl?: string, authConfig?: OidcClientConfig) {
        return render(getRawComponent(hsUrl, isUrl, authConfig));
    }

    it("should show server picker", async function () {
        const { container } = getComponent();
        expect(container.querySelector(".mx_ServerPicker")).toBeTruthy();
    });

    it("should show form when custom URLs disabled", async function () {
        const { container } = getComponent();
        await waitForElementToBeRemoved(() => screen.queryAllByLabelText("Loading…"));
        expect(container.querySelector("form")).toBeTruthy();
    });

    it("should show SSO options if those are available", async () => {
        mockClient.loginFlows.mockClear().mockResolvedValue({ flows: [{ type: "m.login.sso" }] });
        const { container } = getComponent();
        await waitForElementToBeRemoved(() => screen.queryAllByLabelText("Loading…"));

        const ssoButton = container.querySelector(".mx_SSOButton");
        expect(ssoButton).toBeTruthy();
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
        expect(mockClient.baseUrl).toBe("https://matrix.org");

        fetchMock.get("https://server2/_matrix/client/versions", {
            unstable_features: {},
            versions: SERVER_SUPPORTED_MATRIX_VERSIONS,
        });
        rerender(getRawComponent("https://server2"));
        await waitForElementToBeRemoved(() => screen.queryAllByLabelText("Loading…"));

        fireEvent.click(container.querySelector(".mx_SSOButton")!);
        expect(mockClient.baseUrl).toBe("https://server2");
    });
});
