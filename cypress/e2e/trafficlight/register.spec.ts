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

function recurse() {
    cy.log("Requesting next action...");
    const pollUrl = Cypress.env("TRAFFICLIGHT_URL") + "/client/" + Cypress.env("TRAFFICLIGHT_UUID") + "/poll";
    const respondUrl = Cypress.env("TRAFFICLIGHT_URL") + "/client/" + Cypress.env("TRAFFICLIGHT_UUID") + "/respond";
    cy.request(pollUrl).then((resp) => {
        expect(resp.status).to.eq(200);
        // promote response out of the callback for future use.
        const data = resp.body.data;
        const action = resp.body.action;
        cy.log("... got ", action, data);
        switch (action) {
            case "register":
                cy.get(".mx_ServerPicker_change", { timeout: 15000 }).click();
                cy.get(".mx_ServerPickerDialog_continue").should("be.visible");
                cy.get(".mx_ServerPickerDialog_otherHomeserver").type(data['homeserver_url']['local']);
                cy.get(".mx_ServerPickerDialog_continue").click();
                // wait for the dialog to go away
                cy.get('.mx_ServerPickerDialog').should('not.exist');
                cy.get("#mx_RegistrationForm_username").should("be.visible");
                // Hide the server text as it contains the randomly allocated Synapse port
                cy.get("#mx_RegistrationForm_username").type(data['username']);
                cy.get("#mx_RegistrationForm_password").type(data['password']);
                cy.get("#mx_RegistrationForm_passwordConfirm").type(data['password']);
                cy.get(".mx_Login_submit").click();
                cy.get('.mx_UseCaseSelection_skip > .mx_AccessibleButton').click();
                cy.request('POST', respondUrl, { response: "registered" }).then((response) => {
                    expect(response.status).to.eq(200);
                });
                break;
            case "login":
                cy.visit("http://localhost:8083/#/login");
                cy.get("#mx_LoginForm_username", { timeout: 15000 }).should("be.visible");
                cy.get(".mx_ServerPicker_change").click();
                cy.get(".mx_ServerPickerDialog_otherHomeserver").type(data['homeserver_url']['local']);
                cy.get(".mx_ServerPickerDialog_continue").click();
                // wait for the dialog to go away
                cy.get('.mx_ServerPickerDialog').should('not.exist');
                cy.get("#mx_LoginForm_username").type(data['username']);
                cy.get("#mx_LoginForm_password").type(data['password']);
                cy.get(".mx_Login_submit").click();
                cy.request('POST', respondUrl, { response: "loggedin" }).then((response) => {
                    expect(response.status).to.eq(200);
                });
                break;
            case "start_crosssign":
                cy.get('.mx_CompleteSecurity_actionRow > .mx_AccessibleButton').click();
                cy.request('POST', respondUrl, { response: "started_crosssign" }).then((response) => {
                    expect(response.status).to.eq(200);
                });
                break;
            case "accept_crosssign":
                // Can we please tag some buttons :)
                // Click "Verify" when it comes up
                cy.get('.mx_AccessibleButton_kind_primary').click();
                // Click to move to emoji verification
                cy.get('.mx_VerificationPanel_QRPhase_startOption > .mx_AccessibleButton').click();
                cy.request('POST', respondUrl, { response: "accepted_crosssign" }).then((response) => {
                    expect(response.status).to.eq(200);
                });
                break;
            case "verify_crosssign_emoji":
                cy.get('.mx_VerificationShowSas_buttonRow > .mx_AccessibleButton_kind_primary').click();
                cy.get('.mx_UserInfo_container > .mx_AccessibleButton').click();
                cy.request('POST', respondUrl, { response: "verified_crosssign" }).then((response) => {
                    expect(response.status).to.eq(200);
                });
                break;
            case "idle":
                cy.wait(5000);
                break;
            case "exit":
                cy.log("Client asked to exit, test complete or server teardown");
                return;
            default:
                cy.log("WARNING: unknown action ", action);
                return;
        }
        recurse();
    });
}

describe("traffic light cycle", () => {
    it("run trafficlight client", () => {
        cy.visit("http://localhost:8083/#/register");
        cy.log("Beginning recursion");
        recurse();
    });
});
