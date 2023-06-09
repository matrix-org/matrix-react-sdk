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

import { MatrixClient } from "matrix-js-sdk/src/matrix";
import { EventType } from "matrix-js-sdk/src/@types/event";

import { HomeserverInstance } from "../../plugins/utils/homeserver";
import { SettingLevel } from "../../../src/settings/SettingLevel";

describe("LeftPanel", () => {
    let homeserver: HomeserverInstance;
    const roomName = "Test Room";

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

            cy.createRoom({ name: roomName }).viewRoomByName(roomName);

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

        describe("for Saved Items", () => {
            beforeEach(() => {
                // Enable Favorites
                cy.setSettingValue("feature_favourite_messages", null, SettingLevel.DEVICE, true);
            });

            it("should render a sublist", () => {
                cy.get(".mx_LeftPanel_roomListWrapper").within(() => {
                    cy.findByRole("group", { name: "Saved Items" }).within(() => {
                        cy.findByRole("treeitem", { name: "Favourite Messages" }).should("exist");
                    });
                });
            });
        });

        describe("for Favorites", () => {
            beforeEach(() => {
                cy.createRoom({ name: roomName });

                cy.get(".mx_LeftPanel_roomListWrapper").within(() => {
                    cy.findByRole("group", { name: "Rooms" }).within(() => {
                        cy.findByRole("treeitem", { name: roomName })
                            .realHover()
                            .findByRole("button", { name: "Room options" })
                            .click();
                    });
                });

                // Click "Favorite" on the context menu
                cy.findByRole("menuitemcheckbox", { name: "Favourite" }).click();

                cy.get(".mx_LeftPanel_roomListWrapper").within(() => {
                    // Assert that the favorite room list was rendered
                    cy.findByRole("group", { name: "Favourites" }).should("exist");
                });
            });

            it("should render a sublist", () => {
                cy.get(".mx_LeftPanel_roomListWrapper").within(() => {
                    cy.findByRole("group", { name: "Favourites" }).within(() => {
                        cy.findByRole("treeitem", { name: roomName }).should("exist");
                    });
                });
            });
        });

        describe("for People", () => {
            let bot: MatrixClient;
            const botName = "BotBob";

            beforeEach(() => {
                // Create a bot
                cy.getBot(homeserver, { displayName: botName }).then((_bot) => {
                    bot = _bot;
                });

                // Create DM with the bot
                cy.getClient().then(async (cli) => {
                    const botRoom = await cli.createRoom({ is_direct: true });
                    await cli.invite(botRoom.room_id, bot.getUserId());
                    await cli.setAccountData("m.direct" as EventType, {
                        [bot.getUserId()]: [botRoom.room_id],
                    });
                });
            });

            it("should render a sublist", () => {
                cy.get(".mx_LeftPanel_roomListWrapper").within(() => {
                    cy.findByRole("group", { name: "People" }).within(() => {
                        cy.findByRole("treeitem", { name: botName }).should("exist");
                    });
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

        describe("for Historical", () => {
            // Create a room and leave it
            beforeEach(() => {
                cy.createRoom({ name: roomName });

                cy.get(".mx_LeftPanel_roomListWrapper").within(() => {
                    cy.findByRole("group", { name: "Rooms" }).within(() => {
                        // Assert the room tile is rendered by default
                        cy.findByRole("treeitem", { name: roomName })
                            .realHover()
                            .findByRole("button", { name: "Room options" })
                            .click();
                    });
                });

                cy.findByRole("menuitem", { name: "Leave" }).click();
                cy.findByRole("button", { name: "Leave" }).click();

                cy.get(".mx_LeftPanel_roomListWrapper").within(() => {
                    // Wait until the user left the room
                    cy.findByRole("group", { name: "Historical" }).should("exist");
                });
            });

            it("should render a sublist", () => {
                cy.get(".mx_LeftPanel_roomListWrapper").within(() => {
                    // Assert that the room is rendered in "Historical" sublist
                    cy.findByRole("group", { name: "Historical" }).within(() => {
                        cy.get(".mx_RoomTile").findByText(roomName);
                    });
                });
            });

            it("should support removing a left room", () => {
                cy.get(".mx_LeftPanel_roomListWrapper").within(() => {
                    // Assert that the room is rendered in "Historical" sublist
                    cy.findByRole("group", { name: "Historical" }).within(() => {
                        cy.get(".mx_RoomTile").realHover().findByRole("button", { name: "Room options" }).click();
                    });
                });

                cy.findByRole("menuitem", { name: "Forget Room" }).click();

                cy.get(".mx_LeftPanel_roomListWrapper").within(() => {
                    // Assert that the "Historical" sublist group is gone
                    cy.findByRole("group", { name: "Historical" }).should("not.exist");

                    // Assert that Skelton UI is rendered instead
                    cy.get(".mx_RoomSublist_skeletonUI").should("exist");
                });
            });
        });

        describe("for Low Priority", () => {
            beforeEach(() => {
                cy.createRoom({ name: roomName });

                cy.get(".mx_LeftPanel_roomListWrapper").within(() => {
                    cy.findByRole("group", { name: "Rooms" }).within(() => {
                        // Assert the room tile is rendered by default
                        cy.findByRole("treeitem", { name: roomName })
                            .realHover()
                            .findByRole("button", { name: "Room options" })
                            .click();
                    });
                });

                // Click "Low Prioirity" on the context menu
                cy.findByRole("menuitemcheckbox", { name: "Low Priority" }).click();

                cy.get(".mx_LeftPanel_roomListWrapper").within(() => {
                    // Wait until the room is set to low priority
                    cy.findByRole("group", { name: "Low priority" }).should("exist");
                });
            });

            it("should render a sublist", () => {
                cy.get(".mx_LeftPanel_roomListWrapper").within(() => {
                    // Assert that the room is rendered in "Low priority" sublist
                    cy.findByRole("group", { name: "Low priority" }).within(() => {
                        cy.get(".mx_RoomTile").findByText(roomName);
                    });
                });
            });
        });
    });
});
