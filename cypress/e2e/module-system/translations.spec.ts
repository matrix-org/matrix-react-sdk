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

import { HomeserverInstance } from "../../plugins/utils/homeserver";

describe("Custom translations module", () => {
    let homeserver: HomeserverInstance;

    beforeEach(() => {
        cy.enableModuleSystem();

        cy.window().then((win) => {
            win.localStorage.setItem("mx_lhs_size", "0"); // Collapse left panel for these tests
        });
        cy.startHomeserver("default").then((data) => {
            homeserver = data;

            cy.initTestUser(homeserver, "Tom");
        });
    });

    afterEach(() => {
        cy.stopHomeserver(homeserver);
    });

    it("should override the 'Welcome' translation", () => {
        cy.get("Howdy Tom (Changed by the Module System)");
    });
});
