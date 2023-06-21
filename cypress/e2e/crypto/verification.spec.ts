/*
Copyright 2023 The Matrix.org Foundation C.I.C.

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

import type { VerificationRequest } from "matrix-js-sdk/src/crypto-api/verification";
import { CypressBot } from "../../support/bot";
import { HomeserverInstance } from "../../plugins/utils/homeserver";
import { skipIfRustCrypto } from "../../support/util";
import { checkDeviceIsCrossSigned, doTwoWaySasVerification, logIntoElement, waitForVerificationRequest } from "./utils";

describe("Device verification", () => {
    let aliceBotClient: CypressBot;
    let homeserver: HomeserverInstance;

    beforeEach(() => {
        skipIfRustCrypto();
        cy.startHomeserver("default").then((data: HomeserverInstance) => {
            homeserver = data;

            // Visit the login page of the app, to load the matrix sdk
            cy.visit("/#/login");

            // wait for the page to load
            cy.window({ log: false }).should("have.property", "matrixcs");

            // Create a new device for alice
            cy.getBot(homeserver, { bootstrapCrossSigning: true }).then((bot) => {
                aliceBotClient = bot;
            });
        });
    });

    afterEach(() => {
        cy.stopHomeserver(homeserver);
    });

    /* Click the "Verify with another device" button, and have the bot client auto-accept it.
     *
     * Stores the incoming `VerificationRequest` on the bot client as `@verificationRequest`.
     */
    function initiateAliceVerificationRequest() {
        // alice bot waits for verification request
        const promiseVerificationRequest = waitForVerificationRequest(aliceBotClient);

        // Click on "Verify with another device"
        cy.get(".mx_AuthPage").within(() => {
            cy.findByRole("button", { name: "Verify with another device" }).click();
        });

        // alice bot responds yes to verification request from alice
        cy.wrap(promiseVerificationRequest).as("verificationRequest");
    }

    it("Verify device during login with SAS", () => {
        logIntoElement(homeserver.baseUrl, aliceBotClient.getUserId(), aliceBotClient.__cypress_password);

        // Launch the verification request between alice and the bot
        initiateAliceVerificationRequest();

        // Handle emoji SAS verification
        cy.get(".mx_InfoDialog").within(() => {
            cy.get<VerificationRequest>("@verificationRequest").then((request: VerificationRequest) => {
                // the bot chooses to do an emoji verification
                const verifier = request.beginKeyVerification("m.sas.v1");

                // Handle emoji request and check that emojis are matching
                doTwoWaySasVerification(verifier);
            });

            cy.findByRole("button", { name: "They match" }).click();
            cy.findByRole("button", { name: "Got it" }).click();
        });

        // Check that our device is now cross-signed
        checkDeviceIsCrossSigned();
    });
});
