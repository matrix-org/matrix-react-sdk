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

import * as crypto from "crypto";

import Chainable = Cypress.Chainable;
import AUTWindow = Cypress.AUTWindow;
import { DendriteInstance } from "../plugins/dendritedocker";

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Cypress {
        interface Chainable {
            /**
             * Start a dendrite instance with a given config template.
             * @param template path to template within cypress/plugins/dendritedocker/template/ directory.
             */
            startDendrite(template: string): Chainable<DendriteInstance>;

            /**
             * Custom command wrapping task:dendriteStop whilst preventing uncaught exceptions
             * for if Dendrite stopping races with the app's background sync loop.
             * @param dendrite the dendrite instance returned by startDendrite
             */
            stopDendrite(dendrite: DendriteInstance): Chainable<AUTWindow>;

            /**
             * Register a user on the given Dendrite using the shared registration secret.
             * @param dendrite the dendrite instance returned by startDendrite
             * @param username the username of the user to register
             * @param password the password of the user to register
             * @param displayName optional display name to set on the newly registered user
             */
            registerUser(
                dendrite: DendriteInstance,
                username: string,
                password: string,
                displayName?: string,
            ): Chainable<Credentials>;
        }
    }
}

function startDendrite(template: string): Chainable<DendriteInstance> {
    return cy.task<DendriteInstance>("dendriteStart", template);
}

function stopDendrite(dendrite?: DendriteInstance): Chainable<AUTWindow> {
    if (!dendrite) return;
    // Navigate away from app to stop the background network requests which will race with Dendrite shutting down
    return cy.window({ log: false }).then((win) => {
        win.location.href = "about:blank";
        cy.task("dendriteStop", dendrite.dendriteId);
    });
}

export interface Credentials {
    accessToken: string;
    userId: string;
    deviceId: string;
    homeServer: string;
}

function registerUser(
    synapse: DendriteInstance,
    username: string,
    password: string,
    displayName?: string,
): Chainable<Credentials> {
    const url = `${synapse.baseUrl}/_synapse/admin/v1/register`;
    return cy
        .then(() => {
            // get a nonce
            return cy.request<{ nonce: string }>({ url });
        })
        .then((response) => {
            const { nonce } = response.body;
            const mac = crypto
                .createHmac("sha1", synapse.registrationSecret)
                .update(`${nonce}\0${username}\0${password}\0notadmin`)
                .digest("hex");

            return cy.request<{
                access_token: string;
                user_id: string;
                home_server: string;
                device_id: string;
            }>({
                url,
                method: "POST",
                body: {
                    nonce,
                    username,
                    password,
                    mac,
                    admin: false,
                    displayname: displayName,
                },
            });
        })
        .then((response) => ({
            homeServer: response.body.home_server,
            accessToken: response.body.access_token,
            userId: response.body.user_id,
            deviceId: response.body.device_id,
        }));
}

Cypress.Commands.add("startDendrite", startDendrite);
Cypress.Commands.add("stopDendrite", stopDendrite);
Cypress.Commands.add("registerUser", registerUser);
