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

/// <reference types="cypress" />

import * as loglevel from "loglevel";

import type { ISendEventResponse, MatrixClient, Room } from "matrix-js-sdk/src/matrix";
import type { GeneratedSecretStorageKey } from "matrix-js-sdk/src/crypto-api";
import type { AddSecretStorageKeyOpts } from "matrix-js-sdk/src/secret-storage";
import { HomeserverInstance } from "../plugins/utils/homeserver";
import { Credentials } from "./homeserver";
import { collapseLastLogGroup } from "./log";
import type { Logger } from "matrix-js-sdk/src/logger";
import Chainable = Cypress.Chainable;

interface CreateBotOpts {
    /**
     * A prefix to use for the userid. If unspecified, "bot_" will be used.
     */
    userIdPrefix?: string;
    /**
     * Whether the bot should automatically accept all invites.
     */
    autoAcceptInvites?: boolean;
    /**
     * The display name to give to that bot user
     */
    displayName?: string;
    /**
     * Whether or not to start the syncing client.
     */
    startClient?: boolean;
    /**
     * Whether or not to generate cross-signing keys
     */
    bootstrapCrossSigning?: boolean;
    /**
     * Whether to use the rust crypto impl. Defaults to false (for now!)
     */
    rustCrypto?: boolean;
    /**
     * Whether or not to bootstrap the secret storage
     */
    bootstrapSecretStorage?: boolean;
}

const defaultCreateBotOptions = {
    userIdPrefix: "bot_",
    autoAcceptInvites: true,
    startClient: true,
    bootstrapCrossSigning: true,
} as CreateBotOpts;

export interface CypressBot extends MatrixClient {
    __cypress_password: string;
    __cypress_recovery_key: GeneratedSecretStorageKey;
}

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Cypress {
        interface Chainable {
            /**
             * Returns a new Bot instance
             * @param homeserver the instance on which to register the bot user
             * @param opts create bot options
             */
            getBot(homeserver: HomeserverInstance, opts: CreateBotOpts): Chainable<CypressBot>;

            /**
             * Returns a new Bot instance logged in as an existing user
             * @param homeserver the instance on which to register the bot user
             * @param username the username for the bot to log in with
             * @param password the password for the bot to log in with
             * @param opts create bot options
             */
            loginBot(
                homeserver: HomeserverInstance,
                username: string,
                password: string,
                opts: CreateBotOpts,
            ): Chainable<MatrixClient>;

            /**
             * Let a bot join a room
             * @param cli The bot's MatrixClient
             * @param roomId ID of the room to join
             */
            botJoinRoom(cli: MatrixClient, roomId: string): Chainable<Room>;

            /**
             * Let a bot join a room by name
             * @param cli The bot's MatrixClient
             * @param roomName Name of the room to join
             */
            botJoinRoomByName(cli: MatrixClient, roomName: string): Chainable<Room>;

            /**
             * Send a message as a bot into a room
             * @param cli The bot's MatrixClient
             * @param roomId ID of the room to join
             * @param message the message body to send
             */
            botSendMessage(cli: MatrixClient, roomId: string, message: string): Chainable<ISendEventResponse>;
            /**
             * Send a message as a bot into a room in a specific thread
             * @param cli The bot's MatrixClient
             * @param threadId the thread within which this message should go
             * @param roomId ID of the room to join
             * @param message the message body to send
             */
            botSendThreadMessage(
                cli: MatrixClient,
                roomId: string,
                threadId: string,
                message: string,
            ): Chainable<ISendEventResponse>;
        }
    }
}

function setupBotClient(
    homeserver: HomeserverInstance,
    credentials: Credentials,
    opts: CreateBotOpts,
): Chainable<MatrixClient> {
    opts = Object.assign({}, defaultCreateBotOptions, opts);
    return cy.window({ log: false }).then(
        // extra timeout, as this sometimes takes a while
        { timeout: 30_000 },
        async (win): Promise<MatrixClient> => {
            const logger = getLogger(win, `cypress bot ${credentials.userId}`);

            const keys = {};

            const getCrossSigningKey = (type: string) => {
                return keys[type];
            };

            const saveCrossSigningKeys = (k: Record<string, Uint8Array>) => {
                Object.assign(keys, k);
            };

            // Store the cached secret storage key and return it when `getSecretStorageKey` is called
            let cachedKey: { keyId: string; key: Uint8Array };
            const cacheSecretStorageKey = (keyId: string, keyInfo: AddSecretStorageKeyOpts, key: Uint8Array) => {
                cachedKey = {
                    keyId,
                    key,
                };
            };

            const getSecretStorageKey = () => Promise.resolve<[string, Uint8Array]>([cachedKey.keyId, cachedKey.key]);

            const cryptoCallbacks = {
                getCrossSigningKey,
                saveCrossSigningKeys,
                cacheSecretStorageKey,
                getSecretStorageKey,
            };

            const cli = new win.matrixcs.MatrixClient({
                baseUrl: homeserver.baseUrl,
                userId: credentials.userId,
                deviceId: credentials.deviceId,
                accessToken: credentials.accessToken,
                store: new win.matrixcs.MemoryStore(),
                scheduler: new win.matrixcs.MatrixScheduler(),
                cryptoStore: new win.matrixcs.MemoryCryptoStore(),
                logger: logger,
                cryptoCallbacks,
            });

            if (opts.autoAcceptInvites) {
                cli.on(win.matrixcs.RoomMemberEvent.Membership, (event, member) => {
                    if (member.membership === "invite" && member.userId === cli.getUserId()) {
                        cli.joinRoom(member.roomId);
                    }
                });
            }

            if (!opts.startClient) {
                return cli;
            }

            if (opts.rustCrypto) {
                await cli.initRustCrypto({ useIndexedDB: false });
            } else {
                await cli.initCrypto();
            }
            cli.setGlobalErrorOnUnknownDevices(false);
            await cli.startClient();

            if (opts.bootstrapCrossSigning) {
                await cli.getCrypto()!.bootstrapCrossSigning({
                    authUploadDeviceSigningKeys: async (func) => {
                        await func({
                            type: "m.login.password",
                            identifier: {
                                type: "m.id.user",
                                user: credentials.userId,
                            },
                            password: credentials.password,
                        });
                    },
                });
            }

            if (opts.bootstrapSecretStorage) {
                const passphrase = "new passphrase";
                const recoveryKey = await cli.getCrypto().createRecoveryKeyFromPassphrase(passphrase);
                Object.assign(cli, { __cypress_recovery_key: recoveryKey });

                await cli.getCrypto()!.bootstrapSecretStorage({
                    setupNewSecretStorage: true,
                    setupNewKeyBackup: true,
                    createSecretStorageKey: () => Promise.resolve(recoveryKey),
                });
            }

            return cli;
        },
    );
}

