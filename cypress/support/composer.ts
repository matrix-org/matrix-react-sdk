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
            getComposer(isRightPanel?: boolean): Chainable<JQuery>;
            // Find the event tile matching the given sender & body
            openMessageComposerOptions(isRightPanel?: boolean): Chainable<JQuery>;
        }
    }
}

Cypress.Commands.add("getComposer", (isRightPanel?: boolean): Chainable<JQuery> => {
    const panelClass = isRightPanel ? '.mx_RightPanel' : '.mx_RoomView_body';
    return cy.get(`${panelClass} .mx_MessageComposer`);
});

Cypress.Commands.add("openMessageComposerOptions", (isRightPanel?: boolean): Chainable<JQuery> => {
    return cy.getComposer(isRightPanel).within(() => {
        cy.get('[aria-label="More options"]').click();
    }).then(() => {
        return cy.get('.mx_MessageComposer_Menu');
    });
});

// Needed to make this file a module
export { };
