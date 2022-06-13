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

import type { MatrixClient, Room } from "matrix-js-sdk/src/matrix";
import { SynapseInstance } from "../plugins/synapsedocker";
import { MockStorage } from "./storage";
import Chainable = Cypress.Chainable;

interface ICreateBotOpts {
    /**
     * Whether the bot should automatically accept all invites.
     */
    autoAcceptInvites?: boolean;
    /**
     * The display name to give to that bot user
     */
    displayName?: string;
}

const defaultCreateBotOptions = {
    autoAcceptInvites: true,
} as ICreateBotOpts;

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Cypress {
        interface Chainable {
            /**
             * Returns a new Bot instance
             * @param synapse the instance on which to register the bot user
             * @param opts create bot options
             */
            getBot(synapse: SynapseInstance, opts: ICreateBotOpts): Chainable<MatrixClient>;
            botJoinRoom(bot: MatrixClient, roomId: string): Chainable<Room>;
            botJoinRoomByName(bot: MatrixClient, roomName: string): Chainable<Room>;
        }
    }
}

Cypress.Commands.add("botJoinRoom", (bot: MatrixClient, roomId: string): Chainable<Room> => {
    return cy.wrap(bot.joinRoom(roomId));
});

Cypress.Commands.add("botJoinRoomByName", (bot: MatrixClient, roomName: string): Chainable<Room> => {
    const room = bot.getRooms().find((r) => r.getDefaultRoomName(bot.getUserId()) === roomName);

    if (room) {
        return cy.botJoinRoom(bot, room.roomId);
    }

    return cy.wrap(Promise.reject());
});

Cypress.Commands.add("getBot", (synapse: SynapseInstance, opts: ICreateBotOpts): Chainable<MatrixClient> => {
    opts = Object.assign({}, defaultCreateBotOptions, opts);
    const username = Cypress._.uniqueId("userId_");
    const password = Cypress._.uniqueId("password_");
    return cy.registerUser(synapse, username, password, opts.displayName).then(credentials => {
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
                sessionStore: new win.matrixcs.WebStorageSessionStore(new MockStorage()),
            });

            cli.on(win.matrixcs.RoomMemberEvent.Membership, (event, member) => {
                if (member.membership === "invite" && member.userId === cli.getUserId()) {
                    if (opts.autoAcceptInvites) {
                        cli.joinRoom(member.roomId);
                    }
                }
            });

            return cy.wrap(
                cli.initCrypto()
                    .then(() => cli.setGlobalErrorOnUnknownDevices(false))
                    .then(() => cli.startClient())
                    .then(() => cli),
            );
        });
    });
});
