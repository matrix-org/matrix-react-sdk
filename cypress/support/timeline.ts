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

import Chainable = Cypress.Chainable;

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Cypress {
        interface Chainable {
            // Scroll to the top of the timeline
            scrollToTop(): void;
            // Find the event tile matching the given sender & body
            findEventTile(sender: string, body: string): Chainable<JQuery>;
        }
    }
}

export interface Message {
    sender: string;
    body: string;
    encrypted: boolean;
    continuation: boolean;
}

Cypress.Commands.add("scrollToTop", (): void => {
    let done = false;
    // set scrollTop to 0 in a loop and check every 50ms if content became available (scrollTop not being 0 anymore)
    // assume everything is loaded after 3s
    do {
        cy.get(".mx_RoomView_timeline .mx_ScrollPanel").scrollTo("top", { duration: 100 });
        cy.wait(100);
        cy.get(".mx_RoomView_timeline .mx_ScrollPanel").then(ref => {
            if (ref.scrollTop() === 0) {
                done = true;
            }
        });
    } while (!done);
});

Cypress.Commands.add("findEventTile", (sender: string, body: string): Chainable<JQuery> => {
    return cy.get(".mx_RoomView_MessageList .mx_EventTile")
        .contains(".mx_DisambiguatedProfile_displayName", sender).closest(".mx_EventTile")
        .contains("mx_EventTile_body", body).closest(".mx_EventTile");
});

// Needed to make this file a module
export { };
