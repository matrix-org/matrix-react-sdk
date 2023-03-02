/*
Copyright 2023 Suguru Hirahara

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

import { HomeserverInstance } from "../../plugins/utils/homeserver";

const USER_NAME = "Alice";

describe("General user settings tab", () => {
    let homeserver: HomeserverInstance;

    beforeEach(() => {
        cy.startHomeserver("default").then((data) => {
            homeserver = data;
            cy.initTestUser(homeserver, USER_NAME);
        });
    });

    afterEach(() => {
        cy.stopHomeserver(homeserver);
    });

    it("render general user settings tab", () => {
        cy.openUserSettings("General");
        cy.get(".mx_SettingsTab.mx_GeneralUserSettingsTab").within(() => {
            cy.get("[data-testid='general']").should("have.text", "General");
        });

        // Check a random userId is displayed
        cy.contains(".mx_ProfileSettings_profile_controls_userId", ":localhost");

        // Wait until spinners disappear
        cy.get(".mx_GeneralUserSettingsTab_accountSection .mx_Spinner").should("not.exist");
        cy.get(".mx_GeneralUserSettingsTab_discovery .mx_Spinner").should("not.exist");

        // Check input areas for password change are displayed
        cy.get("form.mx_GeneralUserSettingsTab_changePassword input[label='Current password']").should("be.visible");
        cy.get("form.mx_GeneralUserSettingsTab_changePassword input[label='New password']").should("be.visible");
        cy.get("form.mx_GeneralUserSettingsTab_changePassword input[label='Confirm password']").should("be.visible");

        // Check an input area for a new email address is displayed
        cy.get("form.mx_EmailAddresses_new input[label='Email Address']").should("be.visible");

        // Make sure integration manager's toggle switch is enabled
        cy.get(".mx_GeneralUserSettingsTab .mx_SetIntegrationManager .mx_ToggleSwitch_enabled").should("exist");

        // Exclude the random userId from snapshot
        const percyCSS = ".mx_ProfileSettings_profile_controls_userId { visibility: hidden !important; }";
        cy.get(".mx_SettingsTab.mx_GeneralUserSettingsTab").percySnapshotElement("General user settings tab");
    });
});
