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
const USER_NAME_NEW = "Naomi";
const IntegrationManager = "scalar.vector.im";

describe("General user settings tab", () => {
    let homeserver: HomeserverInstance;

    beforeEach(() => {
        cy.startHomeserver("default").then((data) => {
            homeserver = data;
            cy.initTestUser(homeserver, USER_NAME);
        });

        cy.openUserSettings("General");
    });

    afterEach(() => {
        cy.stopHomeserver(homeserver);
    });

    it("should be rendered correctly", () => {
        cy.get(".mx_SettingsTab.mx_GeneralUserSettingsTab").within(() => {
            // Assert that the top heading is rendered
            cy.findByTestId("general").should("have.text", "General");

            cy.get(".mx_ProfileSettings_profile")
                .scrollIntoView()
                .within(() => {
                    // Check USER_NAME
                    cy.findByRole("textbox", { name: "Display Name" })
                        .get(`input[value='${USER_NAME}']`)
                        .should("be.visible");

                    // Assert that a random userId exists
                    cy.contains(".mx_ProfileSettings_profile_controls_userId", ":localhost").should("be.visible");

                    // Check avatar setting
                    cy.get(".mx_AvatarSetting_avatar")
                        .should("exist")
                        .realHover()
                        .get(".mx_AvatarSetting_avatar_hovering")
                        .within(() => {
                            // Hover effect
                            cy.get(".mx_AvatarSetting_hoverBg").should("exist");
                            cy.contains(".mx_AvatarSetting_hover span", "Upload");
                        });
                });

            // Wait until spinners disappear
            cy.get(".mx_GeneralUserSettingsTab_accountSection .mx_Spinner").should("not.exist");
            cy.get(".mx_GeneralUserSettingsTab_discovery .mx_Spinner").should("not.exist");

            cy.get(".mx_GeneralUserSettingsTab_accountSection").within(() => {
                // Assert that input areas for changing a password exist
                cy.get("form.mx_GeneralUserSettingsTab_changePassword")
                    .scrollIntoView()
                    .within(() => {
                        cy.findByLabelText("Current password").should("be.visible");
                        cy.findByLabelText("New password").should("be.visible");
                        cy.findByLabelText("Confirm password").should("be.visible");
                    });

                // Check email addresses area
                cy.get(".mx_EmailAddresses")
                    .scrollIntoView()
                    .within(() => {
                        cy.get("form.mx_EmailAddresses_new").should("be.visible");

                        cy.findByRole("button", { name: "Add" });
                    });

                // Check phone numbers area
                cy.get(".mx_PhoneNumbers")
                    .scrollIntoView()
                    .within(() => {
                        // Check form of a new phone number
                        cy.get("form.mx_PhoneNumbers_new").within(() => {
                            // Assert that an input area for a new phone number exists
                            cy.findByRole("textbox", { name: "Phone Number" }).should("be.visible");

                            // Check a new phone number dropdown menu
                            cy.get(".mx_PhoneNumbers_country")
                                .scrollIntoView()
                                .within(() => {
                                    // Check the default value
                                    cy.contains("#mx_CountryDropdown_value", "+44").should("be.visible");

                                    // Assert that the list item is rendered inside the dropdown
                                    cy.get(".mx_Dropdown_input[aria-expanded='false']")
                                        .should("exist")
                                        .click()
                                        .within(() => {
                                            cy.get("[aria-activedescendant='mx_CountryDropdown__GB']").should("exist");
                                        })
                                        .click(); // Click again to close the dropdown
                                });
                        });

                        cy.findByRole("button", { name: "Add" });
                    });
            });

            // Check language and region setting dropdown
            cy.get(".mx_GeneralUserSettingsTab_languageInput")
                .scrollIntoView()
                .within(() => {
                    // Check the default value
                    cy.contains("#mx_LanguageDropdown_value", "English").should("be.visible");

                    // Assert that the list item is rendered inside the dropdown
                    cy.get(".mx_Dropdown_input[aria-expanded='false']")
                        .should("exist")
                        .click()
                        .within(() => {
                            cy.get("[aria-activedescendant='mx_LanguageDropdown__id']").should("be.visible");
                        })
                        .click(); // Click again to close the dropdown
                });

            cy.get("form.mx_SetIdServer")
                .scrollIntoView()
                .within(() => {
                    // Assert that an input area for identity server exists
                    cy.findByRole("textbox", { name: "Enter a new identity server" }).should("be.visible");
                });

            // Check default integration manager
            cy.get(".mx_SetIntegrationManager")
                .scrollIntoView()
                .within(() => {
                    cy.contains(".mx_SetIntegrationManager_heading_manager", IntegrationManager).should("be.visible");

                    // Make sure integration manager's toggle switch is enabled
                    cy.get(".mx_ToggleSwitch_enabled").should("be.visible");
                });

            // Make sure the account deactivation button is displayed
            cy.get(
                ".mx_SettingsTab_section[data-testid='account-management-section'] .mx_AccessibleButton_kind_danger",
            ).should("have.text", "Deactivate Account");
        });
    });

    it("should support adding and removing a profile picture", () => {
        cy.get(".mx_SettingsTab.mx_GeneralUserSettingsTab .mx_ProfileSettings").within(() => {
            // Upload a picture
            cy.get(".mx_ProfileSettings_avatarUpload").selectFile("cypress/fixtures/riot.png", { force: true });

            // Find and click "Remove" link button
            cy.get(".mx_ProfileSettings_profile").within(() => {
                cy.findByRole("button", { name: "Remove" }).click();
            });

            // Assert that the link button disappeared
            cy.get(".mx_AvatarSetting_avatar .mx_AccessibleButton_kind_link_sm").should("not.exist");
        });
    });

    it("should support changing a display name", () => {
        cy.get(".mx_SettingsTab.mx_GeneralUserSettingsTab .mx_ProfileSettings").within(() => {
            // Change the diaplay name to USER_NAME_NEW
            cy.findByRole("textbox", { name: "Display Name" }).type(`{selectAll}{del}${USER_NAME_NEW}{enter}`);
        });

        cy.closeDialog();

        // Assert the avatar's initial characters are set
        cy.contains(".mx_UserMenu .mx_BaseAvatar_initial", "N").should("exist");
        cy.contains(".mx_RoomView_wrapper .mx_BaseAvatar_initial", "N").should("exist");
    });
});
