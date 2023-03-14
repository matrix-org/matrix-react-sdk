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

describe("Labs user settings tab", () => {
    let homeserver: HomeserverInstance;

    beforeEach(() => {
        cy.startHomeserver("default").then((data) => {
            homeserver = data;
            cy.initTestUser(homeserver, "Hanako");
        });

        // Show labs settings
        cy.tweakConfig({ show_labs_settings: "true" });

        cy.openUserSettings("Labs");
    });

    afterEach(() => {
        cy.stopHomeserver(homeserver);
    });

    it("should be rendered properly", () => {
        cy.get(".mx_SettingsTab.mx_LabsUserSettingsTab").percySnapshotElement("User settings tab - Labs", {
            // Emulate TabbedView's actual min and max widths
            // 580: '.mx_UserSettingsDialog .mx_TabbedView' min-width
            // 796: 1036 (mx_TabbedView_tabsOnLeft actual width) - 240 (mx_TabbedView_tabPanel margin-right)
            widths: [580, 796],
        });
    });

    it("should support enabling and disabling the video room", () => {
        // Enable the video room
        cy.findByTestId("labs-beta-section")
            .get(".mx_BetaCard")
            .eq(0) // First BetaCard
            .within(() => {
                cy.get(".mx_BetaCard_title").findByText("Video rooms").should("exist");
                cy.findByRole("button", { name: "Join the beta" }).should("exist").click();
            });

        // Wait for the app to re-load
        cy.get(".mx_MatrixChat", { timeout: 15000 });

        // Click "Add room" button on the empty room list
        cy.get(".mx_LeftPanel").within(() => {
            cy.findByRole("button", { name: "Add room" }).click();
        });

        // Select "New video room" on the context menu
        cy.findByRole("menuitem", { name: "New video room" }).click();

        // Create a video room
        cy.get(".mx_Dialog .mx_CreateRoomDialog")
            .should("exist")
            .within(() => {
                cy.findByRole("textbox", { name: "Name" }).type("New video room");
                cy.findByRole("textbox", { name: "Topic (optional)" }).type("Video room's topic.");
                cy.findByRole("button", { name: "Create video room" }).click();
            });

        // Ensure the video room was created
        cy.get(".mx_RoomList").within(() => {
            cy.findByText("New video room").should("exist");
            cy.findByText(/Video/).should("exist"); // Regex pattern due to the camera icon
        });

        // Re-open the labs user settings
        cy.openUserSettings("Labs");

        cy.findByTestId("labs-beta-section")
            .get(".mx_BetaCard")
            .eq(0)
            .within(() => {
                // Assert that feedback button is rendered
                cy.findByRole("button", { name: "Feedback" }).should("exist");

                // Click "Leave the beta"
                cy.findByRole("button", { name: "Leave the beta" }).click();
            });

        // Wait for the app to re-load
        cy.get(".mx_MatrixChat", { timeout: 15000 });

        // Click "Show Labs settings"
        cy.get(".mx_RoomPreviewCard .mx_RoomPreviewCard_joinButtons").within(() => {
            cy.findByRole("button", { name: "Show Labs settings" }).click();

            // Ignore 404 room error
            Cypress.on("uncaught:exception", (err) => {
                return false;
            });
        });

        // Assert "Join the beta" button for the video room exists
        cy.findByTestId("labs-beta-section")
            .get(".mx_BetaCard")
            .eq(0)
            .within(() => {
                cy.findByRole("button", { name: "Join the beta" }).should("exist");
            });
    });

    it("should support enabling and disabling the sessions manager", () => {
        // Enable the new session manager
        cy.findByTestId("labs-beta-section")
            .get(".mx_BetaCard")
            .eq(1) // Second BetaCard
            .within(() => {
                cy.get(".mx_BetaCard_title").findByText("New session manager").should("exist");
                cy.findByRole("button", { name: "Join the beta" }).should("exist").click();
            });

        // Click "Sessions" tab on the settings tab
        cy.findByRole("tablist").within(() => {
            cy.findByRole("tab", { name: "Sessions" }).click();
        });

        // Assert that the Sesson tab is rendered
        cy.get(".mx_TabbedView_tabPanel h2").within(() => {
            cy.findByText("Sessions").should("exist");
        });

        // Click "Labs" tab
        cy.findByRole("tablist").within(() => {
            cy.findByRole("tab", { name: "Labs" }).click();
        });

        // Disable the new session manager
        cy.findByTestId("labs-beta-section")
            .get(".mx_BetaCard")
            .eq(1)
            .within(() => {
                cy.get(".mx_BetaCard_title").findByText("New session manager").should("exist");
                cy.findByRole("button", { name: "Leave the beta" }).click();
                cy.findByRole("button", { name: "Join the beta" }).should("exist");
            });
    });
});
