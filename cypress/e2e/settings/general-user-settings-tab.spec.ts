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
            // Ensure the top heading is rendered
            cy.get("[data-testid='general']").should("have.text", "General");

            cy.get(".mx_ProfileSettings_profile").within(() => {
                // Check USER_NAME
                cy.get(`input[value='${USER_NAME}']`).should("exist");

                // Check a random userId exists
                cy.contains(".mx_ProfileSettings_profile_controls_userId", ":localhost");
            });

            // Wait until spinners disappear
            cy.get(".mx_GeneralUserSettingsTab_accountSection .mx_Spinner").should("not.exist");
            cy.get(".mx_GeneralUserSettingsTab_discovery .mx_Spinner").should("not.exist");

            // Check input areas for password change exist
            cy.get("form.mx_GeneralUserSettingsTab_changePassword").within(() => {
                cy.get("input[label='Current password']").should("exist");
                cy.get("input[label='New password']").should("exist");
                cy.get("input[label='Confirm password']").should("exist");
            });

            // Check an input area for a new email address exists
            cy.get("form.mx_EmailAddresses_new input[label='Email Address']").should("exist");

            // Check an input area for a new phone exists
            cy.get("form.mx_PhoneNumbers_new input[label='Phone Number']").should("exist");
            cy.contains("#mx_CountryDropdown_value", "+44");

            // Check language dropdown menu
            cy.get(".mx_GeneralUserSettingsTab_languageInput").should("have.text", "English");

            // Check an input area for identity server exists
            cy.get("form.mx_SetIdServer input[label='Enter a new identity server']").should("exist");

            // Check default integration manager
            cy.get(".mx_SetIntegrationManager").within(() => {
                cy.contains(".mx_SetIntegrationManager_heading_manager", "scalar.vector.im");

                // Make sure integration manager's toggle switch is enabled
                cy.get(".mx_ToggleSwitch_enabled").should("exist");
            });

            // Make sure the account deactivation button is displayed
            cy.get(
                ".mx_SettingsTab_section[data-testid='account-management-section'] .mx_AccessibleButton_kind_danger",
            ).should("have.text", "Deactivate Account");
        });

        // Exclude the random userId from snapshot
        const percyCSS = ".mx_ProfileSettings_profile_controls_userId { visibility: hidden !important; }";
        cy.get(".mx_SettingsTab.mx_GeneralUserSettingsTab").percySnapshotElement("General user settings tab", {
            percyCSS,
        });
    });
});
