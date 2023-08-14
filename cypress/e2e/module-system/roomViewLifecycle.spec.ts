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

describe("RoomViewLifecycle", () => {
    let homeserver: HomeserverInstance;

    beforeEach(() => {
        cy.window().then((win) => {
            win.localStorage.setItem("mx_local_settings", '{"language":"en"}'); // Ensure the language is set to a consistent value
        });
        cy.startHomeserver("default").then((data) => {
            homeserver = data;

            cy.intercept(
                { method: "GET", pathname: "/config.json" },
                { body: { default_server_config: { "m.homeserver": { base_url: data.baseUrl } } } },
            );
        });
    });

    afterEach(() => {
        cy.stopHomeserver(homeserver);
    });

    it("should show login without the PreviewRoomNotLoggedIn lifecycle", () => {
        cy.visit(`/#/room/!example:localhost`);

        cy.contains("Join the conversation with an account");
        cy.contains("Sign Up");
        cy.contains("Sign In");
    });

    it("should show login with the PreviewRoomNotLoggedIn lifecycle", () => {
        // we must reload the page first, otherwise, the module system settings get lost...
        cy.visit("/");
        cy.contains("Welcome");

        // we need to set the data to local storage again because of the reload
        cy.window().then((win) => {
            win.localStorage.setItem("mx_local_settings", '{"language":"en"}'); // Ensure the language is set to a consistent value
        });
        cy.enableModuleSystem();
        cy.moduleSystemPreviewRoom("!example:localhost");

        cy.visit(`/#/room/!example:localhost`);
        cy.reload();

        cy.contains("Join the room to participate");
        cy.contains("Join");
    });
});
