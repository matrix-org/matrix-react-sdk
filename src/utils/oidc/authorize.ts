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

import { OidcClientConfig } from "matrix-js-sdk/src/autodiscovery";
import { generateOidcAuthorizationUrl } from "matrix-js-sdk/src/oidc/authorize";
import { randomString } from "matrix-js-sdk/src/randomstring";

import { SSO_HOMESERVER_URL_KEY, SSO_ID_SERVER_URL_KEY } from "../../BasePlatform";

/**
 * Store homeserver for retrieval when returning from OIDC OP
 * @param homeserver target homeserver
 * @param identityServerUrl OPTIONAL target identity server
 */
const persistAuthorizationParams = (nonce, homeserverUrl: string, identityServerUrl?: string): void => {
    // persist hs url and is url for when the user is returned to the app
    sessionStorage.setItem(`oidc_nonce`, nonce);
    sessionStorage.setItem(SSO_HOMESERVER_URL_KEY, homeserverUrl);
    if (identityServerUrl) {
        sessionStorage.setItem(SSO_ID_SERVER_URL_KEY, identityServerUrl);
    }
};

/**
 * Start OIDC authorization code flow
 * Generates auth params, stores them in session storage and
 * Navigates to configured authorization endpoint
 * @param delegatedAuthConfig from discovery
 * @param clientId this client's id as registered with configured issuer
 * @param homeserverUrl target homeserver
 * @param identityServerUrl OPTIONAL target identity server
 * @returns Promise that resolves after we have navigated to auth endpoint
 */
export const startOidcLogin = async (
    delegatedAuthConfig: OidcClientConfig,
    clientId: string,
    homeserverUrl: string,
    identityServerUrl?: string,
): Promise<void> => {
    const redirectUri = window.location.origin;

    const nonce = randomString(10);

    persistAuthorizationParams(nonce, homeserverUrl, identityServerUrl);

    const authorizationUrl = await generateOidcAuthorizationUrl({
        metadata: delegatedAuthConfig.metadata,
        redirectUri,
        clientId,
        homeserverUrl,
        nonce,
    });

    window.location.href = authorizationUrl;
};
