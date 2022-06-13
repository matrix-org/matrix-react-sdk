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

import { CryptoEvent } from "matrix-js-sdk/src/crypto";
import { VerificationRequest } from "matrix-js-sdk/src/crypto/verification/request/VerificationRequest";
import { MatrixClient } from "matrix-js-sdk/src/matrix";

import { SynapseInstance } from "../../plugins/synapsedocker";
import { UserCredentials } from "../../support/login";

const waitForVerificationRequest = (cli: MatrixClient): Promise<VerificationRequest> => {
    return new Promise<VerificationRequest>(resolve => {
        const onVerificationRequestEvent = (request: VerificationRequest) => {
            cli.off(CryptoEvent.VerificationRequest, onVerificationRequestEvent);
            resolve(request);
        };
        cli.on(CryptoEvent.VerificationRequest, onVerificationRequestEvent);
    });
};

describe("Starting a new DM", () => {
    let credentials: UserCredentials;
    let synapse: SynapseInstance;
    let bob: MatrixClient;

    const startDMWithBob = () => {
        cy.get('[data-test-id="create-chat-button"]').click();
        cy.get('[data-test-id="invite-dialog-input"]').type(bob.getUserId());
        cy.contains(".mx_InviteDialog_roomTile_name", "Bob").click();
        cy.contains(".mx_InviteDialog_userTile_pill .mx_InviteDialog_userTile_name", "Bob").should("exist");
        cy.get('[data-test-id="invite-dialog-go-button"]').click();
        cy.get('[data-test-id="basic-message-composer-input"]').should("have.focus").type("Hey!{enter}");
        cy.get(".mx_GenericEventListSummary_toggle").click();
        cy.contains(".mx_TextualEvent", "Alice invited Bob").should("exist");
    };

    const checkEncryption = () => {
        cy.contains(".mx_RoomView_body .mx_cryptoEvent", "Encryption enabled").should("exist");
        // @todo verify this message is really encrypted (e.g. by inspecting the message source)
        cy.contains(".mx_EventTile_body", "Hey!")
            .closest(".mx_EventTile_line")
            .should("not.have.descendants", ".mx_EventTile_e2eIcon_warning");
    };

    const joinBob = () => {
        cy.botJoinRoomByName(bob, "Alice").as("bobsRoom");
        cy.contains(".mx_TextualEvent", "Bob joined the room").should("exist");
    };

    const verify = () => {
        const bobsVerificationRequestPromise = waitForVerificationRequest(bob);
        cy.get('[data-test-id="room-info-button"]').click();
        cy.get(".mx_RoomSummaryCard_icon_people").click();
        cy.contains(".mx_EntityTile_name", "Bob").click();
        cy.contains(".mx_UserInfo_verifyButton", "Verify").click(),
        cy.wrap(bobsVerificationRequestPromise).then((verificationRequest: VerificationRequest) => {
            // ↓ doesn't work
            verificationRequest.accept();
        });
    };

    beforeEach(() => {
        cy.startSynapse("default").then(data => {
            synapse = data;
            cy.initTestUser(synapse, "Alice").then(_credentials => {
                credentials = _credentials;
            });
            cy.getBot(synapse, { displayName: "Bob", autoAcceptInvites: false }).then(_bob => {
                bob = _bob;
            });
        });
    });

    afterEach(() => {
        cy.stopSynapse(synapse);
    });

    it("should work, be e2e-encrypted, enable verification", () => {
        cy.setupKeyBackup(credentials.password);
        startDMWithBob();
        checkEncryption();
        joinBob();
        verify();
    });
});
