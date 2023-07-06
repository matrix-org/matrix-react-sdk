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

import fetchMock from "fetch-mock-jest";
import { Method } from "matrix-js-sdk/src/http-api";
import { generateAuthorizationParams } from "matrix-js-sdk/src/oidc/authorize";
import * as randomStringUtils from "matrix-js-sdk/src/randomstring";
import * as OidcValidation from "matrix-js-sdk/src/oidc/validate";

import { completeOidcLogin, startOidcLogin } from "../../../src/utils/oidc/authorize";
import { makeDelegatedAuthConfig, mockOpenIdConfiguration } from "../../test-utils/oidc";

describe("OIDC authorization", () => {
    const issuer = "https://auth.com/";
    const homeserver = "https://matrix.org";
    const identityServerUrl = "https://is.org";
    const clientId = "xyz789";
    const baseUrl = "https://test.com";

    const delegatedAuthConfig = makeDelegatedAuthConfig(issuer);

    const sessionStorageSetSpy = jest.spyOn(sessionStorage.__proto__, "setItem").mockReturnValue(undefined);
    const sessionStorageGetSpy = jest.spyOn(sessionStorage.__proto__, "getItem").mockReturnValue(undefined);

    const randomStringMockImpl = (length: number) => new Array(length).fill("x").join("");

    // to restore later
    const realWindowLocation = window.location;

    beforeEach(() => {
        fetchMock.mockClear();
        fetchMock.resetBehavior();

        sessionStorageSetSpy.mockClear();
        sessionStorageGetSpy.mockReset();

        // @ts-ignore allow delete of non-optional prop
        delete window.location;
        // @ts-ignore ugly mocking
        window.location = {
            href: baseUrl,
            origin: baseUrl,
        };

        fetchMockJest.get(
            delegatedAuthConfig.metadata.issuer + ".well-known/openid-configuration",
            mockOpenIdConfiguration(),
        );
        jest.spyOn(randomStringUtils, "randomString").mockRestore();

        // annoying to mock jwt decoding used in validateIdToken
        jest.spyOn(OidcValidation, "validateIdToken")
            .mockClear()
            .mockImplementation(() => {});
    });

    afterAll(() => {
        window.location = realWindowLocation;
    });

    describe("startOidcLogin()", () => {
        it("should store authorization params in session storage", async () => {
            jest.spyOn(randomStringUtils, "randomString").mockReset().mockImplementation(randomStringMockImpl);
            await startOidcLogin(delegatedAuthConfig, clientId, homeserver);

            const state = randomStringUtils.randomString(8);

            expect(sessionStorageSetSpy).toHaveBeenCalledWith(`oidc_${state}_nonce`, randomStringUtils.randomString(8));
            expect(sessionStorageSetSpy).toHaveBeenCalledWith(`oidc_${state}_redirectUri`, baseUrl);
            expect(sessionStorageSetSpy).toHaveBeenCalledWith(
                `oidc_${state}_issuer`,
                delegatedAuthConfig.issuer,
            );
            expect(sessionStorageSetSpy).toHaveBeenCalledWith(`oidc_${state}_clientId`, clientId);
            expect(sessionStorageSetSpy).toHaveBeenCalledWith(`oidc_${state}_homeserverUrl`, homeserver);
        });

        it("navigates to authorization endpoint with correct parameters", async () => {
            await startOidcLogin(delegatedAuthConfig, clientId, homeserver);

            const expectedScopeWithoutDeviceId = `openid urn:matrix:org.matrix.msc2967.client:api:* urn:matrix:org.matrix.msc2967.client:device:`;

            const authUrl = new URL(window.location.href);

            expect(authUrl.searchParams.get("response_mode")).toEqual("query");
            expect(authUrl.searchParams.get("response_type")).toEqual("code");
            expect(authUrl.searchParams.get("client_id")).toEqual(clientId);
            expect(authUrl.searchParams.get("code_challenge_method")).toEqual("S256");

            // scope ends with a 10char randomstring deviceId
            const scope = authUrl.searchParams.get("scope");
            expect(scope.substring(0, scope.length - 10)).toEqual(expectedScopeWithoutDeviceId);
            expect(scope.substring(scope.length - 10)).toBeTruthy();

            // random string, just check they are set
            expect(authUrl.searchParams.has("state")).toBeTruthy();
            expect(authUrl.searchParams.has("nonce")).toBeTruthy();
            expect(authUrl.searchParams.has("code_challenge")).toBeTruthy();
        });
    });

    describe("completeOidcLogin()", () => {
        const authorizationParams = generateAuthorizationParams({ redirectUri: baseUrl });
        const storedAuthorizationParams = {
            nonce: authorizationParams.nonce,
            redirectUri: baseUrl,
            codeVerifier: authorizationParams.codeVerifier,
            clientId,
            homeserverUrl: homeserver,
            identityServerUrl: identityServerUrl,
            delegatedAuthConfig: JSON.stringify(delegatedAuthConfig),
        };
        const code = "test-code-777";
        const queryDict = {
            code,
            state: authorizationParams.state,
        };
        const validBearerTokenResponse = {
            token_type: "Bearer",
            access_token: "test_access_token",
            refresh_token: "test_refresh_token",
            expires_in: 12345,
        };

        beforeEach(() => {
            sessionStorageGetSpy.mockImplementation((key: string) => {
                const itemKey = key.split(`oidc_${authorizationParams.state}_`).pop();
                return storedAuthorizationParams[itemKey] || null;
            });

            fetchMock.post(delegatedAuthConfig.tokenEndpoint, {
                status: 200,
                body: validBearerTokenResponse,
            });
        });

        it("should throw when query params do not include state and code", async () => {
            expect(async () => await completeOidcLogin({})).rejects.toThrow(
                "Invalid query parameters for OIDC native login. `code` and `state` are required.",
            );
        });

        it("should throw when authorization params are not found in session storage", async () => {
            const queryDict = {
                code: "abc123",
                state: "not-the-same-state-we-put-things-in-local-storage-with",
            };

            expect(async () => await completeOidcLogin(queryDict)).rejects.toThrow(
                "Cannot complete OIDC login: required properties not found in session storage",
            );
            // tried to retreive using state as part of storage key
            expect(sessionStorageGetSpy).toHaveBeenCalledWith(`oidc_${queryDict.state}_nonce`);
        });

        it("should make request to token endpoint", async () => {
            await completeOidcLogin(queryDict);

            expect(fetchMock).toHaveBeenCalledWith(delegatedAuthConfig.tokenEndpoint, {
                method: Method.Post,
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `grant_type=authorization_code&client_id=${clientId}&code_verifier=${authorizationParams.codeVerifier}&redirect_uri=https%3A%2F%2Ftest.com&code=${code}`,
            });
        });

        it("should return accessToken, configured homeserver and identityServer", async () => {
            const result = await completeOidcLogin(queryDict);

            expect(result).toEqual({
                accessToken: validBearerTokenResponse.access_token,
                homeserverUrl: homeserver,
                identityServerUrl,
            });
        });

        it("should handle when no identityServer is stored in session storage", async () => {
            // session storage mock without identity server stored
            const { identityServerUrl: _excludingThis, ...storedParamsWithoutIs } = storedAuthorizationParams;
            sessionStorageGetSpy.mockImplementation((key: string) => {
                const itemKey = key.split(`oidc_${authorizationParams.state}_`).pop();
                return storedParamsWithoutIs[itemKey] || null;
            });
            const result = await completeOidcLogin(queryDict);

            expect(result).toEqual({
                accessToken: validBearerTokenResponse.access_token,
                homeserverUrl: homeserver,
                identityServerUrl: undefined,
            });
        });
    });
});
