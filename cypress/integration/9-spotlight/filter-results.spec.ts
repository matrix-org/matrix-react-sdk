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

describe("Spotlight filtering", () => {
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
            cy.initTestUser(synapse, "Jim").then(() => cy.getBot(synapse, bot1Name).then(_bot1 => {
                bot1 = _bot1;
            })).then(() => cy.getBot(synapse, bot2Name).then(_bot2 => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                bot2 = _bot2;
            })).then(() => cy.window({ log: false }).then(({ matrixcs: { Visibility } }) => {
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
            })).then(() => cy.get('.mx_RoomSublist_skeletonUI').should('not.exist'));
        });
    });

    afterEach(() => {
        cy.stopSynapse(synapse);
    });

    it("should find joined rooms", () => {
        openSpotlightDialog().within(() => {
            spotlightSearch().clear().type(room1Name);
            const options = cy.get(".mx_SpotlightDialog_option");
            options.should("have.length", 3);
            options.first().should("contain", room1Name);
        });
    });

    it("should find known public rooms", () => {
        openSpotlightDialog().within(() => {
            filterPublicRooms().click();
            spotlightSearch().clear().type(room1Name);
            const options = cy.get(".mx_SpotlightDialog_option");
            options.should("have.length", 3);
            options.first().should("contain", room1Name);
        });
    });

    it("should find unknown public rooms", () => {
        openSpotlightDialog().within(() => {
            filterPublicRooms().click();
            spotlightSearch().clear().type(room2Name);
            const options = cy.get(".mx_SpotlightDialog_option");
            options.should("have.length", 3);
            options.first().should("contain", room2Name);
        });
    });

    it("should find known people", () => {
        openSpotlightDialog().within(() => {
            filterPeople().click();
            spotlightSearch().clear().type(bot1Name);
            const options = cy.get(".mx_SpotlightDialog_option");
            options.should("have.length", 4);
            options.first().should("contain", bot1Name);
        });
    });

    it("should find unknown people", () => {
        openSpotlightDialog().within(() => {
            filterPeople().click();
            spotlightSearch().clear().type(bot2Name);
            const options = cy.get(".mx_SpotlightDialog_option");
            options.should("have.length", 4);
            options.first().should("contain", bot2Name);
        });
    });
});
