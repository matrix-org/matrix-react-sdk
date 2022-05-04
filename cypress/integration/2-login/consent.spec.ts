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

describe("Consent", () => {
    let synapse: SynapseInstance;

    beforeEach(() => {
        cy.startSynapse("consent").then(data => {
            synapse = data;

            cy.initTestUser(synapse, "Bob");
        });
    });

    afterEach(() => {
        cy.stopSynapse(synapse);
    });

    it("should prompt the user to consent to terms when server deems it necessary", () => {
        // attempt to create a room using the js-sdk which should return an error with `M_CONSENT_NOT_GIVEN`
        cy.window().then(win => {
            win.mxMatrixClientPeg.matrixClient.createRoom({}).catch(() => {});
        });
        cy.get(".mx_QuestionDialog").within(() => {
            cy.get("#mx_BaseDialog_title").contains("Terms and Conditions");
            cy.get(".mx_Dialog_primary").click();
        });
        // attempt to perform the same action again and expect it to not fail
        cy.window().then(async (win) => {
            await win.mxMatrixClientPeg.matrixClient.createRoom({});
        });
    });
});
