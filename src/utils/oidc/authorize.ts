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

import { Method } from "matrix-js-sdk/src/http-api";
import { logger } from "matrix-js-sdk/src/logger";
import { randomString } from "matrix-js-sdk/src/randomstring";
import { QueryDict } from "matrix-js-sdk/src/utils";

import { ValidatedServerConfig } from "../ValidatedServerConfig";
import { OidcClientError } from "./error";

type AuthorizationParams = {
    state: string;
    scope: string;
    redirectUri: string;
    nonce: string;
    codeVerifier: string;
};

type BearerToken = {
    token_type: "Bearer";
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    id_token?: string;
};
const isValidBearerToken = (t: any): t is BearerToken =>
    typeof t == "object" &&
    t["token_type"] === "Bearer" &&
    typeof t["access_token"] === "string" &&
    (!("refresh_token" in t) || typeof t["refresh_token"] === "string") &&
    (!("expires_in" in t) || typeof t["expires_in"] === "number");

const generateScope = (existingDeviceId?: string): string => {
    const deviceId = existingDeviceId || randomString(10);
    return `openid urn:matrix:org.matrix.msc2967.client:api:* urn:matrix:org.matrix.msc2967.client:device:${deviceId}`;
};

// https://www.rfc-editor.org/rfc/rfc7636
const generateCodeChallenge = async (codeVerifier: string): Promise<string> => {
    if (!window.crypto || !window.crypto.subtle) {
        // @TODO(kerrya) should this be allowed? configurable?
        logger.warn("A secure context is required to generate code challenge. Using plain text code challenge");
        return codeVerifier;
    }
    const utf8 = new TextEncoder().encode(codeVerifier);

    const digest = await crypto.subtle.digest("SHA-256", utf8);

    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
};

const storeAuthorizationParams = (
    { redirectUri, state, nonce, codeVerifier }: AuthorizationParams,
    delegatedAuthConfig: ValidatedServerConfig["delegatedAuthentication"],
    clientId: string,
    homeserver: string,
): void => {
    window.sessionStorage.setItem(`oidc_${state}_nonce`, nonce);
    window.sessionStorage.setItem(`oidc_${state}_redirectUri`, redirectUri);
    window.sessionStorage.setItem(`oidc_${state}_codeVerifier`, codeVerifier);
    window.sessionStorage.setItem(`oidc_${state}_clientId`, clientId);
    window.sessionStorage.setItem(`oidc_${state}_homeserver`, homeserver);
    window.sessionStorage.setItem(`oidc_${state}_delegatedAuthConfig`, JSON.stringify(delegatedAuthConfig));
};

type StoredAuthorizationParams = Omit<AuthorizationParams, "state" | "scope"> & {
    delegatedAuthConfig: ValidatedServerConfig["delegatedAuthentication"];
    clientId: string;
    homeserver: string;
};
const retrieveAuthorizationParams = (state: string): StoredAuthorizationParams => {
    const nonce = window.sessionStorage.getItem(`oidc_${state}_nonce`);
    const redirectUri = window.sessionStorage.getItem(`oidc_${state}_redirectUri`);
    const codeVerifier = window.sessionStorage.getItem(`oidc_${state}_codeVerifier`);
    const clientId = window.sessionStorage.getItem(`oidc_${state}_clientId`);
    const homeserver = window.sessionStorage.getItem(`oidc_${state}_homeserver`);
    const delegatedAuthConfig = JSON.parse(window.sessionStorage.getItem(`oidc_${state}_delegatedAuthConfig`));

    return {
        nonce,
        redirectUri,
        codeVerifier,
        clientId,
        homeserver,
        delegatedAuthConfig,
    };
};

const generateAuthorizationParams = ({
    deviceId,
    redirectUri,
}: {
    deviceId?: string;
    redirectUri: string;
}): AuthorizationParams => ({
    scope: generateScope(deviceId),
    redirectUri,
    state: randomString(8),
    nonce: randomString(8),
    codeVerifier: randomString(64), // https://tools.ietf.org/html/rfc7636#section-4.1 length needs to be 43-128 characters
});

