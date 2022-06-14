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

import type { VerificationRequest } from "matrix-js-sdk/src/crypto/verification/request/VerificationRequest";
import type { MatrixClient, Room } from "matrix-js-sdk/src/matrix";
import { SynapseInstance } from "../../plugins/synapsedocker";

const waitForVerificationRequest = (cli: MatrixClient): Promise<VerificationRequest> => {
    return new Promise<VerificationRequest>(resolve => {
        const onVerificationRequestEvent = (request: VerificationRequest) => {
            // @ts-ignore CryptoEvent is not exported to window.matrixcs; using the string value here
            cli.off("crypto.verification.request", onVerificationRequestEvent);
            resolve(request);
        };
        // @ts-ignore
        cli.on("crypto.verification.request", onVerificationRequestEvent);
    });
};

const checkDMRoom = () => {
    cy.contains(".mx_TextualEvent", "Alice invited Bob").should("exist");
    cy.contains(".mx_RoomView_body .mx_cryptoEvent", "Encryption enabled").should("exist");
};

describe("Cryptography", () => {
    let synapse: SynapseInstance;
    let bob: MatrixClient;

    const startDMWithBob = () => {
        cy.get('.mx_RoomList [aria-label="Start chat"]').click();
        cy.get('[data-test-id="invite-dialog-input"]').type(bob.getUserId());
        cy.contains(".mx_InviteDialog_tile_nameStack_name", "Bob").click();
        cy.contains(".mx_InviteDialog_userTile_pill .mx_InviteDialog_userTile_name", "Bob").should("exist");
        cy.get(".mx_InviteDialog_goButton").click();
    };

    const testMessages = () => {
        cy.get(".mx_BasicMessageComposer_input").should("have.focus").type("Hey!{enter}");
        cy.contains(".mx_EventTile_body", "Hey!")
            .closest(".mx_EventTile")
            .should("not.have.descendants", ".mx_EventTile_e2eIcon_warning")
            .should("have.descendants", ".mx_EventTile_receiptSent");

        // Bob sends a response
        cy.get<Room>("@bobsRoom").then((room) => {
            bob.sendTextMessage(room.roomId, "Hoo!");
        });
        cy.contains(".mx_EventTile_body", "Hoo!")
            .closest(".mx_EventTile")
            .should("not.have.descendants", ".mx_EventTile_e2eIcon_warning");
    };

    const bobJoin = () => {
        cy.botJoinRoomByName(bob, "Alice").as("bobsRoom");
        cy.contains(".mx_TextualEvent", "Bob joined the room").should("exist");
    };

    const verify = () => {
        const bobsVerificationRequestPromise = waitForVerificationRequest(bob);
        cy.get(".mx_RightPanel_roomSummaryButton").click();
        cy.get(".mx_RoomSummaryCard_icon_people").click();
        cy.contains(".mx_EntityTile_name", "Bob").click();
        cy.contains(".mx_UserInfo_verifyButton", "Verify").click(),
        cy.wrap(bobsVerificationRequestPromise).then((verificationRequest: VerificationRequest) => {
            // ↓ doesn't work - shows spinner
            verificationRequest.accept();
        });
        cy.pause();
    };

    beforeEach(() => {
        cy.startSynapse("default").then(data => {
            synapse = data;
            cy.initTestUser(synapse, "Alice");
            cy.getBot(synapse, { displayName: "Bob", autoAcceptInvites: false }).then(_bob => {
                bob = _bob;
            });
        });
    });

    afterEach(() => {
        cy.stopSynapse(synapse);
    });

    it("creating a DM should work, being e2e-encrypted / user verification", () => {
        cy.setUpKeyBackup();
        startDMWithBob();
        checkDMRoom();
        bobJoin();
        testMessages();
        verify();
    });
});
