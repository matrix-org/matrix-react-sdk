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

import { IDelegatedAuthConfig, MatrixClient, M_AUTHENTICATION } from "matrix-js-sdk/src/matrix";
import { discoverAndValidateAuthenticationConfig } from "matrix-js-sdk/src/oidc/discovery";
import { logger } from "matrix-js-sdk/src/logger";
import { OidcClient } from "oidc-client-ts";

import { getStoredOidcTokenIssuer, getStoredOidcClientId } from "../../utils/oidc/persistOidcSettings";

/**
 * @experimental
 * Stores information about configured OIDC provider
 */
export class OidcClientStore {
    private oidcClient?: OidcClient;
    private initialisingOidcClientPromise: Promise<void> | undefined;
    private authenticatedIssuer?: string;
    private _accountManagementEndpoint?: string;

    public constructor(private readonly matrixClient: MatrixClient) {
        this.authenticatedIssuer = getStoredOidcTokenIssuer();
        // don't bother initialising store when we didnt authenticate via oidc
        if (this.authenticatedIssuer) {
            this.getOidcClient();
        }
    }

    /**
     * True when the active user is authenticated via OIDC
     */
    public get isUserAuthenticatedWithOidc(): boolean {
        return !!this.authenticatedIssuer;
    }

    public get accountManagementEndpoint(): string | undefined {
        return this._accountManagementEndpoint;
    }

    /**
     * Revokes provided access and refresh tokens with the configured OIDC provider
     * @param accessToken
     * @param refreshToken
     * @returns Promise that resolves when tokens have been revoked
     * @throws when OidcClient cannot be initialised, or revoking either token fails
     */
    public async revokeTokens(accessToken?: string, refreshToken?: string): Promise<void> {
        const client = await this.getOidcClient();

        if (!client) {
            throw new Error("No OIDC client");
        }

        const results = await Promise.all([
            this.tryRevokeToken(client, accessToken, "access_token"),
            this.tryRevokeToken(client, refreshToken, "refresh_token"),
        ]);

        if (results.some((success) => !success)) {
            throw new Error("Failed to revoke tokens");
        }
    }

    /**
     * Try to revoke a given token
     * @param oidcClient
     * @param token
     * @param tokenType passed to revocation endpoint as token type hint
     * @returns Promise that resolved with boolean whether the token revocation succeeded or not
     */
    private async tryRevokeToken(
        oidcClient: OidcClient,
        token: string | undefined,
        tokenType: "access_token" | "refresh_token",
    ): Promise<boolean> {
        try {
            if (!token) {
                return false;
            }
            await oidcClient.revokeToken(token, tokenType);
            return true;
        } catch (error) {
            logger.error(`Failed to revoke ${tokenType}`, error);
            return false;
        }
    }

    private async getOidcClient(): Promise<OidcClient | undefined> {
        if (!this.oidcClient && !this.initialisingOidcClientPromise) {
            this.initialisingOidcClientPromise = this.initOidcClient();
        }
        await this.initialisingOidcClientPromise;
        this.initialisingOidcClientPromise = undefined;
        return this.oidcClient;
    }

    /**
     * Tries to initialise an OidcClient using stored clientId and OIDC discovery.
     * Assigns this.oidcClient and accountManagement endpoint.
     * Logs errors and does not throw when oidc client cannot be initialised.
     * @returns promise that resolves when initialising OidcClient succeeds or fails
     */
    private async initOidcClient(): Promise<void> {
        const wellKnown = await this.matrixClient.waitForClientWellKnown();
        if (!wellKnown && !this.authenticatedIssuer) {
            logger.error("Cannot initialise OIDC client without issuer.");
            return;
        }
        const delegatedAuthConfig =
            (wellKnown && M_AUTHENTICATION.findIn<IDelegatedAuthConfig>(wellKnown)) ?? undefined;

        try {
            const clientId = getStoredOidcClientId();
            const { account, metadata, signingKeys } = await discoverAndValidateAuthenticationConfig(
                // if HS has valid delegated auth config in .well-known, use it
                // otherwise fallback to the known issuer
                delegatedAuthConfig ?? { issuer: this.authenticatedIssuer! },
            );
            // if no account endpoint is configured default to the issuer
            this._accountManagementEndpoint = account ?? metadata.issuer;
            this.oidcClient = new OidcClient({
                ...metadata,
                authority: metadata.issuer,
                signingKeys,
                redirect_uri: window.location.origin,
                client_id: clientId,
            });
        } catch (error) {
            logger.error("Failed to initialise OidcClientStore", error);
        }
    }
}
