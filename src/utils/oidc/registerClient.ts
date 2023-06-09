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
import { ValidatedIssuerConfig } from "matrix-js-sdk/src/oidc/validate";

// "staticOidcClients": {
//     "https://dev-6525741.okta.com/": {
//         "client_id": "0oa5x44w64wpNsxi45d7"
//     },
//     "https://keycloak-oidc.lab.element.dev/realms/master/": {
//         "client_id": "hydrogen-oidc-playground"
//     },
//     "https://id.thirdroom.io/realms/thirdroom/": {
//         "client_id": "hydrogen-oidc-playground"
//     }
//   }

export type OidcRegistrationClientMetadata = {
    clientName: string;
    clientUri: string;
    redirectUris: string[];
};

/**
 *
 * @param issuer issue URL
 * @param clientMetadata registration metadata
 * @returns {Promise<string>} resolves to the registered client id when registration is successful
 * @throws when registration fails, or issue does not support dynamic registration
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
    const response = await fetch(registrationEndpoint, {
        method: Method.Post,
        headers,
        body: JSON.stringify(metadata),
    });

    if (response.status >= 400) {
        throw new Error("Failed to register client");
    }

    const body = await response.json();
    const clientId = body["client_id"];
    if (!clientId) {
        throw new Error("Invalid clientId");
    }

    return clientId;
};

export const registerOidcClient = async (
    delegatedAuthConfig: IDelegatedAuthConfig & ValidatedIssuerConfig,
    clientName: string,
    baseUrl: string,
): Promise<string> => {
    const clientMetadata = {
        clientName,
        clientUri: baseUrl,
        redirectUris: [baseUrl],
    };
    const clientId = await doRegistration(delegatedAuthConfig.registrationEndpoint, clientMetadata);

    return clientId;
};
