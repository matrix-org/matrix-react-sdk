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
import { UserCredentials } from "../../support/login";
import Chainable = Cypress.Chainable;

function asPromise<T>(thenable: Chainable<T>): Promise<T> {
    return new Promise(resolve => thenable.then(resolve));
}

async function waitForErrorBar(durationMS: number): Promise<JQuery<HTMLElement>> {
    const startMS = Date.now();
    while (startMS + durationMS <= Date.now()) {
        // Wait a little for the client-server-client interaction to complete.
        await new Promise(resolve => setTimeout(resolve, 1_000));
        const title = await asPromise(cy.get(".mx_RoomStatusBar_unsentMessages .mx_RoomStatusBar_unsentTitle"));
        if (!title) {
            // Still waiting for the error to show up.
            continue;
        }
        return title;
    }
}

describe("Room Status Bar", () => {
    let synapse: SynapseInstance;
    let user: UserCredentials;
    let roomId: string;

    beforeEach(() => {
        // Start a Synapse, create a user, create a room.
        return cy.startSynapse("default").then(data => {
            synapse = data;
            return cy.initTestUser(synapse, "Alice");
        }).then(data => {
            user = data;
            return cy.createRoom({});
        }).then(data => {
            roomId = data;
            cy.inviteUser(roomId, user.userId);
            cy.visit("/#/room/" + roomId);
        });
    });

    afterEach(() => {
        cy.stopSynapse(synapse);
    });


    it("shouldn't display an error message when there is no error", async () => {
        // User sends message
        cy.get(".mx_RoomView_body .mx_BasicMessageComposer_input").type("Hello, world{enter}");

        // Wait for message to send
        cy.get(".mx_RoomView_body .mx_EventTile").contains(".mx_EventTile[data-scroll-tokens]", "Hello, world");

        // Give an error a little time to show up. It shouldn't.
        const bar = await waitForErrorBar(1_000);
        if (bar) {
            throw new TypeError("In the absence of an error, we shouldn't be displaying an error message");
        }
    })

    async function checkErrorMessage(response, checkTitle) {
        cy.intercept({method: "PUT", url: "http://localhost:8080/_matrix/client/v3/rooms/*/state/*/*"}, response);
    
        // User sends message
        cy.get(".mx_RoomView_body .mx_BasicMessageComposer_input").type("Hello, world 2{enter}");

        // Wait for message to send
        cy.get(".mx_RoomView_body .mx_EventTile").contains(".mx_EventTile[data-scroll-tokens]", "Hello, world");

        // Give an error a little time to show up. It should.
        const bar = waitForErrorBar(10_000);
        if (!bar) {
            throw new TypeError("In presence of an error, we should be displaying an error message");
        }
        checkTitle(bar);
    }

    const USER_ACCOUNT_SUSPENDED = 'ORG.MATRIX.MSC3823.USER_ACCOUNT_SUSPENDED';
    const HREF = "http://example.org";

    it("should display a generic error if the error is not a user account suspension", () => checkErrorMessage({
        errcode: "SOME_OTHER_ERROR",
    }, (bar: JQuery<HTMLElement>) => {
        const text = bar.text();
        if (text.includes("Your account is suspended")) {
            throw new TypeError("Expected to NOT see 'Your account is suspended', got " + text);
        }
    }));

    it("should display a generic user account suspended if no href is provided", () => checkErrorMessage({
        errcode: USER_ACCOUNT_SUSPENDED
    }, bar => {
        const text = bar.text();
        if (!text.includes("Your account is suspended")) {
            throw new TypeError("Expected to see 'Your account is suspended', got " + text);
        }
        if (!text.includes("Please contact the administrator")) {
            throw new TypeError("Expected to see 'Please contact the administrator', got " + text);
        }
    }));
    it("should display a user account suspended with a link if a href is provided", () => checkErrorMessage({
        errcode: USER_ACCOUNT_SUSPENDED,
        href: HREF
    }, (bar: JQuery<HTMLElement>) => {
        const text = bar.text();
        if (!text.includes("Your account is suspended")) {
            throw new TypeError("Expected to see 'Your account is suspended', got " + text);
        }
        if (text.includes("Please contact the administrator")) {
            throw new TypeError("Expected to NOT see 'Please contact the administrator', got " + text);
        }
        for (let child of bar.children("a")) {
            if (child.getAttribute("href") == HREF) {
                // Found the link.
                return;
            }
        }
        throw new TypeError("Expected a link with the href, didn't find one");
    }));
});
