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
             * Create a space with given options.
             * @param options the options to apply when creating the space
             * @return the ID of the newly created space (room)
             */
            createSpace(options: ICreateRoomOpts): Chainable<string>;
            /**
             * Invites the given user to the given room.
             * @param roomId the id of the room to invite to
             * @param userId the id of the user to invite
             */
            inviteUser(roomId: string, userId: string): Chainable<{}>;
            /**
             * Sets up key backup
             * @param password the user password
             * @return recovery key
             */
            setupKeyBackup(password: string): Chainable<void>;
            /**
             * Sets account data for the user.
             * @param type The type of account data.
             * @param data The data to store.
             */
            setAccountData(type: string, data: object): Chainable<{}>;
            /**
             * Gets the list of DMs with a given user
             * @param userId The ID of the user
             * @return the list of DMs with that user
             */
            getDmRooms(userId: string): Chainable<string[]>;
            /**
             * Boostraps cross-signing.
             */
            bootstrapCrossSigning(): Chainable<void>;
        }
    }
}

Cypress.Commands.add("setupKeyBackup", (password: string): Chainable<void> => {
    cy.get('[data-test-id="user-menu-button"]').click();
    cy.get('[data-test-id="user-menu-security-item"]').click();
    cy.get('[data-test-id="set-up-secure-backup-button"]').click();
    cy.get('[data-test-id="dialog-primary-button"]').click();
    cy.get('[data-test-id="copy-recovery-key-button"]').click();
    cy.get('[data-test-id="dialog-primary-button"]:not([disabled])').click();
    cy.get('#mx_Field_2').type(password);
    cy.get('[data-test-id="submit-password-button"]:not([disabled])').click();
    cy.contains('.mx_Dialog_title', 'Setting up keys').should('exist');
    cy.contains('.mx_Dialog_title', 'Setting up keys').should('not.exist');
    return;
});

Cypress.Commands.add("getClient", (): Chainable<MatrixClient | undefined> => {
    return cy.window({ log: false }).then(win => win.mxMatrixClientPeg.matrixClient);
});

Cypress.Commands.add("getDmRooms", (userId: string): Chainable<string[]> => {
    return cy.getClient()
        .then(cli => cli.getAccountData("m.direct")?.getContent<Record<string, string[]>>())
        .then(dmRoomMap => dmRoomMap[userId] ?? []);
});

Cypress.Commands.add("createRoom", (options: ICreateRoomOpts): Chainable<string> => {
    return cy.window({ log: false }).then(async win => {
        const cli = win.mxMatrixClientPeg.matrixClient;
        const resp = await cli.createRoom(options);
        const roomId = resp.room_id;

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

Cypress.Commands.add("createSpace", (options: ICreateRoomOpts): Chainable<string> => {
    return cy.createRoom({
        ...options,
        creation_content: {
            "type": "m.space",
        },
    });
});

Cypress.Commands.add("inviteUser", (roomId: string, userId: string): Chainable<{}> => {
    return cy.getClient().then(async (cli: MatrixClient) => {
        return cli.invite(roomId, userId);
    });
});

Cypress.Commands.add("setAccountData", (type: string, data: object): Chainable<{}> => {
    return cy.getClient().then(async (cli: MatrixClient) => {
        return cli.setAccountData(type, data);
    });
});

Cypress.Commands.add("bootstrapCrossSigning", () => {
    cy.window({ log: false }).then(win => {
        win.mxMatrixClientPeg.matrixClient.bootstrapCrossSigning({
            authUploadDeviceSigningKeys: async func => { await func({}); },
        });
    });
});
