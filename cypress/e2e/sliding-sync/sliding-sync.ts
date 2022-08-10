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
import { SettingLevel } from "../../../src/settings/SettingLevel";
import { Layout } from "../../../src/settings/enums/Layout";
import { ProxyInstance } from "../../plugins/sliding-sync";

describe("Sliding Sync", () => {
    beforeEach(() => {
        cy.startSynapse("default").as("synapse").then(synapse => {
            cy.startProxy(synapse).as("proxy");
        });

        cy.all([
            cy.get<SynapseInstance>("@synapse"),
            cy.get<ProxyInstance>("@proxy"),
        ]).then(([synapse, proxy]) => {
            cy.enableLabsFeature("feature_sliding_sync");

            cy.intercept("/config.json?cachebuster=*", req => {
                return req.continue(res => {
                    res.send(200, {
                        ...res.body,
                        sliding_sync_proxy_url: `http://localhost:${proxy.port}`,
                    });
                });
            });

            cy.initTestUser(synapse, "Sloth").then(() => {
                return cy.window({ log: false }).then(() => {
                    cy.createRoom({ name: "Test Room" }).as("roomId");
                });
            });
        });
    });

    afterEach(() => {
        cy.get<SynapseInstance>("@synapse").then(cy.stopSynapse);
        cy.get<ProxyInstance>("@proxy").then(cy.stopProxy);
    });

    // sanity check everything works
    it("should correctly render expected messages", () => {
        cy.get<string>("@roomId").then(roomId => cy.visit("/#/room/" + roomId));
        cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.IRC);

        // Wait until configuration is finished
        cy.contains(
            ".mx_RoomView_body .mx_GenericEventListSummary .mx_GenericEventListSummary_summary",
            "created and configured the room.",
        );

        // Click "expand" link button
        cy.get(".mx_GenericEventListSummary_toggle[aria-expanded=false]").click();
    });

    it.only("should render rooms in reverse chronological order", () => {
        // create rooms and check room names are correct
        cy.createRoom({ name: "Apple" }).as("roomApple").then(()=>cy.contains(".mx_RoomSublist", "Apple"));
        cy.createRoom({ name: "Pineapple" }).as("roomPineapple").then(()=>cy.contains(".mx_RoomSublist", "Pineapple"));
        cy.createRoom({ name: "Orange" }).as("roomOrange").then(()=>cy.contains(".mx_RoomSublist", "Orange"));
        // check the rooms are in the right order
        cy.get(".mx_RoomTile").should('have.length', 4); // due to the Test Room in beforeEach
    });
});
