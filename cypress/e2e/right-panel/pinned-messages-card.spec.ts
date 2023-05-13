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

const ROOM_NAME = "Test room";

describe("PinnedMessagesCard", () => {
    let homeserver: HomeserverInstance;

    /**
     * Send a message and pin it.
     * @param message Message to send and pin
     */
    const sendAndPin = (message: string) => {
        // Send a message
        cy.getComposer().type(`${message}{enter}`);

        // Assert that the event tile is rendered
        cy.contains(".mx_EventTile_last", `${message}`);

        // Hover the event tile and click the options button
        cy.get(".mx_EventTile_last").realHover().findByRole("button", { name: "Options" }).click();

        // Click the pin button
        cy.findByRole("menuitem", { name: "Pin" }).should("be.visible").click();
    };

    // Exclude timestamps from snapshots
    const percyCSS = ".mx_MessageTimestamp { visibility: hidden !important; }";

    beforeEach(() => {
        cy.startHomeserver("default").then((data) => {
            homeserver = data;
            cy.initTestUser(homeserver, "Hanako").then(() => {
                cy.createRoom({ name: ROOM_NAME });
            });
        });

        // Enable message pinning feature
        cy.enableLabsFeature("feature_pinning");

        cy.viewRoomByName(ROOM_NAME);

        // Send and pin a message
        sendAndPin("First pinned message");
    });

    afterEach(() => {
        cy.stopHomeserver(homeserver);
    });

    it("should update when messages are pinned", () => {
        // Assert that the button to display the pinned message card is rendered inside the room header, and click it
        cy.get(".mx_RoomHeader").within(() => {
            cy.findByRole("button", { name: "Pinned messages" }).should("be.visible").click();
        });

        // Send and pin the second message
        sendAndPin("The second one");

        // Assert that the pinned message card is rendered
        cy.get(".mx_PinnedMessagesCard").within(() => {
            // Assert that the pinned messages are rendered
            cy.get(".mx_PinnedEventTile").should("have.length", 2);
        });

        // Take a snapshot of RightPanel
        cy.get(".mx_RightPanel").percySnapshotElement("Pinned messages card - pinned messages", {
            percyCSS,
            widths: [264], // Emulate the UI. The value is based on minWidth specified on MainSplit.tsx
        });
    });

    it("should update when messages are unpinned", () => {
        cy.get(".mx_RoomHeader").within(() => {
            cy.findByRole("button", { name: "Pinned messages" }).should("be.visible").click();
        });

        sendAndPin("The second one");

        cy.get(".mx_PinnedMessagesCard").within(() => {
            cy.get(".mx_PinnedEventTile").should("have.length", 2);

            // Unpin the first message
            cy.get(".mx_PinnedEventTile").last().realHover().findByRole("button", { name: "Unpin" }).click();
            cy.get(".mx_PinnedEventTile").should("have.length", 1);

            // Unpin the second message
            cy.get(".mx_PinnedEventTile").last().realHover().findByRole("button", { name: "Unpin" }).click();
            cy.get(".mx_PinnedEventTile").should("have.length", 0);

            // Wait until the information about the empty state is rendered
            cy.get(".mx_PinnedMessagesCard_empty").should("exist");
        });

        // Take a snapshot of RightPanel
        cy.get(".mx_RightPanel").percySnapshotElement("Pinned messages card - empty", {
            percyCSS,
            widths: [264], // Emulate the UI. The value is based on minWidth specified on MainSplit.tsx
        });
    });

    it("should account for edits", () => {
        cy.get(".mx_RoomHeader").within(() => {
            cy.findByRole("button", { name: "Pinned messages" }).should("be.visible").click();
        });

        cy.get(".mx_RoomView_body").within(() => {
            // Hover the event tile and click the edit button
            cy.contains(".mx_EventTile", "First pinned message")
                .realHover()
                .findByRole("button", { name: "Edit" })
                .click();

            // Edit the message
            cy.get(".mx_EditMessageComposer").findByRole("textbox").type(", edited{enter}");
        });

        cy.get(".mx_PinnedMessagesCard").within(() => {
            cy.get(".mx_PinnedEventTile").should("have.length", 1);

            // Assert that the edited pinned message is rendered
            cy.get(".mx_PinnedEventTile .mx_EventTile_body").findByText("First pinned message, edited").should("exist");

            // Assert that text link button is rendered
            cy.findByRole("button", { name: /Edited/ }).should("exist");
        });

        // Take a snapshot of RightPanel
        cy.get(".mx_RightPanel").percySnapshotElement("Pinned messages card - an edited message", {
            percyCSS,
            widths: [264], // Emulate the UI. The value is based on minWidth specified on MainSplit.tsx
        });

        cy.get(".mx_PinnedMessagesCard").within(() => {
            cy.findByRole("button", { name: /Edited/ }).click();
        });

        // Assert that the message edit history dialog is rendered
        cy.get(".mx_MessageEditHistoryDialog").should("exist");
    });

    it("should support selecting a message via its 'view message' link", () => {
        sendAndPin("The second one");

        cy.get(".mx_RoomHeader").within(() => {
            cy.findByRole("button", { name: "Pinned messages" }).should("be.visible").click();
        });

        cy.get(".mx_PinnedMessagesCard").within(() => {
            cy.get(".mx_PinnedEventTile").should("have.length", 2);

            cy.get(".mx_PinnedEventTile")
                .last()
                .within(() => {
                    // Assert the first message is rendered
                    cy.get(".mx_EventTile_body").findByText("First pinned message").should("exist");

                    // Click "View message" link button
                    cy.findByRole("button", { name: "View message" }).click();
                });
        });

        cy.get(".mx_RoomView_body").within(() => {
            // Assert that the first message is selected
            cy.contains(".mx_EventTile_selected", "First pinned message");
        });

        cy.get(".mx_PinnedMessagesCard").within(() => {
            cy.get(".mx_PinnedEventTile")
                .first()
                .within(() => {
                    // Assert the second message is rendered
                    cy.get(".mx_EventTile_body").findByText("The second one").should("exist");

                    // Click "View message" link button
                    cy.findByRole("button", { name: "View message" }).click();
                });
        });

        cy.get(".mx_RoomView_body").within(() => {
            // Assert that the second message is selected
            cy.contains(".mx_EventTile_selected", "The second one");
        });
    });
});
