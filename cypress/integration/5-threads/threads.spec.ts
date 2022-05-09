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

describe("Threads", () => {
    let synapse: SynapseInstance;

    // Use a single test user for this suite
    before(() => {
        cy.startSynapse("consent").then(data => {
            synapse = data;

            cy.initTestUser(synapse, "Tom");
            cy.saveLocalStorage();
        });
    });

    after(() => {
        cy.stopSynapse(synapse);
        cy.clearLocalStorageSnapshot();
    });

    beforeEach(() => {
        cy.restoreLocalStorage();
    });

    it("should reload when enabling threads beta", () => {
        // mark our window object to "know" when it gets reloaded
        cy.window().then(w => w.beforeReload = true);

        cy.openUserSettings("Labs").within(() => {
            // initially the new property is there
            cy.window().should("have.prop", "beforeReload", true);

            cy.joinBeta("Threads");
            // after reload the property should be gone
            cy.window().should("not.have.prop", "beforeReload");
        });
    });

    it("should reload when disabling threads beta", () => {
        cy.openUserSettings("Labs").within(() => {
            cy.joinBeta("Threads");
        });

        // mark our window object to "know" when it gets reloaded
        cy.window().then(w => w.beforeReload = true);

        cy.openUserSettings("Labs").within(() => {
            // initially the new property is there
            cy.window().should("have.prop", "beforeReload", true);

            cy.leaveBeta("Threads");
            // after reload the property should be gone
            cy.window().should("not.have.prop", "beforeReload");
        });
    });
});
