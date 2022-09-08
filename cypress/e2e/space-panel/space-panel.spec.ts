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
// import Chainable = Cypress.Chainable;

describe("Create Room", () => {
    let synapse: SynapseInstance;

    beforeEach(() => {
        cy.startSynapse("default").then(data => {
            synapse = data;

            cy.initTestUser(synapse, "Jim");
        });
    });

    afterEach(() => {
        cy.stopSynapse(synapse);
    });

    it("should persist state of collapsed after restart of app", () => {
        cy.get(".mx_SpacePanel").should("have.class", "collapsed");
        cy.get(".mx_SpacePanel_toggleCollapse").click();
        cy.get(".mx_SpacePanel").should("not.have.class", "collapsed");
        cy.reload(true);
        cy.get(".mx_SpacePanel").should("not.have.class", "collapsed");
    });
});
