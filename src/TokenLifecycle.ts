/*
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

import { logger } from "matrix-js-sdk/src/logger";
import { MatrixClient } from "matrix-js-sdk/src";
import Mutex from "idb-mutex";

import { IMatrixClientCreds, MatrixClientPeg } from "./MatrixClientPeg";
import { getRenewedStoredSessionVars, hydrateSessionInPlace } from "./Lifecycle";
import { IDB_SUPPORTED } from "./utils/StorageManager";

export interface IRenewedMatrixClientCreds extends Pick<IMatrixClientCreds,
    "accessToken" | "accessTokenExpiryTs" | "accessTokenRefreshToken"> {}

const LOCALSTORAGE_UPDATE_TS_KEY = "mx_token_last_refreshed_ts";

export class TokenLifecycle {
    public static readonly instance = new TokenLifecycle();

    private refreshAtTimerId: number;
    private mutex: Mutex;

    protected constructor() {
        // we only really want one of these floating around, so private-ish
        // constructor. Protected allows for unit tests.

        // Don't try to create a mutex if it'll explode
        if (IDB_SUPPORTED) {
            this.mutex = new Mutex("token_refresh");
        }

        // Watch for other tabs causing token refreshes, so we can react to them too.
        window.addEventListener("storage", (ev: StorageEvent) => {
            if (ev.storageArea === localStorage && ev.key === LOCALSTORAGE_UPDATE_TS_KEY) {
                logger.info("TokenLifecycle#storageWatch: Token update received - rehydrating");

                // noinspection JSIgnoredPromiseFromCall
                this.forceHydration();
            }
        });
    }

    /**
     * Can the client reasonably support token refreshes?
     */
    public get isFeasible(): boolean {
        return IDB_SUPPORTED;
    }

    // noinspection JSMethodCanBeStatic
    private get fiveMinutesAgo(): number {
        return Date.now() - 30000;
    }

    // noinspection JSMethodCanBeStatic
    private get fiveMinutesFromNow(): number {
        return Date.now() + 30000;
    }

    /**
     * Attempts a token renewal, if renewal is needed/possible. If renewal is not possible
     * then this will return falsy. Otherwise, the new token's details (credentials) will
     * be returned or an error if something went wrong.
     * @param {IMatrixClientCreds} credentials The input credentials.
     * @param {MatrixClient} client A client set up with those credentials.
     * @returns {Promise<IRenewedMatrixClientCreds>} Resolves to the new credentials, or
     * falsy if renewal not possible/needed. Throws on error.
     */
    public async tryTokenExchangeIfNeeded(
        credentials: IMatrixClientCreds,
        client: MatrixClient,
    ): Promise<IRenewedMatrixClientCreds> {
        if (!credentials.accessTokenExpiryTs && credentials.accessTokenRefreshToken) {
            logger.warn(
                "TokenLifecycle#tryExchange: Got a refresh token, but no expiration time. The server is " +
                "not compliant with the specification and might result in unexpected logouts.",
            );
        }

        if (!this.isFeasible) {
            logger.warn("TokenLifecycle#tryExchange: Client cannot do token refreshes reliably");
            return;
        }

        if (credentials.accessTokenExpiryTs && credentials.accessTokenRefreshToken) {
            if (this.fiveMinutesAgo >= credentials.accessTokenExpiryTs) {
                logger.info("TokenLifecycle#tryExchange: Token has or will expire soon, refreshing");
                return this.doTokenRefresh(credentials, client);
            }
        }
    }

    // noinspection JSMethodCanBeStatic
    private async doTokenRefresh(
        credentials: IMatrixClientCreds,
        client: MatrixClient,
    ): Promise<IRenewedMatrixClientCreds> {
        try {
            await this.mutex.lock();

            const lastUpdated = Number(localStorage.getItem(LOCALSTORAGE_UPDATE_TS_KEY) ?? 0);
            if ((Date.now() - lastUpdated) >= this.fiveMinutesAgo) {
                logger.warn("TokenLifecycle#doTokenRefresh: Token was refreshed recently - skipping update");

                // The token was refreshed recently - skip update and try to fetch new credentials
                // from the underlying storage.
                const {
                    accessToken,
                    accessTokenRefreshToken,
                    accessTokenExpiryTs,
                } = await getRenewedStoredSessionVars();
                return { accessToken, accessTokenRefreshToken, accessTokenExpiryTs };
            }

            const newCreds = await client.refreshToken(credentials.accessTokenRefreshToken);
            localStorage.setItem(LOCALSTORAGE_UPDATE_TS_KEY,`${Date.now()}`);
            return {
                // We use the browser's local time to do two things:
                // 1. Avoid having to write code that counts down and stores a "time left" variable
                // 2. Work around any time drift weirdness by assuming the user's local machine will
                //    drift consistently with itself.
                // We additionally add our own safety buffer when renewing tokens to avoid cases where
                // the time drift is accelerating.
                accessTokenExpiryTs: Date.now() + newCreds.expires_in_ms,
                accessToken: newCreds.access_token,
                accessTokenRefreshToken: newCreds.refresh_token,
            };
        } catch (e) {
            if (e.errcode === "M_UNKNOWN_TOKEN") {
                // Emit the logout manually because the function inhibits it.
                client.emit("Session.logged_out", e);
            } else {
                throw e; // we can't do anything with it, so re-throw
            }
        } finally {
            await this.mutex.unlock();
        }
    }

    public startTimers(credentials: IMatrixClientCreds) {
        this.stopTimers();

        if (!credentials.accessTokenExpiryTs && credentials.accessTokenRefreshToken) {
            logger.warn(
                "TokenLifecycle#start: Got a refresh token, but no expiration time. The server is " +
                "not compliant with the specification and might result in unexpected logouts.",
            );
        }

        if (!this.isFeasible) {
            logger.warn("TokenLifecycle#start: Not starting refresh timers - browser unsupported");
        }

        if (credentials.accessTokenExpiryTs && credentials.accessTokenRefreshToken) {
            // We schedule the refresh task for 5 minutes before the expiration timestamp as
            // a safety buffer. We assume/hope that servers won't be expiring tokens faster
            // than every 5 minutes, but we do need to consider cases where the expiration is
            // fairly quick (<10 minutes, for example).
            let relativeTime = credentials.accessTokenExpiryTs - this.fiveMinutesFromNow;
            if (relativeTime <= 0) {
                logger.warn(`TokenLifecycle#start: Refresh was set for ${relativeTime}ms - readjusting`);
                relativeTime = Math.floor(Math.random() * 1000) + 30000; // 30 seconds + 1s jitter
            }
            this.refreshAtTimerId = setTimeout(() => {
                // noinspection JSIgnoredPromiseFromCall
                this.forceTokenExchange();
            }, relativeTime);
            logger.info(`TokenLifecycle#start: Refresh timer set for ${relativeTime}ms from now`);
        } else {
            logger.info("TokenLifecycle#start: Not setting a refresh timer - token not renewable");
        }
    }

    public stopTimers() {
        clearTimeout(this.refreshAtTimerId);
        logger.info("TokenLifecycle#stop: Stopped refresh timer (if it was running)");
    }

    private async forceTokenExchange() {
        const credentials = MatrixClientPeg.getCredentials();
        return this.rehydrate(await this.doTokenRefresh(credentials, MatrixClientPeg.get()));
    }

    private async forceHydration() {
        const {
            accessToken,
            accessTokenRefreshToken,
            accessTokenExpiryTs,
        } = await getRenewedStoredSessionVars();
        return this.rehydrate({ accessToken, accessTokenRefreshToken, accessTokenExpiryTs });
    }

    private async rehydrate(newCreds: IRenewedMatrixClientCreds) {
        const credentials = MatrixClientPeg.getCredentials();
        try {
            if (!newCreds) {
                logger.error("TokenLifecycle#expireExchange: Expecting new credentials, got nothing. Rescheduling.");
                this.startTimers(credentials);
            } else {
                logger.info("TokenLifecycle#expireExchange: Updating client credentials using rehydration");
                await hydrateSessionInPlace({
                    ...credentials,
                    ...newCreds, // override from credentials
                });
                // hydrateSessionInPlace will ultimately call back to startTimers() for us, so no need to do it here.
            }
        } catch (e) {
            logger.error("TokenLifecycle#expireExchange: Error getting new credentials. Rescheduling.", e);
            this.startTimers(credentials);
        }
    }
}
