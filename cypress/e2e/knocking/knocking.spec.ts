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

import { SynapseInstance } from "../../plugins/synapsedocker";
import Chainable = Cypress.Chainable;

function openCreateRoomDialog(): Chainable<JQuery<HTMLElement>> {
    cy.get('[aria-label="Add room"]').click();
    cy.get('.mx_ContextualMenu [aria-label="New room"]').click();
    return cy.get(".mx_CreateRoomDialog");
}

describe("Knocking", () => {
    let synapse: SynapseInstance;

    beforeEach(() => {
        cy.startSynapse("default").then(data => {
            synapse = data;

            cy.initTestUser(synapse, "Tom");
        });
    });

    afterEach(() => {
        cy.stopSynapse(synapse);
    });

    it("should be able to create a room with knock JoinRule", () => {
        // Enables labs flag feature
        cy.enableLabsFeature("feature_knocking");
        const name = "Test room 1";
        const topic = "This is a test room";

        // Create a room with knock JoinRule
        openCreateRoomDialog().within(() => {
            cy.get('[label="Name"]').type(name);
            cy.get('[label="Topic (optional)"]').type(topic);
            cy.get(".mx_JoinRuleDropdown").click();
            cy.get(".mx_JoinRuleDropdown_knock").click();
            cy.startMeasuring("from-submit-to-room");
            cy.get(".mx_Dialog_primary").click();
        });

        // The room settings initially are set to Ask to join
        cy.openRoomSettings("Security & Privacy");
        cy.closeDialog();

        //Check if the room settings are visible if labs flag is disabled
        cy.openUserSettings("Labs").within(() => {
            //disables labs flag feature
            cy.get("[aria-label='Knocking']").click();
            // cy.disableLabsFeature("feature_knocking");
        });
        cy.closeDialog();

        //the default joinRule is set to Private (invite only) when the labs flag is disabled
        cy.openRoomSettings("Security & Privacy");
        cy.closeDialog();

        // Click the expand link button to get more detailed view
        cy.get(".mx_GenericEventListSummary_toggle[aria-expanded=false]").click();

        cy.stopMeasuring("from-submit-to-room");
        cy.get(".mx_RoomHeader_nametext").contains(name);
        cy.get(".mx_RoomHeader_topic").contains(topic);
    });
});
