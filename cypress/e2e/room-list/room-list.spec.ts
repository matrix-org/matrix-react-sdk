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

import type { MatrixClient } from "matrix-js-sdk/src/client";
import { SynapseInstance } from "../../plugins/synapsedocker";

const ROOM_NAME1 = "Test room";
const ROOM_NAME2 = "New test room";
const NAME = "Alan";
const BOT_NAME1 = "BotBob";
const BOT_NAME2 = "BotAlice";

const enableMetaSpace = (title: string): void => {
    cy.openUserSettings();
    cy.contains("Sidebar").click();
    cy.get(`.mx_SidebarUserSettingsTab_${title}Checkbox`).click();
    cy.closeDialog();
    cy.get(`.mx_SpaceButton_${title}`).click();
};

describe("RoomList", () => {
    let synapse: SynapseInstance;

    let bot1: MatrixClient;

    let roomId: string;

    describe("plus buttons work correctly", () => {
        beforeEach(() => {
            cy.startSynapse("default").then(data => {
                synapse = data;
                cy.initTestUser(synapse, NAME).then(() =>
                    cy.window({ log: false }).then(() => {
                        cy.createRoom({ name: ROOM_NAME1 }).then(_room1Id => {
                            roomId = _room1Id;
                            cy.getClient().then((cli) => cli.setRoomTag(roomId, "m.favourite", {} as any));
                        });
                    }),
                ).then(() => {
                    cy.getBot(synapse, { displayName: BOT_NAME1 }).then(_bot1 => {
                        bot1 = _bot1;
                    });
                }).then(() => {
                    cy.getBot(synapse, { displayName: BOT_NAME2 }).then((_bot2) => {
                        cy.get('[aria-label="Favourites"] .mx_RoomSublist_auxButton').click();
                        cy.get('[aria-label="Start new chat"]').click();
                        cy.get(".mx_InviteDialog_editor").type(_bot2.getUserId());
                        cy.get(".mx_InviteDialog_goButton").click();

                        cy.get('[aria-label="Favourites"]').should("contain", BOT_NAME2);

                        // Dismiss the secure backup toast
                        cy.get(".mx_Toast_toast .mx_AccessibleButton_kind_danger_outline").click();
                    });
                });
            });
        });

        afterEach(() => {
            cy.stopSynapse(synapse);
        });

        describe("In home meta-space", () => {
            it("should show plus button context menu", () => {
                cy.get(".mx_RoomListHeader_plusButton").click();
                cy.get('[aria-label="Start new chat"]').should("have.length", 1);
                cy.get('[aria-label="New room"]').should("have.length", 1);
                cy.get('[aria-label="Join public room"]').should("have.length", 1);
            });

            it("should allow for creating a favourite using start new chat", () => {
                cy.get('[aria-label="Favourites"] .mx_RoomSublist_auxButton').click();
                cy.get('[aria-label="Start new chat"]').click();
                cy.get(".mx_InviteDialog_editor").type(bot1.getUserId());
                cy.get(".mx_InviteDialog_goButton").click();

                cy.get('[aria-label="Favourites"]').should("contain", BOT_NAME1);
            });

            it("should allow for creating a favourite using new room", () => {
                cy.get('[aria-label="Favourites"] .mx_RoomSublist_auxButton').click();
                cy.get('[aria-label="New room"]').click();
                cy.get(".mx_CreateRoomDialog_name").type(ROOM_NAME2);
                cy.get(".mx_Dialog_primary").click();

                cy.get('[aria-label="Favourites"]').should("contain", ROOM_NAME2);
            });
        });

        describe("In favourites meta-space", () => {
            beforeEach(() => {
                enableMetaSpace("favourites");
            });

            it("should allow for creating a favourite using new room", () => {
                cy.get(".mx_RoomListHeader_plusButton").click();
                cy.get('[aria-label="New room"]').click();
                cy.get(".mx_CreateRoomDialog_name").type(ROOM_NAME2);
                cy.get(".mx_Dialog_primary").click();

                cy.get('[aria-label="Favourites"]').should("contain", ROOM_NAME2);
            });

            it("should allow for creating a favourite using start new chat", () => {
                cy.get(".mx_RoomListHeader_plusButton").click();
                cy.get('[aria-label="Start new chat"]').click();
                cy.get(".mx_InviteDialog_editor").type(bot1.getUserId());
                cy.get(".mx_InviteDialog_goButton").click();

                cy.get('[aria-label="Favourites"]').should("contain", BOT_NAME1);
            });
        });

        describe("In people meta-space", () => {
            beforeEach(() => {
                enableMetaSpace("people");
            });

            it("should show invite dialog when clicking room-list header", () => {
                cy.get(".mx_RoomListHeader_plusButton").click();
                cy.get(".mx_InviteDialog_other").should("have.length", 1);
            });

            it("should show invite dialog when clicking people room-sublist header plus button", () => {
                cy.get('[aria-label="People"] .mx_RoomSublist_auxButton').click();
                cy.get(".mx_InviteDialog_other").should("have.length", 1);
            });

            it("should show invite dialog when clicking favourites room-sublist header plus button", () => {
                cy.get('[aria-label="Favourites"] .mx_RoomSublist_auxButton').click();
                cy.get(".mx_InviteDialog_other").should("have.length", 1);
            });
        });
    });
});
