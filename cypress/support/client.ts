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

import type { ICreateRoomOpts } from "matrix-js-sdk/src/@types/requests";
import type { MatrixClient } from "matrix-js-sdk/src/client";
import type { Room } from "matrix-js-sdk/src/models/room";
import type { IJoinRoomOpts } from "matrix-js-sdk/src/@types/requests";
import Chainable = Cypress.Chainable;

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Cypress {
        interface Chainable {
            /**
             * Returns the MatrixClient from the MatrixClientPeg
             */
            getClient(): Chainable<MatrixClient | undefined>;
            /**
             * Create a room with given options.
             * @param options the options to apply when creating the room
             * @return the ID of the newly created room
             */
            createRoom(options: ICreateRoomOpts): Chainable<string>;
            /**
             * Invites the given user to the given room.
             * @param roomId the id of the room to invite to
             * @param userId the id of the user to invite
             */
            inviteUser(roomId: string, userId: string): Chainable<{}>;
            /**
             * Joins the current user to the given room.
             * @param roomId the id of the room to join
             * @param opts the options when joining a room
             */
            joinRoom(roomId: string, opts?: IJoinRoomOpts): Chainable<{}>;
            /**
             * Waits for the given room to be synced locally
             * @param roomId the id of the room to wait for locally
             */
            waitForRoom(roomId: string): Chainable<string>;
        }
    }
}

Cypress.Commands.add("getClient", (): Chainable<MatrixClient | undefined> => {
    return cy.window({ log: false }).then(win => win.mxMatrixClientPeg.matrixClient);
});

Cypress.Commands.add("createRoom", (options: ICreateRoomOpts): Chainable<string> => {
    cy.window({ log: false })
        .then(async win => {
            const cli = win.mxMatrixClientPeg.matrixClient;
            const resp = await cli.createRoom(options);
            const roomId = resp.room_id;
            return roomId;
        })
        .as('roomId');

    return cy.get<string>("@roomId").then(roomId => {
        return cy.waitForRoom(roomId);
    });
});

Cypress.Commands.add("inviteUser", (roomId: string, userId: string): Chainable<{}> => {
    return cy.getClient().then(async (cli: MatrixClient) => {
        return cli.invite(roomId, userId);
    });
});

Cypress.Commands.add("joinRoom", (roomId: string, opts?: IJoinRoomOpts): Chainable<{}> => {
    cy.getClient().then(async (cli: MatrixClient) => {
        return cli.joinRoom(roomId, opts);
    });

    // Wait for the room to be available locally
    return cy.waitForRoom(roomId);
});

Cypress.Commands.add("waitForRoom", (roomId: string): Chainable<string> => {
    return cy.window({ log: false }).then(async win => {
        const cli = win.mxMatrixClientPeg.matrixClient;

        // Wait for the room to be available locally
        if (!cli.getRoom(roomId)) {
            await new Promise<void>(resolve => {
                const onRoom = (room: Room) => {
                    if (room.roomId === roomId) {
                        cli.off(win.matrixcs.ClientEvent.Room, onRoom);
                        resolve();
                    }
                };
                cli.on(win.matrixcs.ClientEvent.Room, onRoom);
            });
        }

        return roomId;
    });
});
