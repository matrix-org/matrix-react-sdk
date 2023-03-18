/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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

import type { EventType, MsgType } from "matrix-js-sdk/src/@types/event";
import type { ISendEventResponse } from "matrix-js-sdk/src/@types/requests";
import type { IContent } from "matrix-js-sdk/src/models/event";
import { SettingLevel } from "../../../src/settings/SettingLevel";
import { HomeserverInstance } from "../../plugins/utils/homeserver";
import Chainable = Cypress.Chainable;

const sendEvent = (roomId: string): Chainable<ISendEventResponse> => {
    return cy.sendEvent(roomId, null, "m.room.message" as EventType, {
        msgtype: "m.text" as MsgType,
        body: "Message",
    });
};

/** generate a message event which will take up some room on the page. */
function mkPadding(n: number): IContent {
    return {
        msgtype: "m.text" as MsgType,
        body: `padding ${n}`,
        format: "org.matrix.custom.html",
        formatted_body: `<h3>Test event ${n}</h3>\n`.repeat(10),
    };
}

describe("Editing", () => {
    let homeserver: HomeserverInstance;
    let roomId: string;

    beforeEach(() => {
        cy.startHomeserver("default").then((data) => {
            homeserver = data;
            cy.initTestUser(homeserver, "Edith").then(() => {
                cy.createRoom({ name: "Test room" }).then((_room1Id) => {
                    roomId = _room1Id;
                }),
                    cy.injectAxe();
            });
        });
    });

    afterEach(() => {
        cy.stopHomeserver(homeserver);
    });

    it("should render and interact with the message edit history dialog", () => {
        cy.visit("/#/room/" + roomId);

        // Send "Message"
        sendEvent(roomId);

        cy.get(".mx_RoomView_MessageList").within(() => {
            // Edit message
            cy.get(".mx_EventTile_last").realHover();
            cy.get(".mx_EventTile_last .mx_MessageActionBar_optionsButton", { timeout: 1000 })
                .should("exist")
                .realHover()
                .get('.mx_EventTile_last [aria-label="Edit"]')
                .click({ force: false });
            cy.get(".mx_BasicMessageComposer_input").type("{selectAll}{del}Massage{enter}");
        });

        // Assert that the edit label is visible
        cy.get(".mx_EventTile_edited").should("be.visible");

        cy.get(".mx_RoomView_MessageList").within(() => {
            // Assert that the message was edited
            cy.contains(".mx_EventTile", "Massage")
                .should("exist")
                .within(() => {
                    // Click to display the message edit history dialog
                    cy.contains(".mx_EventTile_edited", "(edited)").click();
                });
        });

        cy.get(".mx_Dialog").within(() => {
            // Assert that the message edit history dialog is rendered
            cy.get(".mx_MessageEditHistoryDialog").within(() => {
                // Assert that CSS styles which cannot be detected with snapshots are applied as expected
                cy.get("li").should("have.css", "clear", "both");
                cy.get(".mx_EventTile")
                    .should("have.css", "max-width", "100%")
                    .should("have.css", "clear", "both")
                    .should("have.css", "position", "relative")
                    .should("have.css", "padding-block-start", "0px");
                cy.get(".mx_EventTile .mx_MessageTimestamp")
                    .should("have.css", "position", "absolute")
                    .should("have.css", "inset-inline-start", "0px")
                    .should("have.css", "text-align", "center");
                cy.get(".mx_EventTile .mx_EventTile_content").should("have.css", "margin-inline-end", "0px");

                // Assert that the date separator is rendered
                cy.get("li:nth-child(1) .mx_DateSeparator").within(() => {
                    cy.get("h2").should("have.text", "Today");
                });

                // Assert that the original message is rendered
                cy.get("li:nth-child(3) .mx_EventTile").within(() => {
                    cy.get(".mx_EventTile_content .mx_EventTile_body").should("have.text", "Message");
                });

                // Assert that the edited message is rendered
                cy.get("li:nth-child(2) .mx_EventTile").within(() => {
                    cy.get(".mx_EventTile_content").within(() => {
                        cy.get(".mx_EventTile_body").should("have.text", "Meassage");

                        cy.get(".mx_EventTile_body").within(() => {
                            // "e" was replaced with "a"
                            cy.get(".mx_EditHistoryMessage_deletion").should("have.text", "e");
                            cy.get(".mx_EditHistoryMessage_insertion").should("have.text", "a");
                        });
                    });
                });
            });
        });

        // Exclude timestamps from a snapshot
        const percyCSS = ".mx_MessageTimestamp { visibility: hidden !important; }";

        // Take a snapshot
        cy.get(".mx_Dialog .mx_MessageEditHistoryDialog").percySnapshotElement("Message edit history dialog", {
            percyCSS,
            widths: [704], // See: .mx_Dialog_fixedWidth max-width
        });

        cy.get(".mx_Dialog").within(() => {
            // Click "Remove" button on MessageActionBar
            cy.get(".mx_MessageEditHistoryDialog").within(() => {
                // Assert that the edited message is rendered
                cy.get("li:nth-child(2) .mx_EventTile").within(() => {
                    // Click the "Remove" button
                    cy.get(".mx_EventTile_line")
                        .realHover()
                        .contains(".mx_AccessibleButton", "Remove")
                        .click({ force: false });
                });
            });

            // Do nothing and close the dialog to confirm that the message edit history dialog is rendered
            cy.get(".mx_TextInputDialog").within(() => {
                cy.get("[aria-label='Close dialog']").click();
            });

            // Assert that the message edit history dialog is rendered again after it was closed
            cy.get(".mx_MessageEditHistoryDialog").within(() => {
                // Assert that the edited message is rendered again
                cy.get("li:nth-child(2) .mx_EventTile").within(() => {
                    cy.get(".mx_EventTile_content").within(() => {
                        cy.get(".mx_EventTile_body").should("have.text", "Meassage");
                    });

                    // Click the "Remove" button again
                    cy.get(".mx_EventTile_line")
                        .realHover()
                        .contains(".mx_AccessibleButton", "Remove")
                        .click({ force: false });
                });
            });

            // This time remove the message really
            cy.get(".mx_TextInputDialog").within(() => {
                cy.get(".mx_TextInputDialog_input").type("This is a test."); // Reason
                cy.contains("[data-testid='dialog-primary-button']", "Remove").click();
            });

            // Assert that the message edit history dialog is rendered again
            cy.get(".mx_MessageEditHistoryDialog").within(() => {
                // Assert that the date is rendered
                cy.get("li:nth-child(1) .mx_DateSeparator").within(() => {
                    cy.get("h2").should("have.text", "Today");
                });

                // Assert that the original message is rendered on the dialog
                cy.get("li:nth-child(2) .mx_EventTile").within(() => {
                    cy.get(".mx_EventTile_content .mx_EventTile_body").should("have.text", "Message");
                });

                // Assert that the edited message is gone
                cy.get("li:nth-child(3) .mx_EventTile").should("not.exist");

                // Close the dialog
                cy.get("[aria-label='Close dialog']").click();
            });
        });

        // Assert that the main timeline is rendered
        cy.get(".mx_RoomView_MessageList").within(() => {
            cy.get(".mx_EventTile_last").within(() => {
                // Assert that the placeholder is rendered
                cy.contains(".mx_RedactedBody", "Message deleted");
            });
        });
    });

    it("should close the composer when clicking save after making a change and undoing it", () => {
        cy.visit("/#/room/" + roomId);

        sendEvent(roomId);

        // Edit message
        cy.contains(".mx_RoomView_body .mx_EventTile .mx_EventTile_line", "Message").within(() => {
            cy.get('[aria-label="Edit"]').click({ force: true }); // Cypress has no ability to hover
            cy.checkA11y();
            cy.get(".mx_BasicMessageComposer_input").type("Foo{backspace}{backspace}{backspace}{enter}");
            cy.checkA11y();
        });
        cy.contains(".mx_RoomView_body .mx_EventTile[data-scroll-tokens]", "Message");

        // Assert that the edit composer has gone away
        cy.get(".mx_EditMessageComposer").should("not.exist");
    });

    it("should correctly display events which are edited, where we lack the edit event", () => {
        // This tests the behaviour when a message has been edited some time after it has been sent, and we
        // jump back in room history to view the event, but do not have the actual edit event.
        //
        // In that scenario, we rely on the server to replace the content (pre-MSC3925), or do it ourselves based on
        // the bundled edit event (post-MSC3925).
        //
        // To test it, we need to have a room with lots of events in, so we can jump around the timeline without
        // paginating in the event itself. Hence, we create a bot user which creates the room and populates it before
        // we join.

        let testRoomId: string;
        let originalEventId: string;
        let editEventId: string;

        // create a second user
        const bobChainable = cy.getBot(homeserver, { displayName: "Bob", userIdPrefix: "bob_" });

        cy.all([cy.window({ log: false }), bobChainable]).then(async ([win, bob]) => {
            // "bob" now creates the room, and sends a load of events in it. Note that all of this happens via calls on
            // the js-sdk rather than Cypress commands, so uses regular async/await.

            const room = await bob.createRoom({ name: "TestRoom", visibility: win.matrixcs.Visibility.Public });
            testRoomId = room.room_id;
            cy.log(`Bot user created room ${room.room_id}`);

            originalEventId = (await bob.sendMessage(room.room_id, { body: "original", msgtype: "m.text" })).event_id;
            cy.log(`Bot user sent original event ${originalEventId}`);

            // send a load of padding events. We make them large, so that they fill the whole screen
            // and the client doesn't end up paginating into the event we want.
            let i = 0;
            while (i < 10) {
                await bob.sendMessage(room.room_id, mkPadding(i++));
            }

            // ... then the edit ...
            editEventId = (
                await bob.sendMessage(room.room_id, {
                    "m.new_content": { body: "Edited body", msgtype: "m.text" },
                    "m.relates_to": {
                        rel_type: "m.replace",
                        event_id: originalEventId,
                    },
                    "body": "* edited",
                    "msgtype": "m.text",
                })
            ).event_id;
            cy.log(`Bot user sent edit event ${editEventId}`);

            // ... then a load more padding ...
            while (i < 20) {
                await bob.sendMessage(room.room_id, mkPadding(i++));
            }
        });

        cy.getClient().then((cli) => {
            // now have the cypress user join the room, jump to the original event, and wait for the event to be
            // visible
            cy.joinRoom(testRoomId);
            cy.viewRoomByName("TestRoom");
            cy.visit(`#/room/${testRoomId}/${originalEventId}`);
            cy.get(`[data-event-id="${originalEventId}"]`).should((messageTile) => {
                // at this point, the edit event should still be unknown
                expect(cli.getRoom(testRoomId).getTimelineForEvent(editEventId)).to.be.null;

                // nevertheless, the event should be updated
                expect(messageTile.find(".mx_EventTile_body").text()).to.eq("Edited body");
                expect(messageTile.find(".mx_EventTile_edited")).to.exist;
            });
        });
    });
});
