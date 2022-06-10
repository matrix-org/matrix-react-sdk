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

import { MatrixClient } from "../../../../matrix-js-sdk";
import { SynapseInstance } from "../../plugins/synapsedocker";
import Chainable = Cypress.Chainable;

function openSpotlightDialog(): Chainable<JQuery<HTMLElement>> {
    cy.get('.mx_RoomSearch_spotlightTrigger', { timeout: 15000 }).click({ force: true });
    return cy.get('[role=dialog][aria-label="Search Dialog"]');
}

/*
function clearFilter(): Chainable<JQuery<HTMLElement>> {
    return cy.get(".mx_SpotlightDialog_filter");
}
*/

function filterPeople(): Chainable<JQuery<HTMLElement>> {
    return cy.get("#mx_SpotlightDialog_button_startChat", { timeout: 15000 });
}

/*
function filterPublicRooms(): Chainable<JQuery<HTMLElement>> {
    return cy.get("#mx_SpotlightDialog_button_explorePublicRooms", { timeout: 15000 });
}
*/

function spotlightSearch(): Chainable<JQuery<HTMLInputElement>> {
    return cy.get(".mx_SpotlightDialog_searchBox input", { timeout: 15000 });
}

describe("Filter Results", () => {
    let synapse: SynapseInstance;

    const botName = "BotBob";
    let bot: MatrixClient;

    const roomName = "247";
    let roomId: string;

    beforeEach(() => {
        cy.enableLabsFeature("feature_spotlight");
        cy.startSynapse("default").then(data => {
            synapse = data;
            cy.initTestUser(synapse, "Jim");
            cy.getBot(synapse, botName).then(_bot => {
                bot = _bot;
            });

            cy.createRoom({ name: roomName }).then(_roomId => {
                roomId = _roomId;
                cy.inviteUser(roomId, bot.getUserId());
                cy.visit("/#/room/" + roomId);
            });
            cy.get('.mx_RoomSublist_skeletonUI').should('not.exist');
        });
    });

    afterEach(() => {
        cy.stopSynapse(synapse);
    });

    it("should find joined rooms", () => {
        openSpotlightDialog().within(() => {
            spotlightSearch().clear().type(roomName);
            const options = cy.get(".mx_SpotlightDialog_option");
            options.should("have.length", 3);
            options.first().should("contain", roomName);
        });
    });

    it("should find people", () => {
        openSpotlightDialog().within(() => {
            filterPeople().click();
            spotlightSearch().clear().type(botName);
            const options = cy.get(".mx_SpotlightDialog_option");
            options.should("have.length", 4);
            options.first().should("contain", botName);
        });
    });
});
