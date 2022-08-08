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

import { MatrixClient } from "../../global";
import { SynapseInstance } from "../../plugins/synapsedocker";

describe("User Onboarding (new user)", () => {
    let synapse: SynapseInstance;

    const bot1Name = "BotBob";
    let bot1: MatrixClient;

    beforeEach(() => {
        cy.startSynapse("default").then(data => {
            synapse = data;
            cy.initTestUser(synapse, "Jane Doe");
            cy.window({ log: false }).then(win => {
                win.localStorage.setItem("mx_registration_time", "1656633601");
            });
            cy.reload().then(() => {
                // wait for the app to load
                return cy.get(".mx_MatrixChat", { timeout: 15000 });
            });
            cy.getBot(synapse, { displayName: bot1Name }).then(_bot1 => {
                bot1 = _bot1;
            });
            cy.get('.mx_UserOnboardingPage').should('exist');
        });
    });

    afterEach(() => {
        cy.stopSynapse(synapse);
    });

    it("page is shown", () => {
        cy.get('.mx_UserOnboardingPage').should('exist');
        cy.percySnapshot("User onboarding page");
    });

    it("app download dialog", () => {
        cy.get('.mx_UserOnboardingPage').should('exist');
        cy.contains(".mx_UserOnboardingTask_action", "Download apps").click();
        cy.get('[role=dialog]')
            .contains("#mx_BaseDialog_title", "Download Element")
            .should("exist");
        cy.percySnapshot("App download dialog");
    });

    it("using find friends action should increase progress", () => {
        cy.get(".mx_ProgressBar").invoke("val").then((oldProgress) => {
            const findPeopleAction = cy.contains(".mx_UserOnboardingTask_action", "Find friends");
            expect(findPeopleAction).to.exist;
            findPeopleAction.click();
            cy.get(".mx_InviteDialog_editor input").type(bot1.getUserId());
            cy.get(".mx_InviteDialog_buttonAndSpinner").click();
            cy.get(".mx_InviteDialog_buttonAndSpinner").should("not.exist");
            cy.visit("/#/home");

            cy.get(".mx_ProgressBar").invoke("val").should("be.greaterThan", oldProgress);
        });
    });
});