const generateAuthorizationUrl = async (
    authorizationUrl: string,
    clientId: string,
    { scope, redirectUri, state, nonce, codeVerifier }: AuthorizationParams,
): Promise<string> => {
    const url = new URL(authorizationUrl);
    url.searchParams.append("response_mode", "query");
    url.searchParams.append("response_type", "code");
    url.searchParams.append("redirect_uri", redirectUri);
    url.searchParams.append("client_id", clientId);
    url.searchParams.append("state", state);
    url.searchParams.append("scope", scope);
    if (nonce) {
        url.searchParams.append("nonce", nonce);
    }

    if (codeVerifier) {
        url.searchParams.append("code_challenge_method", "S256");
        url.searchParams.append("code_challenge", await generateCodeChallenge(codeVerifier));
    }

    return url.toString();
};

export const startOidcLogin = async (
    delegatedAuthConfig: ValidatedServerConfig["delegatedAuthentication"],
    clientId: string,
    homeserver: string,
): Promise<void> => {
    // TODO(kerrya) afterloginfragment
    const redirectUri = window.location.origin;
    const authParams = generateAuthorizationParams({ redirectUri });

    storeAuthorizationParams(authParams, delegatedAuthConfig, clientId, homeserver);

    const authorizationUrl = await generateAuthorizationUrl(
        delegatedAuthConfig.authorizationEndpoint,
        clientId,
        authParams,
    );

    window.location.href = authorizationUrl;
};

/**
 * Gets `code` and `state` query params
 *
 * @param queryParams
 * @returns code and state
 * @throws when code and state are not valid strings
 */
const getCodeAndStateFromQueryParams = (queryParams: QueryDict): { code: string; state: string } => {
    const code = queryParams["code"];
    const state = queryParams["state"];

    if (!code || typeof code !== "string" || !state || typeof state !== "string") {
        throw new Error("TODO(kerrya) Invalid query parameters. `code` and `state` are required.");
    }
    return { code, state };
};

/**
 * Attempts to exchange authorization code for bearer token
 * @param code authorization code as returned by OP during authorization
 * @param { StoredAuthorizationParams } storedAuthorizationParams stored params from start of oidc login flow
 * @returns {BearerToken} valid bearer token
 * @throws when request fails, or returned token is invalid
 */
const completeAuthorizationCodeGrant = async (
    code: string,
    { clientId, codeVerifier, redirectUri, delegatedAuthConfig }: StoredAuthorizationParams,
): Promise<BearerToken> => {
    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("client_id", clientId);
    params.append("code_verifier", codeVerifier);
    params.append("redirect_uri", redirectUri);
    params.append("code", code);
    const metadata = params.toString();

    const headers = { "Content-Type": "application/x-www-form-urlencoded" };

    const response = await fetch(delegatedAuthConfig.tokenEndpoint, {
        method: Method.Post,
        headers,
        body: metadata,
    });

    if (response.status >= 400) {
        throw new Error(OidcClientError.CodeExchangeFailed);
    }

    const token = await response.json();

    if (isValidBearerToken(token)) {
        return token;
    }

    throw new Error(OidcClientError.InvalidBearerToken);
};

/**
 * Attempt to complete authorization code flow to login
 * @param {QueryDict} queryParams the query-parameters extracted from the real query-string of the starting URI.
 * @returns {Promise<void>} Promise that resolves when login was successful
 * @throws When login failed
 */
export const completeOidcLogin = async (queryParams: QueryDict): Promise<void> => {
    const { code, state } = getCodeAndStateFromQueryParams(queryParams);

    const storedAuthorizationParams = retrieveAuthorizationParams(state);

    await completeAuthorizationCodeGrant(code, storedAuthorizationParams);

    logger.debug("Got a valid token");

    // TODO(kerrya) use the token somewhere :-)
    throw new Error("OIDC login not fully implemented.")
};
