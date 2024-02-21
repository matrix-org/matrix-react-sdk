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

import { AutoDiscovery, AutoDiscoveryAction, ClientConfig } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import AutoDiscoveryUtils from "../../src/utils/AutoDiscoveryUtils";

describe("AutoDiscoveryUtils", () => {
    describe("buildValidatedConfigFromDiscovery()", () => {
        const serverName = "my-server";

        beforeEach(() => {
            // don't litter console with expected errors
            jest.spyOn(logger, "error")
                .mockClear()
                .mockImplementation(() => {});
        });

        afterAll(() => {
            jest.spyOn(logger, "error").mockRestore();
        });

        const validIsConfig = {
            "m.identity_server": {
                state: AutoDiscoveryAction.SUCCESS,
                base_url: "identity.com",
            },
        };
        const validHsConfig = {
            "m.homeserver": {
                state: AutoDiscoveryAction.SUCCESS,
                base_url: "https://matrix.org",
            },
        };

        const expectedValidatedConfig = {
            hsName: serverName,
            hsNameIsDifferent: true,
            hsUrl: "https://matrix.org",
            isDefault: false,
            isNameResolvable: true,
            isUrl: "identity.com",
        };

        it("throws an error when discovery result is falsy", async () => {
            await expect(() =>
                AutoDiscoveryUtils.buildValidatedConfigFromDiscovery(serverName, undefined as any),
            ).rejects.toThrow("Unexpected error resolving homeserver configuration");
            expect(logger.error).toHaveBeenCalled();
        });

        it("throws an error when discovery result does not include homeserver config", async () => {
            const discoveryResult = {
                ...validIsConfig,
            } as unknown as ClientConfig;
            await expect(() =>
                AutoDiscoveryUtils.buildValidatedConfigFromDiscovery(serverName, discoveryResult),
            ).rejects.toThrow("Unexpected error resolving homeserver configuration");
            expect(logger.error).toHaveBeenCalled();
        });

        it("throws an error when identity server config has fail error and recognised error string", async () => {
            const discoveryResult = {
                ...validHsConfig,
                "m.identity_server": {
                    state: AutoDiscoveryAction.FAIL_ERROR,
                    error: "GenericFailure",
                },
            };
            await expect(() =>
                AutoDiscoveryUtils.buildValidatedConfigFromDiscovery(serverName, discoveryResult),
            ).rejects.toThrow("Unexpected error resolving identity server configuration");
            expect(logger.error).toHaveBeenCalled();
        });

        it("throws an error when homeserver config has fail error and recognised error string", async () => {
            const discoveryResult = {
                ...validIsConfig,
                "m.homeserver": {
                    state: AutoDiscoveryAction.FAIL_ERROR,
                    error: AutoDiscovery.ERROR_INVALID_HOMESERVER,
                },
            };
            await expect(() =>
                AutoDiscoveryUtils.buildValidatedConfigFromDiscovery(serverName, discoveryResult),
            ).rejects.toThrow("Homeserver URL does not appear to be a valid Matrix homeserver");
            expect(logger.error).toHaveBeenCalled();
        });

        it("throws an error with fallback message identity server config has fail error", async () => {
            const discoveryResult = {
                ...validHsConfig,
                "m.identity_server": {
                    state: AutoDiscoveryAction.FAIL_ERROR,
                },
            };
            await expect(() =>
                AutoDiscoveryUtils.buildValidatedConfigFromDiscovery(serverName, discoveryResult),
            ).rejects.toThrow("Unexpected error resolving identity server configuration");
        });

        it("throws an error when error is ERROR_INVALID_HOMESERVER", async () => {
            const discoveryResult = {
                ...validIsConfig,
                "m.homeserver": {
                    state: AutoDiscoveryAction.FAIL_ERROR,
                    error: AutoDiscovery.ERROR_INVALID_HOMESERVER,
                },
            };
            await expect(() =>
                AutoDiscoveryUtils.buildValidatedConfigFromDiscovery(serverName, discoveryResult),
            ).rejects.toThrow("Homeserver URL does not appear to be a valid Matrix homeserver");
        });

        it("throws an error when homeserver base_url is falsy", async () => {
            const discoveryResult = {
                ...validIsConfig,
                "m.homeserver": {
                    state: AutoDiscoveryAction.SUCCESS,
                    base_url: "",
                },
            };
            await expect(() =>
                AutoDiscoveryUtils.buildValidatedConfigFromDiscovery(serverName, discoveryResult),
            ).rejects.toThrow("Unexpected error resolving homeserver configuration");
            expect(logger.error).toHaveBeenCalledWith("No homeserver URL configured");
        });

        it("throws an error when homeserver base_url is not a valid URL", async () => {
            const discoveryResult = {
                ...validIsConfig,
                "m.homeserver": {
                    state: AutoDiscoveryAction.SUCCESS,
                    base_url: "banana",
                },
            };
            await expect(() =>
                AutoDiscoveryUtils.buildValidatedConfigFromDiscovery(serverName, discoveryResult),
            ).rejects.toThrow("Invalid URL: banana");
        });

        it("uses hs url hostname when serverName is falsy in args and config", async () => {
            const discoveryResult = {
                ...validIsConfig,
                ...validHsConfig,
            };
            await expect(AutoDiscoveryUtils.buildValidatedConfigFromDiscovery("", discoveryResult)).resolves.toEqual({
                ...expectedValidatedConfig,
                hsNameIsDifferent: false,
                hsName: "matrix.org",
            });
        });

        it("uses serverName from props", async () => {
            const discoveryResult = {
                ...validIsConfig,
                "m.homeserver": {
                    ...validHsConfig["m.homeserver"],
                    server_name: "should not use this name",
                },
            };
            const syntaxOnly = true;
            await expect(
                AutoDiscoveryUtils.buildValidatedConfigFromDiscovery(serverName, discoveryResult, syntaxOnly),
            ).resolves.toEqual({
                ...expectedValidatedConfig,
                hsNameIsDifferent: true,
                hsName: serverName,
            });
        });

        it("ignores liveliness error when checking syntax only", async () => {
            const discoveryResult = {
                ...validIsConfig,
                "m.homeserver": {
                    ...validHsConfig["m.homeserver"],
                    state: AutoDiscoveryAction.FAIL_ERROR,
                    error: AutoDiscovery.ERROR_INVALID_HOMESERVER,
                },
            };
            const syntaxOnly = true;
            await expect(
                AutoDiscoveryUtils.buildValidatedConfigFromDiscovery(serverName, discoveryResult, syntaxOnly),
            ).resolves.toEqual({
                ...expectedValidatedConfig,
                warning: "Homeserver URL does not appear to be a valid Matrix homeserver",
            });
        });

        it("handles homeserver too old error", async () => {
            const discoveryResult: ClientConfig = {
                ...validIsConfig,
                "m.homeserver": {
                    state: AutoDiscoveryAction.FAIL_ERROR,
                    error: AutoDiscovery.ERROR_HOMESERVER_TOO_OLD,
                    base_url: "https://matrix.org",
                },
            };
            const syntaxOnly = true;
            await expect(() =>
                AutoDiscoveryUtils.buildValidatedConfigFromDiscovery(serverName, discoveryResult, syntaxOnly),
            ).rejects.toThrow(
                "Your homeserver is too old and does not support the minimum API version required. Please contact your server owner, or upgrade your server.",
            );
        });
    });

    describe("authComponentStateForError", () => {
        const error = new Error("TEST");

        it("should return expected error for the registration page", () => {
            expect(AutoDiscoveryUtils.authComponentStateForError(error, "register")).toMatchSnapshot();
        });
    });
});
