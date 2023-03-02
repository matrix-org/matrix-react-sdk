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

        // Wait until spinners disappear
        cy.get(".mx_GeneralUserSettingsTab_accountSection .mx_Spinner").should("not.exist");
        cy.get(".mx_GeneralUserSettingsTab_discovery .mx_Spinner").should("not.exist");

        // Make sure integration manager's toggle switch is enabled
        cy.get(".mx_SetIntegrationManager .mx_ToggleSwitch_enabled").should("exist");

        // Snapshot of mx_GeneralUserSettingsTab
        cy.get(".mx_SettingsTab.mx_GeneralUserSettingsTab").percySnapshotElement("General user settings tab");
    });
});
