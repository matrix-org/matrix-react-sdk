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

import request from "browser-request";

import type { MatrixClient } from "matrix-js-sdk/src/client";
import { SynapseInstance } from "../plugins/synapsedocker";
import { UserCredentials } from "./login";
import Chainable = Cypress.Chainable;

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Cypress {
        interface Chainable {
            /**
             * Returns a Bot instance for a newly-registered account
             * @param synapse the instance on which to register the bot user
             * @param displayName the display name to give to the bot user
             */
            registerBot(synapse: SynapseInstance, displayName?: string): Chainable<MatrixClient>;

            /**
             * Returns a Bot instance for an existing user account
             * @param synapse the instance on which to register the bot user
             * @param username the account's username
             * @param password the account's password
             */
            loginBot(synapse: SynapseInstance, username: string, password: string): Chainable<MatrixClient>;
        }
    }
}

function getBot(synapse: SynapseInstance, credentials: UserCredentials): Chainable<MatrixClient> {
    return cy.window({ log: false }).then(win => {
        const cli = new win.matrixcs.MatrixClient({
            baseUrl: synapse.baseUrl,
            userId: credentials.userId,
            deviceId: credentials.deviceId,
            accessToken: credentials.accessToken,
            request,
            store: new win.matrixcs.MemoryStore(),
            scheduler: new win.matrixcs.MatrixScheduler(),
            cryptoStore: new win.matrixcs.MemoryCryptoStore(),
        });

        cli.on(win.matrixcs.RoomMemberEvent.Membership, (event, member) => {
            if (member.membership === "invite" && member.userId === cli.getUserId()) {
                cli.joinRoom(member.roomId);
            }
        });

        return cy.wrap(
            cli.initCrypto()
                .then(() => cli.setGlobalErrorOnUnknownDevices(false))
                .then(() => cli.startClient())
                .then(() => cli),
        );
    });
}

Cypress.Commands.add("registerBot", (synapse: SynapseInstance, displayName?: string): Chainable<MatrixClient> => {
    const username = Cypress._.uniqueId("userId_");
    const password = Cypress._.uniqueId("password_");
    return cy.registerUser(synapse, username, password, displayName)
        .then(credentials => getBot(synapse, { ...credentials, password }));
});

Cypress.Commands.add("loginBot", (
    synapse: SynapseInstance,
    username: string,
    password: string,
): Chainable<MatrixClient> => {
    return cy.loginUser(synapse, username, password)
        .then(credentials => getBot(synapse, { ...credentials, password }));
});