Cypress.Commands.add("getBot", (homeserver: HomeserverInstance, opts: CreateBotOpts): Chainable<CypressBot> => {
    opts = Object.assign({}, defaultCreateBotOptions, opts);
    const username = Cypress._.uniqueId(opts.userIdPrefix);
    const password = Cypress._.uniqueId("password_");
    Cypress.log({
        name: "getBot",
        message: `Create bot user ${username} with opts ${JSON.stringify(opts)}`,
        groupStart: true,
    });
    return cy
        .registerUser(homeserver, username, password, opts.displayName)
        .then((credentials) => {
            return setupBotClient(homeserver, credentials, opts);
        })
        .then((client): Chainable<CypressBot> => {
            Object.assign(client, { __cypress_password: password });
            Cypress.log({ groupEnd: true, emitOnly: true });
            collapseLastLogGroup();
            return cy.wrap(client as CypressBot, { log: false });
        });
});

Cypress.Commands.add(
    "loginBot",
    (
        homeserver: HomeserverInstance,
        username: string,
        password: string,
        opts: CreateBotOpts,
    ): Chainable<MatrixClient> => {
        opts = Object.assign({}, defaultCreateBotOptions, { bootstrapCrossSigning: false }, opts);
        Cypress.log({
            name: "loginBot",
            message: `log in as ${username} with opts ${JSON.stringify(opts)}`,
            groupStart: true,
        });
        return cy
            .loginUser(homeserver, username, password)
            .then((credentials) => {
                return setupBotClient(homeserver, credentials, opts);
            })
            .then((res) => {
                Cypress.log({ groupEnd: true, emitOnly: true });
                collapseLastLogGroup();
                cy.wrap(res, { log: false });
            });
    },
);

Cypress.Commands.add("botJoinRoom", (cli: MatrixClient, roomId: string): Chainable<Room> => {
    return cy.wrap(cli.joinRoom(roomId));
});

Cypress.Commands.add("botJoinRoomByName", (cli: MatrixClient, roomName: string): Chainable<Room> => {
    const room = cli.getRooms().find((r) => r.getDefaultRoomName(cli.getUserId()) === roomName);

    if (room) {
        return cy.botJoinRoom(cli, room.roomId);
    }

    return cy.wrap(Promise.reject(`Bot room join failed. Cannot find room '${roomName}'`));
});

Cypress.Commands.add(
    "botSendMessage",
    (cli: MatrixClient, roomId: string, message: string): Chainable<ISendEventResponse> => {
        return cy.wrap(
            cli.sendMessage(roomId, {
                msgtype: "m.text",
                body: message,
            }),
            { log: false },
        );
    },
);

Cypress.Commands.add(
    "botSendThreadMessage",
    (cli: MatrixClient, roomId: string, threadId: string, message: string): Chainable<ISendEventResponse> => {
        return cy.wrap(
            cli.sendMessage(roomId, threadId, {
                msgtype: "m.text",
                body: message,
            }),
            { log: false },
        );
    },
);

/** Get a Logger implementation based on `loglevel` with the given logger name */
function getLogger(win: Cypress.AUTWindow, loggerName: string): Logger {
    const logger = loglevel.getLogger(loggerName);

    // If this is the first time this logger has been returned, turn it into a `Logger` and set the default level
    if (!("getChild" in logger)) {
        logger["getChild"] = (namespace: string) => getLogger(win, loggerName + ":" + namespace);
        logger.methodFactory = makeLogMethodFactory(win);
        logger.setLevel(loglevel.levels.DEBUG);
    }

    return logger as unknown as Logger;
}

/**
 * Helper for getLogger: a factory for loglevel method factories.
 */
function makeLogMethodFactory(win: Cypress.AUTWindow): loglevel.MethodFactory {
    function methodFactory(
        methodName: loglevel.LogLevelNames,
        level: loglevel.LogLevelNumbers,
        loggerName: string | symbol,
    ): loglevel.LoggingMethod {
        // here's the actual log method, which implements `Logger.info`, `Logger.debug`, etc.
        return function (first: any, ...rest): void {
            // include the logger name in the output...
            first = `\x1B[31m[${loggerName.toString()}]\x1B[m ${first.toString()}`;

            // ... and delegate to the corresponding method in the console of the application under test.
            // Doing so (rather than using the global `console`) ensures that the output is collected
            // by the `cypress-terminal-report` plugin.
            const console = win.console;
            if (methodName in console) {
                console[methodName](first, ...rest);
            } else {
                console.log(first, ...rest);
            }
        };
    }
    return methodFactory;
}
