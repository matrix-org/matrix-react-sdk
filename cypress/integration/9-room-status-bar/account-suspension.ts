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

describe("Room Status Bar", () => {
    const USER_ACCOUNT_SUSPENDED = 'ORG.MATRIX.MSC3823.USER_ACCOUNT_SUSPENDED';
    const HREF = "http://example.org";
    const TEXT = "Hello, world";

    let synapse: SynapseInstance;
    let roomId: string;

    beforeEach(() => {
        // Start a Synapse, create a user, create a room.
        return cy.startSynapse("default").then(data => {
            synapse = data;
            return cy.initTestUser(synapse, "Alice");
        }).then(_ => {
            return cy.createRoom({});
        }).then(data => {
            roomId = data;
            cy.visit("/#/room/" + roomId);
        });
    });

    afterEach(() => {
        // Attempting to stop Synapse breaks the tests.
        // Not sure what's going on here.
        // cy.stopSynapse(synapse);
    });

    it("shouldn't display an error message when there is no error", () => {
        // User sends message
        cy.get(".mx_RoomView_body .mx_BasicMessageComposer_input").type(`${TEXT}{enter}`);

        // Wait for message to send
        cy.get(".mx_RoomView_body .mx_EventTile").contains(".mx_EventTile[data-scroll-tokens]", TEXT);

        // Give an error a little time to show up. It shouldn't.
        cy.wait(1_000);
        cy.get(".mx_RoomStatusBar_unsentMessages .mx_RoomStatusBar_unsentTitle").should('not.exist');
    });

    it("should display a generic error if the error is not a user account suspension", () => {
        sendWithErrorResponse(TEXT, { errcode: "SOME_OTHER_ERROR" });
        cy.get(".mx_RoomStatusBar_unsentMessages .mx_RoomStatusBar_unsentTitle")
            .should('include.text', "Some of your messages have not been sent");
        cy.get(".mx_RoomStatusBar_unsentMessages .mx_RoomStatusBar_unsentTitle")
            .should('not.include.text', "Your account is suspended");
    });

    it("should display a generic user account suspended if no href is provided", () => {
        sendWithErrorResponse(TEXT, { errcode: USER_ACCOUNT_SUSPENDED });
        cy.get(".mx_RoomStatusBar_unsentMessages .mx_RoomStatusBar_unsentTitle")
            .should('include.text', "Your account is suspended");
        cy.get(".mx_RoomStatusBar_unsentMessages .mx_RoomStatusBar_unsentTitle")
            .should('include.text', "Please contact the administrator");
        cy.get(".mx_RoomStatusBar_unsentMessages .mx_RoomStatusBar_unsentTitle")
            .should('not.include.text', "To learn more, visit");
    });

    it("should display a user account suspended with a link if a href is provided", () => {
        sendWithErrorResponse(TEXT, {
            errcode: USER_ACCOUNT_SUSPENDED,
            href: HREF,
        });
        cy.get(".mx_RoomStatusBar_unsentMessages .mx_RoomStatusBar_unsentTitle")
            .should('include.text', "Your account is suspended");
        cy.get(".mx_RoomStatusBar_unsentMessages .mx_RoomStatusBar_unsentTitle")
            .should('not.include.text', "Please contact the administrator");
        cy.get(".mx_RoomStatusBar_unsentMessages .mx_RoomStatusBar_unsentTitle")
            .should('include.text', "To learn more, visit");
        cy.get(".mx_RoomStatusBar_unsentMessages .mx_RoomStatusBar_unsentTitle a")
            .should('have.attr', "href").and('include', HREF);
    });
});

// Pretend to send a message but inject an error response.
function sendWithErrorResponse(text, response) {
    cy.intercept("http://localhost:*/_matrix/client/r0/rooms/*/send/m.room.message/*", req => {
        req.reply({
            statusCode: 403,
            body: response,
        });
    });
    cy.viewport(1280, 1024);

    // User sends message
    cy.get(".mx_RoomView_body .mx_BasicMessageComposer_input").type(`${text}{enter}`);
}
