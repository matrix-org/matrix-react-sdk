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
import { MatrixClient, RoomMemberEvent } from "matrix-js-sdk/src/matrix";

import { SynapseInstance } from "../plugins/synapsedocker";
import Chainable = Cypress.Chainable;

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Cypress {
        interface Chainable {
            /**
             * Returns a new Bot instance
             */
            getBot(synapse: SynapseInstance): Chainable<MatrixClient>;
        }
    }
}

Cypress.Commands.add("getBot", (synapse: SynapseInstance): Chainable<MatrixClient> => {
    const username = Cypress._.uniqueId("userId_");
    const password = Cypress._.uniqueId("password_");
    return cy.registerUser(synapse, username, password).then(credentials => {
        const cli = new MatrixClient({
            baseUrl: synapse.baseUrl,
            userId: credentials.userId,
            deviceId: credentials.deviceId,
            accessToken: credentials.accessToken,
            request,
        });

        cli.on(RoomMemberEvent.Membership, (event, member) => {
            if (member.membership === "invite" && member.userId === cli.getUserId()) {
                cli.joinRoom(member.roomId);
            }
        });

        cli.startClient();

        return cli;
    });
});
