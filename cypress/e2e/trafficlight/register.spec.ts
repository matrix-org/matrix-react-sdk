/*
viCopyright 2022 The Matrix.org Foundation C.I.C.

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
          cy.log("Requesting next action...") 
          var poll_url = Cypress.env("TRAFFICLIGHT_URL") + "/client/" + Cypress.env("TRAFFICLIGHT_UUID") + "/poll"
          var respond_url = Cypress.env("TRAFFICLIGHT_URL") + "/client/" + Cypress.env("TRAFFICLIGHT_UUID") + "/respond"
          cy.request(poll_url).then((resp) => {
            expect(resp.status).to.eq(200);
            // promote response out of the callback for future use.
            var data = resp.body.data
            var action = resp.body.action
            cy.log("... got ", action, data)
            switch(action) {
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
        
                cy.request('POST', respond_url,{ response: "registered" }).then((response) => {
                  expect(response.status).to.eq(200);
                })
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
    
                cy.request('POST', respond_url,{ response: "loggedin" }).then((response) => {
                  expect(response.status).to.eq(200);
                })
                break;
              case "start_crosssign":
                cy.get('.mx_CompleteSecurity_actionRow > .mx_AccessibleButton').click();
                cy.request('POST', respond_url,{ response: "started_crosssign" }).then((response) => {
                  expect(response.status).to.eq(200);
                })
                break;
              case "accept_crosssign":
		// Can we please tag some buttons :)
		// Click "Verify" when it comes up
                cy.get('.mx_AccessibleButton_kind_primary').click();
                // Click to move to emoji verification
                cy.get('.mx_VerificationPanel_QRPhase_startOption > .mx_AccessibleButton').click()
                //cy.get(':nth-child(3) > .mx_AccessibleButton').click();
                cy.request('POST', respond_url,{ response: "accepted_crosssign" }).then((response) => {
                  expect(response.status).to.eq(200);
                })
                break;
              case "verify_crosssign_emoji":
                cy.get('.mx_VerificationShowSas_buttonRow > .mx_AccessibleButton_kind_primary').click()
                cy.get('.mx_UserInfo_container > .mx_AccessibleButton').click()
                cy.request('POST', respond_url,{ response: "verified_crosssign" }).then((response) => {
                  expect(response.status).to.eq(200);
                })
                break 
              case "idle": 
                cy.wait(5000)
                break;
              case "exit": 
                cy.log("Client asked to exit, test complete or server teardown")
                return;
              default:
                cy.log("WARNING: unknown action ", action)
		return;
            }
        recurse()
	
        })

}


describe("traffic light cycle", () => {

    // Ideally ensure this is a fresh cypress visit, rather than re-using
    // TODO: validate; possibly by having more than one test in the entire framework.
    beforeEach(() => {
    });

    it("run trafficlight client", () => {
          cy.visit("http://localhost:8083/#/register");
          cy.log("Beginning recursion")
          recurse()
    });
});
