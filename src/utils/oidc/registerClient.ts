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

import { IDelegatedAuthConfig } from "matrix-js-sdk/src/client";
import { Method } from "matrix-js-sdk/src/http-api";
import { logger } from "matrix-js-sdk/src/logger";
import { ValidatedIssuerConfig } from "matrix-js-sdk/src/oidc/validate";

import { OidcClientError } from "./error";

export type OidcRegistrationClientMetadata = {
    clientName: string;
    clientUri: string;
    redirectUris: string[];
};

/**
 * Make the registration request
 * @param registrationEndpoint URL as configured on ValidatedServerConfig
 * @param clientMetadata registration metadata
 * @returns {Promise<string>} resolves to the registered client id when registration is successful
 * @throws when registration request fails, or response is invalid
 */
const doRegistration = async (
    registrationEndpoint: string,
    clientMetadata: OidcRegistrationClientMetadata,
): Promise<string> => {
    // https://openid.net/specs/openid-connect-registration-1_0.html
    const metadata = {
        client_name: clientMetadata.clientName,
        client_uri: clientMetadata.clientUri,
        response_types: ["code"],
        grant_types: ["authorization_code", "refresh_token"],
        redirect_uris: clientMetadata.redirectUris,
        id_token_signed_response_alg: "RS256",
        token_endpoint_auth_method: "none",
        application_type: "web",
    };
    const headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
    };

    try {
        const response = await fetch(registrationEndpoint, {
            method: Method.Post,
            headers,
            body: JSON.stringify(metadata),
        });

        if (response.status >= 400) {
            throw new Error(OidcClientError.DynamicRegistrationFailed);
        }

        const body = await response.json();
        const clientId = body["client_id"];
        if (!clientId || typeof clientId !== "string") {
            throw new Error(OidcClientError.DynamicRegistrationInvalid);
        }

        return clientId;
    } catch (error) {
        if (Object.values(OidcClientError).includes((error as Error).message as OidcClientError)) {
            throw error;
        } else {
            logger.error("Dynamic registration request failed", error);
            throw new Error(OidcClientError.DynamicRegistrationFailed);
        }
    }
};

/**
 * Attempts dynamic registration against the configured registration endpoint
 * @param delegatedAuthConfig  Auth config from ValidatedServerConfig
 * @param clientName Client name to register with the OP, eg 'Element'
 * @param baseUrl URL of the home page of the Client, eg 'https://app.element.io/'
 * @returns Promise<string> resolved with registered clientId
 * @throws on failed request or invalid response
 */
const registerOidcClient = async (
    delegatedAuthConfig: IDelegatedAuthConfig & ValidatedIssuerConfig,
    clientName: string,
    baseUrl: string,
): Promise<string> => {
    const clientMetadata = {
        clientName,
        clientUri: baseUrl,
        redirectUris: [baseUrl],
    };
    if (!delegatedAuthConfig.registrationEndpoint) {
        throw new Error(OidcClientError.DynamicRegistrationNotSupported);
    }
    const clientId = await doRegistration(delegatedAuthConfig.registrationEndpoint, clientMetadata);

    return clientId;
};

/**
 * Get the configured clientId for the issuer
 * @param issuer delegated auth OIDC issuer
 * @param staticOidcClients static client config from config.json
 * @returns clientId if found, otherwise undefined
 */
const getStaticOidcClientId = (issuer: string, staticOidcClients?: Record<string, string>): string | undefined => {
    return staticOidcClients?.[issuer];
};

/**
 * Get the clientId for configured oidc OP
 * Checks statically configured clientIds first
 * Then attempts dynamic registration with the OP
 * @param delegatedAuthConfig Auth config from ValidatedServerConfig
 * @param clientName Client name to register with the OP, eg 'Element'
 * @param baseUrl URL of the home page of the Client, eg 'https://app.element.io/'
 * @param staticOidcClients static client config from config.json
 * @returns Promise<string> resolves with clientId
 * @throws if no clientId is found or registration failed
 */
export const getOidcClientId = async (
    delegatedAuthConfig: IDelegatedAuthConfig & ValidatedIssuerConfig,
    clientName: string,
    baseUrl: string,
    staticOidcClients?: Record<string, string>,
): Promise<string> => {
    const staticClientId = getStaticOidcClientId(delegatedAuthConfig.issuer, staticOidcClients);
    if (staticClientId) {
        logger.debug(`Using static clientId for issuer ${delegatedAuthConfig.issuer}`);
        return staticClientId;
    }
    return await registerOidcClient(delegatedAuthConfig, clientName, baseUrl);
};
