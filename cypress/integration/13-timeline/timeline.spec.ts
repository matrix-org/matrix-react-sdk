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

import { EventType } from "matrix-js-sdk/src/@types/event";
import { MessageEvent } from "matrix-events-sdk";

import { SynapseInstance } from "../../plugins/synapsedocker";
import { SettingLevel } from "../../../src/settings/SettingLevel";
import Chainable = Cypress.Chainable;

const getEventTilesWithBodies = (): Chainable<JQuery> => {
    return cy.get(".mx_EventTile").filter((_i, e) => e.getElementsByClassName("mx_EventTile_body").length > 0);
};

const expectDisplayName = (e: JQuery<HTMLElement>, displayName: string): void => {
    expect(e.find(".mx_DisambiguatedProfile_displayName").text()).to.equal(displayName);
};

describe("Timeline", () => {
    let synapse: SynapseInstance;

    const roomName = "Test room";
    let roomId: string;

    describe("useOnlyCurrentProfiles", () => {
        beforeEach(() => {
            cy.startSynapse("default").then(data => {
                synapse = data;
                cy.initTestUser(synapse, "Alan").then(() =>
                    cy.window({ log: false }).then(() => {
                        cy.createRoom({ name: roomName }).then(_room1Id => {
                            roomId = _room1Id;
                        });
                    }),
                );
            });
        });

        afterEach(() => {
            cy.stopSynapse(synapse);
        });

        it("should show historical profiles if disabled", () => {
            cy.setSettingValue("useOnlyCurrentProfiles", null, SettingLevel.ACCOUNT, false);
            cy.sendEvent(roomId, null, EventType.RoomMessage, MessageEvent.from("Message 1").serialize().content);
            cy.setDisplayName("Alan (away)");
            cy.wait(500);
            cy.sendEvent(roomId, null, EventType.RoomMessage, MessageEvent.from("Message 2").serialize().content);
            cy.viewRoomByName(roomName);

            const events = getEventTilesWithBodies();

            events.should("have.length", 2);
            events.each((e, i) => {
                if (i === 0) expectDisplayName(e, "Alan");
                else if (i === 1) expectDisplayName(e, "Alan (away)");
            });
        });

        it("should not show historical profiles if enabled", () => {
            cy.setSettingValue("useOnlyCurrentProfiles", null, SettingLevel.ACCOUNT, true);
            cy.sendEvent(roomId, null, EventType.RoomMessage, MessageEvent.from("Message 1").serialize().content);
            cy.setDisplayName("Alan (away)");
            cy.wait(500);
            cy.sendEvent(roomId, null, EventType.RoomMessage, MessageEvent.from("Message 2").serialize().content);
            cy.viewRoomByName(roomName);

            const events = getEventTilesWithBodies();

            events.should("have.length", 2);
            events.each((e) => {
                expectDisplayName(e, "Alan (away)");
            });
        });
    });
});
