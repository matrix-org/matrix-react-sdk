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

import { SynapseInstance } from "../../plugins/synapsedocker";
import { MatrixClient } from "../../global";

function markWindowBeforeReload(): void {
    // mark our window object to "know" when it gets reloaded
    cy.window().then(w => w.beforeReload = true);
}

describe("Threads", () => {
    let synapse: SynapseInstance;

    beforeEach(() => {
        cy.window().then(win => {
            win.localStorage.setItem("mx_labs_feature_feature_thread", "true"); // Default threads to ON for this spec
        });
        cy.startSynapse("default").then(data => {
            synapse = data;

            cy.initTestUser(synapse, "Tom");
        });
    });

    afterEach(() => {
        cy.stopSynapse(synapse);
    });

    it("should reload when enabling threads beta", () => {
        markWindowBeforeReload();

        // Turn off
        cy.openUserSettings("Labs").within(() => {
            // initially the new property is there
            cy.window().should("have.prop", "beforeReload", true);

            cy.leaveBeta("Threads");
            // after reload the property should be gone
            cy.window().should("not.have.prop", "beforeReload");
        });

        cy.get(".mx_MatrixChat", { timeout: 15000 }); // wait for the app
        markWindowBeforeReload();

        // Turn on
        cy.openUserSettings("Labs").within(() => {
            // initially the new property is there
            cy.window().should("have.prop", "beforeReload", true);

            cy.joinBeta("Threads");
            // after reload the property should be gone
            cy.window().should("not.have.prop", "beforeReload");
        });
    });

    it("should be usable for a conversation", () => {
        let bot: MatrixClient;
        cy.getBot(synapse).then(_bot => {
            bot = _bot;
        });

        let roomId: string;
        cy.createRoom({}).then(_roomId => {
            roomId = _roomId;
            cy.inviteUser(roomId, bot.getUserId());
            cy.visit("/#/room/" + roomId);
        });

        // User sends message
        cy.get(".mx_RoomView_body .mx_BasicMessageComposer_input").type("Hello Mr. Bot{enter}");

        // Wait for message to send, get its ID and save as @threadId
        cy.get(".mx_RoomView_body .mx_EventTile").contains("Hello Mr. Bot")
            .closest(".mx_EventTile[data-scroll-tokens]").invoke("attr", "data-scroll-tokens").as("threadId");

        // Bot starts thread
        cy.get<string>("@threadId").then(threadId => {
            bot.sendMessage(roomId, threadId, {
                body: "Hello there",
                msgtype: "m.text",
            });
        });

        // User asserts timeline thread summary visible & clicks it
        cy.get(".mx_RoomView_body .mx_ThreadSummary").should("contain", "Hello there").click();

        // User responds in thread
        cy.get(".mx_ThreadView .mx_BasicMessageComposer_input").type("How are you?{enter}");

        // User asserts summary was updated correctly
        cy.get(".mx_RoomView_body .mx_ThreadSummary").should("contain", "How are you?");

        // User reacts to message instead
        cy.get(".mx_ThreadView .mx_EventTile").contains("Hello there").closest(".mx_EventTile_line")
            .find('[aria-label="React"]').click({ force: true }); // Cypress has no ability to hover
        cy.get(".mx_EmojiPicker").within(() => {
            cy.get('input[type="text"]').type("wave");
            cy.get('[role="menuitem"]').contains("👋").click();
        });

        // User redacts their prior response
        cy.get(".mx_ThreadView .mx_EventTile").contains("How are you?").closest(".mx_EventTile_line")
            .find('[aria-label="Options"]').click({ force: true }); // Cypress has no ability to hover
        cy.get(".mx_IconizedContextMenu").within(() => {
            cy.get('[role="menuitem"]').contains("Remove").click();
        });
        cy.get(".mx_TextInputDialog").within(() => {
            cy.get(".mx_Dialog_primary").contains("Remove").click();
        });

        // User asserts summary was updated correctly
        cy.get(".mx_RoomView_body .mx_ThreadSummary").should("contain", "Hello there");

        // User closes right panel
        cy.get(".mx_ThreadView .mx_BaseCard_close").click();

        // Bot responds to thread
        // User asserts thread list unread indicator
        // User opens thread list
        // User asserts thread with correct root & latest events & unread dot
        // User opens thread via threads list
        // User responds & asserts
        // User edits & asserts
        // User closes right panel
        // Bot responds
        // User asserts
        // Bot edits
        // User asserts
    });
});
