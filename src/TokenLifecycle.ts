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

import { IMatrixClientCreds, MatrixClientPeg } from "./MatrixClientPeg";
import { getRenewedStoredSessionVars, hydrateSessionInPlace } from "./Lifecycle";
import { WebIPC } from "./ipc/WebIPC";
import { Op, Operation } from "./ipc/types";
import { TRANSPORT_EVENT } from "./ipc/transport/ITransport";

export interface IRenewedMatrixClientCreds extends Pick<IMatrixClientCreds,
    "accessToken" | "accessTokenExpiryTs" | "accessTokenRefreshToken"> {}

export class TokenLifecycle {
    public static readonly instance = new TokenLifecycle();

    private refreshAtTimerId: number;

    protected constructor() {
        // we only really want one of these floating around, so private-ish
        // constructor. Protected allows for unit tests.

        this.registerIpcHandlers();
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

        if (credentials.accessTokenExpiryTs && credentials.accessTokenRefreshToken) {
            if (this.fiveMinutesAgo >= credentials.accessTokenExpiryTs) {
                logger.info("TokenLifecycle#tryExchange: Token has or will expire soon, refreshing");
                return this.doTokenRefresh(credentials, client);
            }
        }
    }

    private registerIpcHandlers() {
        WebIPC.instance.transport.on(TRANSPORT_EVENT, async (op: Operation) => {
            if (op.operation !== Op.AccessTokenUpdated) return;

            logger.info("TokenLifecyle#remoteUpdate: Leader triggered token refresh - updating client creds");
            await hydrateSessionInPlace({
                ...MatrixClientPeg.getCredentials(),
                ...(await getRenewedStoredSessionVars()),
            });
        });

        WebIPC.instance.transport.on(TRANSPORT_EVENT, async (op: Operation) => {
            if (op.operation !== Op.RefreshToken) return;
            if (!WebIPC.instance.isCurrentlyLeader) return; // not for us

            logger.info("TokenLifecyle#remoteUpdate: Remote client wants a token refresh - honouring");
            await this.forceTokenExchange();
        });
    }

    // noinspection JSMethodCanBeStatic
    private async doTokenRefresh(
        credentials: IMatrixClientCreds,
        client: MatrixClient,
    ): Promise<IRenewedMatrixClientCreds> {
        if (!WebIPC.instance.isCurrentlyLeader) {
            logger.info("TokenLifecycle#doTokenRefresh: Asking for update from leader");
            await new Promise<void>(resolve => {
                // We set a timer in case the leader is suddenly non-responsive. In these cases we'll
                // end up returning the currently stored credentials, which shouldn't be an issue.
                const timerId = setTimeout(() => {
                    logger.info("TokenLifecycle#doTokenRefresh: Leader failed to respond in time");
                    fn({
                        operation: Op.AccessTokenUpdated,
                        clientId: "unknown", // not parsed, but needed for types
                        version: 1,
                        payload: {},
                    });
                }, 120000); // 2 minutes (120 seconds) to cover average timeout from server + buffer
                const fn = (op: Operation) => {
                    if (op.operation === Op.AccessTokenUpdated) {
                        WebIPC.instance.transport.removeListener(TRANSPORT_EVENT, fn);
                        clearTimeout(timerId);
                        resolve();
                    }
                };
                WebIPC.instance.transport.on(TRANSPORT_EVENT, fn);

                // Ask the leader to refresh the token
                WebIPC.instance.transport.send({
                    operation: Op.RefreshToken,
                    clientId: WebIPC.instance.clientId,
                    version: 1,
                    payload: {},
                });
            });
            const { accessToken, accessTokenRefreshToken, accessTokenExpiryTs } = await getRenewedStoredSessionVars();
            return { accessToken, accessTokenRefreshToken, accessTokenExpiryTs };
        } else {
            logger.info("TokenLifecycle#doTokenRefresh: Refreshing token as current leader");
            try {
                const newCreds = await client.refreshToken(credentials.accessTokenRefreshToken);
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
            }
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
        try {
            const result = await this.doTokenRefresh(credentials, MatrixClientPeg.get());
            if (!result) {
                logger.error("TokenLifecycle#expireExchange: Expecting new credentials, got nothing. Rescheduling.");
                this.startTimers(credentials);
            } else {
                logger.info("TokenLifecycle#expireExchange: Updating client credentials using rehydration");
                await hydrateSessionInPlace({
                    ...credentials,
                    ...result, // override from credentials
                });
                // hydrateSessionInPlace will ultimately call back to startTimers() for us, so no need to do it here.
            }
        } catch (e) {
            logger.error("TokenLifecycle#expireExchange: Error getting new credentials. Rescheduling.", e);
            this.startTimers(credentials);
        }
    }
}
