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

import { MessageEvent } from "matrix-events-sdk";

import type { ISendEventResponse } from "matrix-js-sdk/src/@types/requests";
import type { EventType } from "matrix-js-sdk/src/@types/event";
import type { MatrixClient } from "matrix-js-sdk/src/client";
import { SynapseInstance } from "../../plugins/synapsedocker";
import { SettingLevel } from "../../../src/settings/SettingLevel";
import { Layout } from "../../../src/settings/enums/Layout";
import Chainable = Cypress.Chainable;

// The avatar size used in the timeline
const AVATAR_SIZE = 30;
// The resize method used in the timeline
const AVATAR_RESIZE_METHOD = "crop";

const ROOM_NAME = "Test room";
const OLD_AVATAR = "avatar_image1";
const NEW_AVATAR = "avatar_image2";
const OLD_NAME = "Alan";
const NEW_NAME = "Alan (away)";

const getEventTilesWithBodies = (): Chainable<JQuery> => {
    return cy.get(".mx_EventTile").filter((_i, e) => e.getElementsByClassName("mx_EventTile_body").length > 0);
};

const expectDisplayName = (e: JQuery<HTMLElement>, displayName: string): void => {
    expect(e.find(".mx_DisambiguatedProfile_displayName").text()).to.equal(displayName);
};

const expectAvatar = (e: JQuery<HTMLElement>, avatarUrl: string): void => {
    cy.getClient().then((cli: MatrixClient) => {
        expect(e.find(".mx_BaseAvatar_image").attr("src")).to.equal(
            // eslint-disable-next-line no-restricted-properties
            cli.mxcUrlToHttp(avatarUrl, AVATAR_SIZE, AVATAR_SIZE, AVATAR_RESIZE_METHOD),
        );
    });
};

const sendEvent = (roomId: string): Chainable<ISendEventResponse> => {
    return cy.sendEvent(
        roomId,
        null,
        "m.room.message" as EventType,
        MessageEvent.from("Message").serialize().content,
    );
};

describe("Timeline", () => {
    let synapse: SynapseInstance;

    let roomId: string;

    let oldAvatarUrl: string;
    let newAvatarUrl: string;

    describe("useOnlyCurrentProfiles", () => {
        beforeEach(() => {
            cy.startSynapse("default").then(data => {
                synapse = data;
                cy.initTestUser(synapse, OLD_NAME).then(() =>
                    cy.window({ log: false }).then(() => {
                        cy.createRoom({ name: ROOM_NAME }).then(_room1Id => {
                            roomId = _room1Id;
                        });
                    }),
                ).then(() => {
                    cy.uploadContent(OLD_AVATAR).then((url) => {
                        oldAvatarUrl = url;
                        cy.setAvatarUrl(url);
                    });
                }).then(() => {
                    cy.uploadContent(NEW_AVATAR).then((url) => {
                        newAvatarUrl = url;
                    });
                });
            });
        });

        afterEach(() => {
            cy.stopSynapse(synapse);
        });

        it("should show historical profiles if disabled", () => {
            cy.setSettingValue("useOnlyCurrentProfiles", null, SettingLevel.ACCOUNT, false);
            sendEvent(roomId);
            cy.setDisplayName("Alan (away)");
            cy.setAvatarUrl(newAvatarUrl);
            // XXX: If we send the second event too quickly, there won't be
            // enough time for the client to register the profile change
            cy.wait(500);
            sendEvent(roomId);
            cy.viewRoomByName(ROOM_NAME);

            const events = getEventTilesWithBodies();

            events.should("have.length", 2);
            events.each((e, i) => {
                if (i === 0) {
                    expectDisplayName(e, OLD_NAME);
                    expectAvatar(e, oldAvatarUrl);
                } else if (i === 1) {
                    expectDisplayName(e, NEW_NAME);
                    expectAvatar(e, newAvatarUrl);
                }
            });
        });

        it("should not show historical profiles if enabled", () => {
            cy.setSettingValue("useOnlyCurrentProfiles", null, SettingLevel.ACCOUNT, true);
            sendEvent(roomId);
            cy.setDisplayName(NEW_NAME);
            cy.setAvatarUrl(newAvatarUrl);
            // XXX: If we send the second event too quickly, there won't be
            // enough time for the client to register the profile change
            cy.wait(500);
            sendEvent(roomId);
            cy.viewRoomByName(ROOM_NAME);

            const events = getEventTilesWithBodies();

            events.should("have.length", 2);
            events.each((e) => {
                expectDisplayName(e, NEW_NAME);
                expectAvatar(e, newAvatarUrl);
            });
        });

        it("should create and configure a room on IRC layout", () => {
            cy.visit("/#/room/" + roomId);
            cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.IRC);
            cy.contains(".mx_RoomView_body .mx_GenericEventListSummary[data-layout=irc] " +
                ".mx_GenericEventListSummary_summary", "created and configured the room.");
            cy.percySnapshot("Configured room on IRC layout");
        });

        it("should click 'collapse' link button on the first hovered info event line on bubble layout", () => {
            cy.visit("/#/room/" + roomId);
            cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.Bubble);
            cy.contains(".mx_RoomView_body .mx_GenericEventListSummary[data-layout=bubble] " +
                ".mx_GenericEventListSummary_summary", "created and configured the room.");

            // Click "expand" link button
            cy.get(".mx_GenericEventListSummary_toggle[aria-expanded=false]").click();

            // Click "collapse" link button on the first hovered info event line
            cy.get(".mx_GenericEventListSummary_unstyledList .mx_EventTile_info:first-of-type").realHover()
                .get(".mx_GenericEventListSummary_toggle[aria-expanded=true]").click({ force: false });

            // Make sure "collapse" link button worked
            cy.get(".mx_GenericEventListSummary_toggle[aria-expanded=false]");
        });

        it("should select a hidden event line on IRC layout", () => {
            cy.setSettingValue("useOnlyCurrentProfiles", null, SettingLevel.ACCOUNT, false);

            // Enable hidden events and IRC layout
            cy.setSettingValue("showHiddenEventsInTimeline", null, SettingLevel.DEVICE, true);
            cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.IRC);

            cy.visit("/#/room/" + roomId);

            // Wait until configuration is finished
            cy.get(".mx_RoomView_body .mx_GenericEventListSummary[data-layout=irc] .mx_GenericEventListSummary_summary")
                .should("contain", "created and configured the room.");

            // User sends message
            cy.get(".mx_RoomView_body .mx_BasicMessageComposer_input").type("Hello{enter}");

            // Wait for message to send
            cy.get(".mx_RoomView_body .mx_EventTile").contains(".mx_EventTile[data-scroll-tokens]", "Hello")

            // Edit message
            cy.get(".mx_RoomView_body .mx_EventTile").contains(".mx_EventTile_line", "Hello").within(() => {
                cy.get('[aria-label="Edit"]').click({ force: true }); // Cypress has no ability to hover
                cy.get(".mx_BasicMessageComposer_input").type(" Edit{enter}");
            });
            cy.get(".mx_RoomView_body .mx_EventTile").contains(".mx_EventTile_line", "Hello Edit")

            // Click timestamp to select the hidden event line
            cy.get(".mx_RoomView_body .mx_EventTile_info .mx_MessageTimestamp").click();

            // Exclude timestamp from snapshot
            const percyCSS = ".mx_RoomView_body .mx_EventTile_info .mx_MessageTimestamp { visibility: hidden !important; }";
            cy.percySnapshot("Hidden event on IRC layout", { percyCSS });
        });
    });
});
