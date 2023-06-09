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

describe("LeftPanel", () => {
    let homeserver: HomeserverInstance;

    beforeEach(() => {
        cy.startHomeserver("default").then((data) => {
            homeserver = data;

            cy.initTestUser(homeserver, "Hanako");
        });

        cy.get(".mx_LeftPanel").should("exist");
    });

    afterEach(() => {
        cy.stopHomeserver(homeserver);
    });

    describe("for room list wrapper", () => {
        beforeEach(() => {
            cy.get(".mx_LeftPanel_roomListWrapper").should("exist");
        });

        it("should display a message preview", () => {
            const message = "Message";

            cy.createRoom({ name: "Apple" }).viewRoomByName("Apple");

            cy.getComposer().type(`${message}{enter}`);

            // Enable message preview
            cy.get(".mx_LeftPanel_roomListWrapper").within(() => {
                cy.findByRole("treeitem", { name: "Rooms" })
                    .realHover()
                    .findByRole("button", { name: "List options" })
                    .click();
            });

            // Force click because the size of the checkbox is zero
            cy.findByLabelText("Show previews of messages").click({ force: true });

            // Assert that the preview is visible on the room tile
            cy.get(".mx_LeftPanel_roomListWrapper").within(() => {
                cy.findByRole("group", { name: "Rooms" }).within(() => {
                    cy.get(".mx_RoomTile_subtitle").findByText(message).should("be.visible");
                });
            });
        });

        describe("for Rooms", () => {
            it("should render a sublist", () => {
                cy.get(".mx_LeftPanel_roomListWrapper").within(() => {
                    cy.findByRole("group", { name: "Rooms" }).within(() => {
                        // create rooms and check room names are correct
                        cy.createRoom({ name: "Apple" }).then(() => cy.findByRole("treeitem", { name: "Apple" }));
                        cy.createRoom({ name: "Pineapple" }).then(() =>
                            cy.findByRole("treeitem", { name: "Pineapple" }),
                        );
                        cy.createRoom({ name: "Orange" }).then(() => cy.findByRole("treeitem", { name: "Orange" }));
                    });
                });
            });
        });
    });
});
