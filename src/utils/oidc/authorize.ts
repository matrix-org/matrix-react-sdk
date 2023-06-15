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

import { logger } from "matrix-js-sdk/src/logger";
import { randomString } from "matrix-js-sdk/src/randomstring";

import { ValidatedServerConfig } from "../ValidatedServerConfig";

type AuthorizationParams = {
    state: string;
    scope: string;
    redirectUri: string;
    nonce?: string;
    codeVerifier?: string;
};

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

/**
 * Store authorization params for retrieval when returning from OIDC OP
 * @param { AuthorizationParams } authorizationParams
 * @param { ValidatedServerConfig["delegatedAuthentication"] } delegatedAuthConfig used for future interactions with OP
 * @param clientId this client's id as registered with configured issuer
 * @param homeserver target homeserver
 */
const storeAuthorizationParams = async (
    { redirectUri, state, nonce, codeVerifier }: AuthorizationParams,
    { issuer }: ValidatedServerConfig["delegatedAuthentication"],
    clientId: string,
    homeserver: string,
): Promise<void> => {
    window.sessionStorage.setItem(`oidc_${state}_nonce`, nonce);
    window.sessionStorage.setItem(`oidc_${state}_redirectUri`, redirectUri);
    window.sessionStorage.setItem(`oidc_${state}_codeVerifier`, codeVerifier);
    window.sessionStorage.setItem(`oidc_${state}_clientId`, clientId);
    window.sessionStorage.setItem(`oidc_${state}_issuer`, issuer);
    window.sessionStorage.setItem(`oidc_${state}_homeserver`, homeserver);
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
    url.searchParams.append("response_mode", "fragment");
    url.searchParams.append("response_type", "code");
    url.searchParams.append("redirect_uri", redirectUri);
    url.searchParams.append("client_id", clientId);
    url.searchParams.append("state", state);
    url.searchParams.append("scope", scope);
    url.searchParams.append("nonce", nonce);

    url.searchParams.append("code_challenge_method", "S256");
    url.searchParams.append("code_challenge", await generateCodeChallenge(codeVerifier));

    return url.toString();
};

/**
 * Start OIDC authorization code flow
 * Navigates to configured authorization endpoint
 * @param delegatedAuthConfig from discovery
 * @param clientId this client's id as registered with configured issuer
 * @param homeserver target homeserver
 */
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
