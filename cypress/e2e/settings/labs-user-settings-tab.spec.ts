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

describe("Labs user settings tab", () => {
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

    it("should render labs user settings tab", () => {
        const checkBetaCards = (titles, captions) => {
            const items = titles.length; // assuming there is not a BetaCard without a title

            // Ensure other beta cards than specified are not rendered
            cy.get(".mx_BetaCard").should("have.length", items);

            titles.forEach((title) => {
                cy.contains(".mx_BetaCard_title", title);
            });

            captions.forEach((caption) => {
                cy.contains(".mx_BetaCard_caption", caption);
            });

            // Buttons area for each BetaCard
            cy.get(".mx_BetaCard_buttons").should("have.length", items);
        };

        const checkLabsGroup = (group, subheading, labels) => {
            const items = labels.length;

            cy.get(`[data-testid='labs-group-${group}']`).within(() => {
                cy.contains(".mx_SettingsTab_subheading", subheading);

                // Ensure other labels and their toggles than specified are not rendered
                cy.get(".mx_SettingsFlag_labelText").should("have.length", items);
                cy.get(".mx_ToggleSwitch").should("have.length", items);

                labels.forEach((label) => {
                    cy.contains(".mx_SettingsFlag_labelText", label);
                    cy.get(`.mx_ToggleSwitch[aria-label='${label}']`).should("exist");
                });
            });
        };

        // Show labs settings
        cy.tweakConfig({ show_labs_settings: "true" });

        cy.openUserSettings("Labs");

        cy.get(".mx_SettingsTab.mx_LabsUserSettingsTab").within(() => {
            // Ensure the top heading is rendered
            cy.get("[data-testid='heading']").should("have.text", "Upcoming features");

            // Ensure the text under the heading is rendered
            cy.contains("[data-testid='heading-text']", "What's next for");

            // Beta section
            cy.get("[data-testid='labs-beta-section']").within(() => {
                checkBetaCards(
                    ["Video rooms", "New session manager"],
                    [
                        "A new way to chat over voice and video in Element.",
                        "Have greater visibility and control over all your sessions.",
                    ],
                );
            });

            // Ensure "Early preview" is rendered
            cy.get("[data-testid='heading-labs']").should("have.text", "Early previews");

            // Ensure the text under the heading is rendered
            cy.contains("[data-testid='heading-labs-text']", "Feeling experimental?");

            // "Messaging" subsection
            checkLabsGroup(0, "Messaging", [
                "Render LaTeX maths in messages",
                "Message Pinning",
                "Rich text editor",
                "Live Location Sharing",
                "Favourite Messages",
                "Voice broadcast",
            ]);

            // "Spaces" subsection
            checkLabsGroup(2, "Spaces", ["Explore public spaces in the new search dialog"]);

            // "Rooms" subsection
            checkLabsGroup(4, "Rooms", [
                "Render simple counters in room header",
                "Show HTML representation of room topics",
                "Show info about bridges in room settings",
                "Use new room breadcrumbs",
                "Right panel stays open",
                "Polls history",
                "Dynamic room predecessors",
                "Hide notification dot (only display counters badges)",
            ]);

            // "Voice & Video" subsection
            checkLabsGroup(5, "Voice & Video", ["Element Call video rooms", "New group call experience"]);

            // "Moderation" subsection
            checkLabsGroup(6, "Moderation", [
                "Let moderators hide messages pending moderation.",
                "Report to moderators",
                "New ways to ignore people",
            ]);

            // "Analytics" subsection
            checkLabsGroup(7, "Analytics", [
                "Automatically send debug logs on any error",
                "Automatically send debug logs on decryption errors",
            ]);

            // "Message Previews" subsection
            checkLabsGroup(8, "Message Previews", [
                "Show message previews for reactions in DMs",
                "Show message previews for reactions in all rooms",
            ]);

            // "Themes" subsection
            checkLabsGroup(9, "Themes", ["Support adding custom themes"]);

            // "Encryption" subsection
            checkLabsGroup(10, "Encryption", ["Offline encrypted messaging using dehydrated devices"]);

            // "Experimental" subsection
            checkLabsGroup(11, "Experimental", ["Low bandwidth mode"]);

            // "Developer" subsection
            checkLabsGroup(12, "Developer", ["Sliding Sync mode", "Rust cryptography implementation"]);
        });

        cy.get(".mx_SettingsTab.mx_LabsUserSettingsTab").percySnapshotElement("Labs user settings tab");
    });
});
