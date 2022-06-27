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
import { SynapseInstance } from "../plugins/synapsedocker";

export interface UserCredentials {
    accessToken: string;
    userId: string;
    deviceId: string;
    password: string;
    homeServer: string;
}

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Cypress {
        interface Chainable {
            /**
             * Login an existing user on the given Synapse.
             * @param synapse the synapse instance returned by startSynapse
             * @param username the username of the user to login
             * @param password the password of the user to login
             */
            loginUser(synapse: SynapseInstance, username: string, password: string): Chainable<UserCredentials>;

            /**
             * Generates a test user and instantiates an Element session with that user.
             * @param synapse the synapse returned by startSynapse
             * @param displayName the displayName to give the test user
             * @param clearAllStorage whether to clear cookies and local storage,
             *   if you're initializing a new Element within a single test.
             */
            initElementWithNewUser(
                synapse: SynapseInstance,
                displayName: string,
                clearAllStorage?: boolean,
            ): Chainable<UserCredentials>;

            /**
             * Instantiates a new Element session with an existing user.
             * @param synapse the synapse returned by startSynapse
             * @param username the username of the user to login as
             * @param password the password of the user to login as
             * @param clearAllStorage whether to clear cookies and local storage,
             *   if you're initializing a new Element within a single test.
             */
            initElementWithExistingUser(
                synapse: SynapseInstance,
                username: string,
                password: string,
                clearAllStorage?: boolean,
            ): Chainable<UserCredentials>;
        }
    }
}

Cypress.Commands.add("loginUser", (
    synapse: SynapseInstance,
    username: string,
    password: string,
): Chainable<UserCredentials> => {
    const url = `${synapse.baseUrl}/_matrix/client/r0/login`;
    return cy.request<{
        access_token: string;
        user_id: string;
        device_id: string;
        home_server: string;
    }>({
        url,
        method: "POST",
        body: {
            "type": "m.login.password",
            "identifier": {
                "type": "m.id.user",
                "user": username,
            },
            "password": password,
        },
    }).then(response => ({
        homeServer: response.body.home_server,
        accessToken: response.body.access_token,
        userId: response.body.user_id,
        deviceId: response.body.device_id,
        password,
    }));
});

function initElement(synapse: SynapseInstance, credentials: UserCredentials): Chainable<UserCredentials> {
    cy.window({ log: false }).then(win => {
        // Seed the localStorage with the required credentials
        win.localStorage.setItem("mx_hs_url", synapse.baseUrl);
        win.localStorage.setItem("mx_user_id", credentials.userId);
        win.localStorage.setItem("mx_access_token", credentials.accessToken);
        win.localStorage.setItem("mx_device_id", credentials.deviceId);
        win.localStorage.setItem("mx_is_guest", "false");
        win.localStorage.setItem("mx_has_pickle_key", "false");
        win.localStorage.setItem("mx_has_access_token", "true");
    });

    return cy.visit("/").then(() => {
        // wait for the app to load
        return cy.get(".mx_MatrixChat", { timeout: 15000 });
    }).then(() => credentials);
}

// XXX: work around Cypress not clearing IDB between tests
function clearIDB() {
    cy.window({ log: false }).then(win => {
        win.indexedDB.databases().then(databases => {
            databases.forEach(database => {
                win.indexedDB.deleteDatabase(database.name);
            });
        });
    });
}

function clearStorage() {
    cy.clearCookies();
    cy.clearLocalStorage();
}

Cypress.Commands.add("initElementWithNewUser", (
    synapse: SynapseInstance,
    displayName: string,
    clearAllStorage?: boolean,
): Chainable<UserCredentials> => {
    if (clearAllStorage) {
        clearStorage();
    }
    clearIDB();
    const username = Cypress._.uniqueId("userId_");
    const password = Cypress._.uniqueId("password_");
    return cy.registerUser(synapse, username, password, displayName)
        .then(credentials => initElement(synapse, { ...credentials, password }));
});

Cypress.Commands.add("initElementWithExistingUser", (
    synapse: SynapseInstance,
    username: string,
    password: string,
    clearAllStorage?: boolean,
): Chainable<UserCredentials> => {
    if (clearAllStorage) {
        clearStorage();
    }
    clearIDB();
    return cy.loginUser(synapse, username, password)
        .then(credentials => initElement(synapse, credentials));
});
