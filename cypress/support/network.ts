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

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Cypress {
        interface Chainable {
            // Intercept all /_matrix/ networking requests for the logged-in user and fail them
            goOffline(): void;
            // Remove intercept on all /_matrix/ networking requests
            goOnline(): void;
            // Intercept calls to vector.im/matrix.org so a login page can be shown offline
            stubDefaultServer(): void;
        }
    }
}

// We manage intercepting Matrix APIs here, as fully disabling networking will disconnect
// the browser under test from the Cypress runner, so can cause issues.

Cypress.Commands.add("goOffline", (): void => {
    cy.log("Going offline");
    cy.window({ log: false }).then((win) => {
        cy.intercept(
            "**/_matrix/**",
            {
                headers: {
                    Authorization: "Bearer " + win.mxMatrixClientPeg.matrixClient.getAccessToken(),
                },
            },
            (req) => {
                req.destroy();
            },
        );
    });
});

Cypress.Commands.add("goOnline", (): void => {
    cy.log("Going online");
    cy.window({ log: false }).then((win) => {
        cy.intercept(
            "**/_matrix/**",
            {
                headers: {
                    Authorization: "Bearer " + win.mxMatrixClientPeg.matrixClient.getAccessToken(),
                },
            },
            (req) => {
                req.continue();
            },
        );
        win.dispatchEvent(new Event("online"));
    });
});

Cypress.Commands.add("stubDefaultServer", (): void => {
    cy.log("Stubbing vector.im and matrix.org network calls");
    // We intercept vector.im & matrix.org calls so that tests don't fail when it has issues
    cy.intercept("GET", "https://vector.im/_matrix/identity/v2", {
        fixture: "vector-im-identity-v2.json",
    });
    cy.intercept("GET", "https://matrix.org/.well-known/matrix/client", {
        fixture: "matrix-org-client-well-known.json",
    });
    cy.intercept("GET", "https://matrix-client.matrix.org/_matrix/client/versions", {
        fixture: "matrix-org-client-versions.json",
    });
    cy.intercept("GET", "https://matrix-client.matrix.org/_matrix/client/r0/login", {
        fixture: "matrix-org-client-login.json",
    });
    cy.intercept("POST", "https://matrix-client.matrix.org/_matrix/client/r0/register?kind=guest", {
        statusCode: 403,
        body: {
            errcode: "M_FORBIDDEN",
            error: "Registration is not enabled on this homeserver.",
        },
    });
});

// Needed to make this file a module
export {};
