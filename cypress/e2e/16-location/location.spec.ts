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
import { mockGetCurrentPosition } from "../../support/location";

describe("Location sharing", () => {
    let synapse: SynapseInstance;

    const selectLocationShareTypeOption = (shareType: string): Chainable<JQuery> => {
        return cy.get(`[data-test-id="share-location-option-${shareType}"]`);
    };

    const submitShareLocation = (): void => {
        cy.get('[data-test-id="location-picker-submit-button"]').click();
    };

    const mockLocation = { latitude: 50.6090986, longitude: 165.9688683 };

    beforeEach(() => {
        mockGetCurrentPosition(mockLocation.latitude, mockLocation.longitude);
        cy.window().then(win => {
            win.localStorage.setItem("mx_lhs_size", "0"); // Collapse left panel for these tests
        });
        cy.startSynapse("default").then(data => {
            synapse = data;

            cy.initTestUser(synapse, "Tom");
        });
    });

    afterEach(() => {
        cy.stopSynapse(synapse);
    });

    it("sends and displays pin drop location message successfully", () => {
        let roomId: string;
        cy.createRoom({}).then(_roomId => {
            roomId = _roomId;
            cy.visit('/#/room/' + roomId);
        });

        cy.openMessageComposerOptions().within(() => {
            cy.get('[aria-label="Location"]').click();
        });

        selectLocationShareTypeOption('Pin').click();

        cy.get('#mx_LocationPicker_map').click('center');

        submitShareLocation();

        cy.get(".mx_RoomView_body .mx_EventTile .mx_MLocationBody", { timeout: 10000 })
            .should('exist')
            .click();

        // clicking location tile opens maximised map
        cy.get('.mx_LocationViewDialog_wrapper').should('exist');

        cy.get('[aria-label="Close dialog"]').click();

        cy.get('.mx_Marker')
            .should('exist');
    });

    it("sends and displays user current location message successfully", () => {
        let roomId: string;
        cy.createRoom({}).then(_roomId => {
            roomId = _roomId;
            cy.visit('/#/room/' + roomId);
        });

        cy.openMessageComposerOptions().within(() => {
            cy.get('[aria-label="Location"]').click();
        });

        selectLocationShareTypeOption('Own').click();

        // wait for geolocation to occur and enable submission
        cy.get('[data-test-id="location-picker-submit-button"][disabled]').should('not.exist');
        cy.get('.mx_Marker').should('exist');

        submitShareLocation();

        cy.get(".mx_RoomView_body .mx_EventTile .mx_MLocationBody", { timeout: 10000 })
            .should('exist')
            .click();

        // clicking location tile opens maximised map
        cy.get('.mx_LocationViewDialog_wrapper').should('exist');

        cy.get('[aria-label="Close dialog"]').click();

        // uses avatar marker for own location
        cy.get('.mx_Marker .mx_BaseAvatar')
            .should('exist');
    });
});
