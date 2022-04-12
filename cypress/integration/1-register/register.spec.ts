/// <reference types="cypress" />

import { SynapseInstance } from "../../plugins/synapsedocker/index";

describe("Registration", () => {
    let synapseId;
    let synapsePort;

    beforeEach(() => {
        cy.task<SynapseInstance>("synapseStart", "consent").then(result => {
            synapseId = result.synapseId;
            synapsePort = result.port;
        });
        cy.visit("/#/register");
    })
 
    afterEach(() => {
        cy.task("synapseStop", synapseId);
    });
 
    it("registers an account and lands on the home screen", () => {
        cy.get(".mx_ServerPicker_change", { timeout: 20000 }).click();
        cy.get(".mx_ServerPickerDialog_otherHomeserver").type(`http://localhost:${synapsePort}`);
        cy.get(".mx_ServerPickerDialog_continue").click();
        // wait for the dialog to go away
        cy.get('.mx_ServerPickerDialog').should('not.exist')
        cy.get("#mx_RegistrationForm_username").type("alice");
        cy.get("#mx_RegistrationForm_password").type("tally me banana");
        cy.get("#mx_RegistrationForm_passwordConfirm").type("tally me banana");
        cy.get(".mx_Login_submit").click();
        cy.get(".mx_RegistrationEmailPromptDialog button.mx_Dialog_primary").click();
        cy.get(".mx_InteractiveAuthEntryComponents_termsPolicy input").click();
        cy.get(".mx_InteractiveAuthEntryComponents_termsSubmit").click();
        cy.url().should('contain', '/#/home')
    })
})
