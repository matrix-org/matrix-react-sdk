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

describe("Set integration manager on General settings tab", () => {
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

    it("should set integration manager", () => {
        cy.openUserSettings("General");
        cy.contains("Manage integrations").should("exist");

        // Make sure integration manager's toggle switch is enabled
        cy.get(".mx_SetIntegrationManager .mx_ToggleSwitch_enabled").should("exist");

        // Check the default margin set to mx_SettingsTab_heading on the settings tab
        cy.get(".mx_SettingsTab > .mx_SettingsTab_heading").should("have.css", "margin-right", "100px");

        // Make sure the space between "Manage integrations" and the integration server address is set to 4px;
        cy.get(".mx_SettingsTab .mx_SetIntegrationManager_heading_manager > .mx_SettingsTab_heading").should(
            "have.css",
            "margin-inline-end",
            "0px",
        );
        cy.get(".mx_SettingsTab .mx_SetIntegrationManager_heading_manager > .mx_SettingsTab_subheading").should(
            "have.css",
            "margin-inline-end",
            "0px",
        );
        cy.get(".mx_SettingsTab .mx_SetIntegrationManager_heading_manager").should("have.css", "column-gap", "4px");

        cy.get(".mx_SettingsTab .mx_SetIntegrationManager_heading_manager").percySnapshotElement(
            "'Manage integrations' on General settings tab",
        );
    });
});
