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

import type { MatrixClient } from "matrix-js-sdk/src/matrix";
import { SynapseInstance } from "../../plugins/synapsedocker";
import { UserCredentials } from "../../support/login";

function waitForEncryption(cli: MatrixClient, roomId: string, win: Cypress.AUTWindow): Promise<void> {
    return new Promise<void>(resolve => {
        const onEvent = () => {
            try {
                cli.crypto.cryptoStore.getEndToEndRooms(null, (result) => {
                    if (result[roomId]) {
                        cli.off(win.matrixcs.ClientEvent.Event, onEvent);
                        resolve();
                    }
                });
            } catch {
            }
        };
        cli.on(win.matrixcs.ClientEvent.Event, onEvent);
        onEvent();
    });
}

describe("Cryptography", () => {
    beforeEach(() => {
        cy.startSynapse("default").as('synapse').then(
            synapse => cy.initElementWithNewUser(synapse, "Alice").as("aliceCredentials"),
        );
    });

    afterEach(() => {
        cy.get<SynapseInstance>('@synapse').then(synapse => cy.stopSynapse(synapse));
    });

    it("should receive and decrypt encrypted messages", () => {
        cy.get<SynapseInstance>('@synapse').then(synapse => cy.registerBot(synapse, "Beatrice").as('bot'));

        cy.createRoom({
            initial_state: [
                {
                    type: "m.room.encryption",
                    state_key: '',
                    content: {
                        algorithm: "m.megolm.v1.aes-sha2",
                    },
                },
            ],
        }).as('roomId');

        cy.all([
            cy.get<MatrixClient>('@bot'),
            cy.get<string>('@roomId'),
            cy.window(),
        ]).then(([bot, roomId, win]) => {
            cy.inviteUser(roomId, bot.getUserId());
            cy.wrap(
                waitForEncryption(
                    bot, roomId, win,
                ).then(() => bot.sendMessage(roomId, {
                    body: "Top secret message",
                    msgtype: "m.text",
                })),
            );
            cy.visit("/#/room/" + roomId);
        });

        cy.get(".mx_RoomView_body .mx_cryptoEvent").should("contain", "Encryption enabled");

        cy.get(".mx_EventTile_body")
            .contains("Top secret message")
            .closest(".mx_EventTile_line")
            .should("not.have.descendants", ".mx_EventTile_e2eIcon_warning");
    });

    it("should display a banner when messages fail to decrypt", () => {
        cy.createRoom({
            initial_state: [
                {
                    type: "m.room.encryption",
                    state_key: '',
                    content: {
                        algorithm: "m.megolm.v1.aes-sha2",
                    },
                },
            ],
        }).as('roomId');

        cy.all([
            cy.getClient(),
            cy.get<string>('@roomId'),
        ]).then(([cli, roomId]) => {
            cy.visit("/#/room/" + roomId);
            cy.get(".mx_cryptoEvent").should("contain", "Encryption enabled").then(() =>
                cy.wrap(
                    cli.sendMessage(roomId, {
                        body: "Top secret message",
                        msgtype: "m.text",
                    }),
                ),
            );
        });

        cy.all([
            cy.get<SynapseInstance>('@synapse'),
            cy.get<UserCredentials>('@aliceCredentials'),
        ]).then(([synapse, credentials]) => {
            cy.window().then(win => { win.location.href = 'about:blank'; });
            cy.initElementWithExistingUser(synapse, credentials.userId, credentials.password, true);
        });

        cy.get<string>('@roomId').then(roomId => cy.visit("/#/room/" + roomId));

        cy.get(".mx_DecryptionFailureBar_message_headline").should("contain", "Decrypting messages...");
        cy.get(".mx_DecryptionFailureBar .mx_Spinner");

        // Spinner times out after 5 seconds
        cy.get(".mx_DecryptionFailureBar_message_headline", { timeout: 6000 })
            .should("contain", "Requesting keys to decrypt messages...");
        cy.get(".mx_DecryptionFailureBar .mx_DecryptionFailureBar_icon");

        // Decryption failure bar is shown/hidden as messages are scrolled in/out of the DOM
        cy.all([
            cy.getClient(),
            cy.get<string>('@roomId'),
        ]).then(([cli, roomId]) =>
            cy.wrap(cli.sendMessage(roomId, {
                body: "test\n".repeat(500),
                msgtype: "m.text",
            })),
        );
        cy.get(".mx_DecryptionFailureBar").should("not.exist");
        cy.get(".mx_ScrollPanel").scrollTo("top");
        cy.get(".mx_DecryptionFailureBar");
    });
});
