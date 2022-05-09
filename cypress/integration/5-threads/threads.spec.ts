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

function markWindowBeforeReload(): void {
    // mark our window object to "know" when it gets reloaded
    cy.window().then(w => w.beforeReload = true);
}

describe("Threads", () => {
    let synapse: SynapseInstance;

    beforeEach(() => {
        cy.window().then(win => {
            win.localStorage.setItem("mx_labs_feature_feature_thread", "true"); // Default threads to ON for this spec
        });
        cy.startSynapse("consent").then(data => {
            synapse = data;

            cy.initTestUser(synapse, "Tom");
        });
    });

    afterEach(() => {
        cy.stopSynapse(synapse);
    });

    it("should reload when enabling threads beta", () => {
        markWindowBeforeReload();

        // Turn off
        cy.openUserSettings("Labs").within(() => {
            // initially the new property is there
            cy.window().should("have.prop", "beforeReload", true);

            cy.leaveBeta("Threads");
            // after reload the property should be gone
            cy.window().should("not.have.prop", "beforeReload");
        });

        cy.get(".mx_MatrixChat", { timeout: 15000 }); // wait for the app
        markWindowBeforeReload();

        // Turn on
        cy.openUserSettings("Labs").within(() => {
            // initially the new property is there
            cy.window().should("have.prop", "beforeReload", true);

            cy.joinBeta("Threads");
            // after reload the property should be gone
            cy.window().should("not.have.prop", "beforeReload");
        });
    });

    it("test", () => {
        // TODO
    });

    // describe("", () => {
    //     // User sends message
    //     // Bot starts thread
    //     // User asserts timeline thread summary visible & clicks it
    //     // User responds in thread
    //     // User asserts summary was updated correctly
    //     // User reacts to message instead
    //     // User redacts their prior response
    //     // User asserts summary was updated correctly
    //     // User closes right panel
    //     // Bot responds to thread
    //     // User asserts thread list unread indicator
    //     // User opens thread list
    //     // User asserts thread with correct root & latest events & unread dot
    //     // User opens thread via threads list
    //     // User responds & asserts
    //     // User edits & asserts
    //     // User closes right panel
    //     // Bot responds
    //     // User asserts
    //     // Bot edits
    //     // User asserts
    // });
});
