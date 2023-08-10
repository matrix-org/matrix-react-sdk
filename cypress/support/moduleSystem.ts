/*
Copyright 2023 Nordeck IT + Consulting GmbH.

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

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Cypress {
        interface Chainable {
            // Enables the module system for the current session.
            enableModuleSystem(): void;
            moduleSystemPreviewRoom(roomId: string): void;
        }
    }
}

beforeEach(() => {
    cy.window().then((win) => {
        win.localStorage.removeItem("cypress_module_system_enable");
        win.localStorage.removeItem("cypress_module_system_preview_room_id");
    });
});

Cypress.Commands.add("enableModuleSystem", (): void => {
    cy.window().then((win) => {
        win.localStorage.setItem("cypress_module_system_enable", "true");
    });
});

Cypress.Commands.add("moduleSystemPreviewRoom", (roomId: string): void => {
    cy.window().then((win) => {
        win.localStorage.setItem("cypress_module_system_preview_room_id", roomId);
    });
});

// Needed to make this file a module
export {};
