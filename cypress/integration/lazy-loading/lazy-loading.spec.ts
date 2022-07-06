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

import { SynapseInstance } from "../../plugins/synapsedocker";
import { MatrixClient } from "../../global";
import Chainable = Cypress.Chainable;

interface Charly {
    client: MatrixClient;
    displayName: string;
}

describe("Lazy Loading", () => {
    let synapse: SynapseInstance;
    const charlies: Charly[] = [];

    beforeEach(() => {
        cy.startSynapse("default").then(data => {
            synapse = data;

            cy.initTestUser(synapse, "Alice");

            cy.getBot(synapse, {
                displayName: "Bob",
                startClient: false,
                autoAcceptInvites: false,
            }).as("bob");

            for (let i = 1; i <= 10; i++) {
                const displayName = `Charly #${i}`;
                cy.getBot(synapse, {
                    displayName,
                    startClient: false,
                    autoAcceptInvites: false,
                }).then(client => {
                    charlies[i - 1] = { displayName, client };
                });
            }
        });
    });

    afterEach(() => {
        cy.stopSynapse(synapse);
    });

    const name = "Lazy Loading Test";
    const alias = "#lltest:localhost";
    const charlyMsg1 = "hi bob!";
    const charlyMsg2 = "how's it going??";

    function setupRoomWithBobAliceAndCharlies(charlies: Charly[]) {
        cy.all([
            cy.window({ log: false }),
            cy.get<MatrixClient>("@bob"),
        ]).then(([win, bob]) => {
            return cy.wrap(bob.createRoom({
                name,
                room_alias_name: "lltest",
                visibility: win.matrixcs.Visibility.Public,
            }).then(r => r.room_id)).as("roomId");
        });

        cy.get<string>("@roomId").then(roomId => {
            cy.wrap(Promise.all(charlies.map(charly => charly.client.joinRoom(alias))));

            for (const charly of charlies) {
                cy.botSendMessage(charly.client, roomId, charlyMsg1);
            }
            for (const charly of charlies) {
                cy.botSendMessage(charly.client, roomId, charlyMsg2);
            }
        });

        cy.all([
            cy.get<string>("@roomId"),
            cy.get<MatrixClient>("@bob"),
        ]).then(async ([roomId, bob]) => {
            for (let i = 20; i >= 1; --i) {
                cy.botSendMessage(bob, roomId, `I will only say this ${i} time(s)!`);
            }
        });

        cy.getClient().then(async (cli) => {
            await cli.joinRoom(alias);
            cy.viewRoomByName(name);
        });
    }

    function checkPaginatedDisplayNames(charlies: Charly[]) {
        cy.scrollToTop();
        charlies.forEach((charly, i) => {
            cy.findEventTile(charly.displayName, charlyMsg1).should("exist");
            cy.findEventTile(charly.displayName, charlyMsg2).should("exist");
        });
    }

    function getMembersInMemberlist(): Chainable<string[]> {
        cy.get('.mx_HeaderButtons [aria-label="Room Info"]').click();
        cy.get(".mx_RoomSummaryCard").within(() => {
            cy.get(".mx_RoomSummaryCard_icon_people").click();
        });

        return cy.get(".mx_MemberList .mx_EntityTile_name").then(names => Cypress._.map(names, "textContent"));
    }

    function checkMemberList(charlies: Charly[]) {
        getMembersInMemberlist().then(displayNames => {
            expect(displayNames).includes("alice");
            expect(displayNames).includes("bob");
            charlies.forEach(charly => {
                expect(displayNames).includes(charly.displayName);
            });
        });
    }

    function checkMemberListLacksCharlies(charlies: Charly[]) {
        getMembersInMemberlist().then(displayNames => {
            charlies.forEach(charly => {
                expect(displayNames).not.includes(charly.displayName);
            });
        });
    }

    function joinCharliesWhileAliceIsOffline(charlies: Charly[]) {
        cy.goOffline();
        cy.wait(1000); // TODO

        cy.get<string>("@roomId").then(async roomId => {
            for (const charly of charlies) {
                await charly.client.joinRoom(alias);
            }
            for (let i = 20; i >= 1; --i) {
                cy.botSendMessage(charlies[0].client, roomId, "where is charly?");
            }
        });

        cy.intercept("/sync").as("sync");
        cy.goOnline();
        cy.wait("@sync");
        cy.wait(2000); // TODO
    }

    it("should handle lazy loading properly even when offline", () => {
        const charly1to5 = charlies.slice(0, 5);
        const charly6to10 = charlies.slice(5);

        // Set up room with alice, bob & charlies 1-5
        setupRoomWithBobAliceAndCharlies(charly1to5);
        // Alice should see 2 messages from every charly with the correct display name
        checkPaginatedDisplayNames(charly1to5);

        checkMemberList(charly1to5);
        joinCharliesWhileAliceIsOffline(charly6to10);
        checkMemberList(charly6to10);

        cy.get<string>("@roomId").then(async roomId => {
            for (const charly of charlies) {
                await charly.client.leaveRoomChain(roomId);
            }
        });

        cy.wait(1000); // TODO
        checkMemberListLacksCharlies(charlies);
    });
});
