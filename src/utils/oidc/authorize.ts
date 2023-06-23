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
import {
    generateAuthorizationParams,
    generateAuthorizationUrl,
    completeAuthorizationCodeGrant,
} from "matrix-js-sdk/src/oidc/authorize";
import { QueryDict } from "matrix-js-sdk/src/utils";

import { ValidatedDelegatedAuthConfig } from "../ValidatedServerConfig";

/**
 * Store authorization params for retrieval when returning from OIDC OP
 * @param { AuthorizationParams } authorizationParams
 * @param { ValidatedServerConfig["delegatedAuthentication"] } delegatedAuthConfig used for future interactions with OP
 * @param clientId this client's id as registered with configured issuer
 * @param homeserver target homeserver
 */
const storeAuthorizationParams = (
    { redirectUri, state, nonce, codeVerifier }: ReturnType<typeof generateAuthorizationParams>,
    delegatedAuthConfig: ValidatedDelegatedAuthConfig,
    clientId: string,
    homeserver: string,
): void => {
    window.sessionStorage.setItem(`oidc_${state}_nonce`, nonce);
    window.sessionStorage.setItem(`oidc_${state}_redirectUri`, redirectUri);
    window.sessionStorage.setItem(`oidc_${state}_codeVerifier`, codeVerifier);
    window.sessionStorage.setItem(`oidc_${state}_homeserver`, homeserver);
    window.sessionStorage.setItem(`oidc_${state}_clientId`, clientId);
    window.sessionStorage.setItem(`oidc_${state}_delegatedAuthConfig`, JSON.stringify(delegatedAuthConfig));
    window.sessionStorage.setItem(`oidc_${state}_homeserver`, homeserver);
};

type StoredAuthorizationParams = Omit<ReturnType<typeof generateAuthorizationParams>, "state" | "scope"> & {
    delegatedAuthConfig: ValidatedDelegatedAuthConfig;
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

/**
 * Start OIDC authorization code flow
 * Navigates to configured authorization endpoint
 * @param delegatedAuthConfig from discovery
 * @param clientId this client's id as registered with configured issuer
 * @param homeserver target homeserver
 */
export const startOidcLogin = async (
    delegatedAuthConfig: ValidatedDelegatedAuthConfig,
    clientId: string,
    homeserver: string,
): Promise<void> => {
    // TODO(kerrya) afterloginfragment https://github.com/vector-im/element-web/issues/25656
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

export interface IMatrixClientCreds {
    homeserverUrl: string;
    identityServerUrl?: string;
    userId: string;
    deviceId?: string;
    accessToken?: string;
    guest?: boolean;
    pickleKey?: string;
    freshLogin?: boolean;
}

/**
 * Attempt to complete authorization code flow to login
 * @param {QueryDict} queryParams the query-parameters extracted from the real query-string of the starting URI.
 * @returns {Promise<void>} Promise that resolves when login was successful
 * @throws When login failed
 */
export const completeOidcLogin = async (
    queryParams: QueryDict,
): Promise<{
    homeserverUrl: string;
    identityServerUrl?: string;
    accessToken: string;
}> => {
    const { code, state } = getCodeAndStateFromQueryParams(queryParams);

    const storedAuthorizationParams = retrieveAuthorizationParams(state);

    const bearerToken = await completeAuthorizationCodeGrant(code, storedAuthorizationParams);

    // @TODO(kerrya) do I need to verify anything else in response?

    // @TODO(kerrya) do something with the refresh token

    return {
        homeserverUrl: storedAuthorizationParams.homeserver,
        accessToken: bearerToken.access_token,
        // @TODO(kerrya) persist this in session storage with other auth params
        // identityServerUrl
    };
};
