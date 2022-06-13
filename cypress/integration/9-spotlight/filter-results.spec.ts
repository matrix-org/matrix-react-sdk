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

import { MatrixClient } from "../../global";
import { SynapseInstance } from "../../plugins/synapsedocker";
import Chainable = Cypress.Chainable;

function openSpotlightDialog(): Chainable<JQuery<HTMLElement>> {
    cy.get('.mx_RoomSearch_spotlightTrigger', { timeout: 15000 }).click({ force: true });
    return cy.get('[role=dialog][aria-label="Search Dialog"]');
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function clearFilter(): Chainable<JQuery<HTMLElement>> {
    return cy.get(".mx_SpotlightDialog_filter");
}

function filterPeople(): Chainable<JQuery<HTMLElement>> {
    return cy.get("#mx_SpotlightDialog_button_startChat", { timeout: 15000 });
}

function filterPublicRooms(): Chainable<JQuery<HTMLElement>> {
    return cy.get("#mx_SpotlightDialog_button_explorePublicRooms", { timeout: 15000 });
}

function spotlightSearch(): Chainable<JQuery<HTMLInputElement>> {
    return cy.get(".mx_SpotlightDialog_searchBox input", { timeout: 15000 });
}

function spotlightOptions(): Chainable<JQuery<HTMLElement>> {
    return cy.get(".mx_SpotlightDialog_section.mx_SpotlightDialog_results .mx_SpotlightDialog_option");
}

describe("Spotlight", () => {
    let synapse: SynapseInstance;

    const bot1Name = "BotBob";
    let bot1: MatrixClient;

    const bot2Name = "ByteBot";
    let bot2: MatrixClient;

    const room1Name = "247";
    let room1Id: string;

    const room2Name = "Lounge";
    let room2Id: string;

    beforeEach(() => {
        cy.enableLabsFeature("feature_spotlight");
        cy.startSynapse("default").then(data => {
            synapse = data;
            cy.initTestUser(synapse, "Jim").then(() =>
                cy.getBot(synapse, bot1Name).then(_bot1 => {
                    bot1 = _bot1;
                }),
            ).then(() =>
                cy.getBot(synapse, bot2Name).then(_bot2 => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    bot2 = _bot2;
                }),
            ).then(() =>
                cy.window({ log: false }).then(({ matrixcs: { Visibility } }) => {
                    cy.createRoom({ name: room1Name, visibility: Visibility.Public }).then(_room1Id => {
                        room1Id = _room1Id;
                        cy.inviteUser(room1Id, bot1.getUserId());
                        cy.visit("/#/room/" + room1Id);
                    });
                    bot2.createRoom({ name: room2Name, visibility: Visibility.Public })
                        .then(({ room_id: _room2Id }) => {
                            room2Id = _room2Id;
                            bot2.invite(room2Id, bot1.getUserId());
                        });
                }),
            ).then(() =>
                cy.get('.mx_RoomSublist_skeletonUI').should('not.exist'),
            );
        });
    });

    afterEach(() => {
        cy.stopSynapse(synapse);
    });

    it("should find joined rooms", () => {
        openSpotlightDialog().within(() => {
            spotlightSearch().clear().type(room1Name);
            spotlightOptions().should("have.length", 1);
            spotlightOptions().eq(0).should("contain", room1Name);
            spotlightOptions().eq(0).click();
            cy.url().should("contain", room1Id);
        });
    });

    it("should find known public rooms", () => {
        openSpotlightDialog().within(() => {
            filterPublicRooms().click();
            spotlightSearch().clear().type(room1Name);
            spotlightOptions().should("have.length", 1);
            spotlightOptions().eq(0).should("contain", room1Name);
            spotlightOptions().eq(0).click();
            cy.url().should("contain", room1Id);
        });
    });

    it("should find unknown public rooms", () => {
        openSpotlightDialog().within(() => {
            filterPublicRooms().click();
            spotlightSearch().clear().type(room2Name);
            spotlightOptions().should("have.length", 1);
            spotlightOptions().eq(0).should("contain", room2Name);
            spotlightOptions().eq(0).click();
            cy.url().should("contain", room2Id);
        });
    });

    it("should find known people", () => {
        openSpotlightDialog().within(() => {
            filterPeople().click();
            spotlightSearch().clear().type(bot1Name);
            spotlightOptions().should("have.length", 1);
            spotlightOptions().eq(0).should("contain", bot1Name);
        });
    });

    it("should find unknown people", () => {
        openSpotlightDialog().within(() => {
            filterPeople().click();
            spotlightSearch().clear().type(bot2Name);
            spotlightOptions().should("have.length", 1);
            spotlightOptions().eq(0).should("contain", bot2Name);
        });
    });

    it("should navigate results", () => {
        openSpotlightDialog().within(() => {
            filterPeople().click();
            spotlightSearch().clear().type("b");
            spotlightOptions().should("have.length", 2);
            spotlightOptions().eq(0).should("have.attr", "aria-selected", "true");
            spotlightOptions().eq(1).should("have.attr", "aria-selected", "false");
            spotlightSearch().type("{downArrow}");
            spotlightOptions().eq(0).should("have.attr", "aria-selected", "false");
            spotlightOptions().eq(1).should("have.attr", "aria-selected", "true");
            spotlightSearch().type("{downArrow}");
            spotlightOptions().eq(0).should("have.attr", "aria-selected", "false");
            spotlightOptions().eq(1).should("have.attr", "aria-selected", "false");
            spotlightSearch().type("{upArrow}");
            spotlightOptions().eq(0).should("have.attr", "aria-selected", "false");
            spotlightOptions().eq(1).should("have.attr", "aria-selected", "true");
            spotlightSearch().type("{upArrow}");
            spotlightOptions().eq(0).should("have.attr", "aria-selected", "true");
            spotlightOptions().eq(1).should("have.attr", "aria-selected", "false");
        });
    });
});
