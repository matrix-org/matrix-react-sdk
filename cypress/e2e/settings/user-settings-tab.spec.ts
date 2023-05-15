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

const USER_NAME = "Bob";

describe("UserSettingsDialog", () => {
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

    it("should be rendered properly", () => {
        cy.openUserMenu().within(() => {
            cy.findByRole("menuitem", { name: "All settings" }).click();
        });

        // Assert that UserSettingsDialog is rendered
        cy.get(".mx_UserSettingsDialog").should("exist");

        // Exclude userId from a snapshot
        const percyCSS = ".mx_ProfileSettings_profile_controls_userId { visibility: hidden !important; }";

        // Take a snapshot of the dialog including its wrapper
        cy.get(".mx_Dialog_wrapper").percySnapshotElement("User settings dialog (General user settings tab)", {
            percyCSS,
        });
    });
});
