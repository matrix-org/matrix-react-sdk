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
import type { UserCredentials } from "../../support/login";
import { SettingLevel } from "../../../src/settings/SettingLevel";
import type { Room } from "matrix-js-sdk/src/models/room";
import type { Preset } from "matrix-js-sdk/src/@types/partials";

function createJoinStateEventsForBatchSendRequest(
    virtualUserIDs: string[],
	insertTimestamp: number,
) {
    return virtualUserIDs.map((virtualUserID, index) => {
        return {
            "content": {
                "displayname": `some-display-name-for-${virtualUserID}`,
                "membership": "join"
            },
            "origin_server_ts": insertTimestamp + index,
            "sender": virtualUserID,
            "state_key": virtualUserID,
            "type": "m.room.member"
        }
    });
}

let batchCount = 0;
function createMessageEventsForBatchSendRequest(
    virtualUserIDs: string[],
	insertTimestamp: number,
	count: number,
) {
    const messageEvents = [...Array(count).keys()].map((i) => {
        const virtualUserID = virtualUserIDs[i % virtualUserIDs.length];

        return {
            "content": {
                "body": `Historical ${i} (batch=${batchCount})`,
                "msgtype": "m.text",
                "org.matrix.msc2716.historical": true
            },
            "origin_server_ts": insertTimestamp + i,
            "sender": virtualUserID,
            "type": "m.room.message"
        };
    });

    batchCount++;

    return messageEvents;
}

function waitForEventIdsInClient(eventIds: string[]) {
    eventIds.forEach((eventId) => {
        // Wait for the messages to be visible
        cy.get(`[data-event-id="${eventId}"]`);
    });
}

interface IBatchSendResponse {
    /** List of state event ID's we inserted */
    state_event_ids: string[];
    /** List of historical event ID's we inserted */
    event_ids: string[];
    next_batch_id: string;
    insertion_event_id: string;
    batch_event_id: string;
    /** When `?batch_id` isn't provided, the homeserver automatically creates an
     * insertion event as a starting place to hang the history off of. This
     * automatic insertion event ID is returned in this field.
     *
     * When `?batch_id` is provided, this field is not present because we can
     * hang the history off the insertion event specified and associated by the
     * batch ID.
     */
    base_insertion_event_id?: string;
}

/**
 * Import a batch of historical events (MSC2716)
 */
function batchSend({
    synapse,
    accessToken,
    roomId,
    prevEventId,
    batchId,
    payload,
}: {
    synapse: SynapseInstance,
    accessToken: string,
    roomId: string,
    prevEventId: string,
    batchId: string | null,
    payload: { state_events_at_start?: any[], events: any[] },
}): Cypress.Chainable<Cypress.Response<IBatchSendResponse>> {
    const batchSendUrl = new URL(`${synapse.baseUrl}/_matrix/client/unstable/org.matrix.msc2716/rooms/${roomId}/batch_send`);
    batchSendUrl.searchParams.set('prev_event_id', prevEventId);
    if (batchId !== null) {
        batchSendUrl.searchParams.set('batch_id', batchId);
    }

    return cy.request<IBatchSendResponse>({
        url: batchSendUrl.toString(),
        method: "POST",
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
        body: payload,
    });
}

function ensureVirtualUsersRegistered(
    synapse: SynapseInstance,
    applicationServiceToken: string,
    virtualUserIds: string[]
) {
    const url = `${synapse.baseUrl}/_matrix/client/r0/register`;

    const virtualUserLocalparts = virtualUserIds.map((virtualUserId) => {
        const userIdWithoutServer = virtualUserId.split(':')[0];
        const localpart = userIdWithoutServer.replace(/^@/, '');
        return localpart;
    });

    virtualUserLocalparts.forEach((virtualUserLocalpart) => {
        cy.request<{ error?: string, errcode?: string }>({
            url,
            method: "POST",
            body: {
                type: "m.login.application_service",
                username: virtualUserLocalpart
            },
            headers: {
                'Authorization': `Bearer ${applicationServiceToken}`
            },
            // We'll handle the errors ourselves below
            failOnStatusCode: false,
        })
            .then((res) => {
                // Registration success
                if(res.status === 200) {
                    return;
                }

                const errcode = res.body.errcode;

                // User already registered and good to go
                if (res.status == 400 && errcode === "M_USER_IN_USE") {
                    return;
                }

                const errorMessage = res.body.error;
                throw new Error(`ensureVirtualUserRegistered failed to register: (${errcode}) ${errorMessage}`)
            });
    });
}

describe("MSC2716: Historical Import", () => {
    let synapse: SynapseInstance;
    let asMatrixClient: MatrixClient;
    let loggedInUserCreds: UserCredentials;
    const virtualUserIDs = ['@maria-01234:localhost'];

    // This corresponds to the application service registration defined in the
    // "msc2716-historical-import" Synapse configuration
    const AS_TOKEN = 'as_token123';

    beforeEach(() => {
        cy.window().then(win => {
            // Collapse left panel for these tests (get more space in the area we care about)
            win.localStorage.setItem("mx_lhs_size", "0");
        });
        // Start Synapse with msc2716_enabled and an application service configured
        cy.startSynapse("msc2716-historical-import").then(data => {
            synapse = data;

            // This is the person we're logged in as
            cy.initTestUser(synapse, "Grace").then(userCreds => {
                loggedInUserCreds = userCreds;
            });
            // After the page is loaded from initializing the logged in user so
            // the mxSettingsStore is available
            cy.window().then(win => {
                // Disable the sound notifications so you're not startled and
                // confused where the sound is coming from
                win.mxSettingsStore.setValue("audioNotificationsEnabled", null, SettingLevel.DEVICE, false);
                // Show hidden events to make debugging easier. And the state
                // events will show up in the timeline to make it the same
                // assert as other events.
                win.mxSettingsStore.setValue("showHiddenEventsInTimeline", null, SettingLevel.DEVICE, true);
            });

            // Get a Matrix Client for the application service
            cy.newMatrixClient(synapse, {
                userId: '@gitter-badger:localhost',
                accessToken: AS_TOKEN,
            }).then(matrixClient => {
                asMatrixClient = matrixClient;
            });

            ensureVirtualUsersRegistered(synapse, AS_TOKEN, virtualUserIDs);
        });
    });

    afterEach(() => {
        cy.stopSynapse(synapse);
    });

    it("asdf", () => {
        // As the application service, create the room so it is the room creator
        // and proper power_levels to send MSC2716 events. Then join the logged
        // in user to the room.
        let roomId: string;
        cy.wrap(true)
            .then(async () => {
                const resp = await asMatrixClient.createRoom({
                    // FIXME: I can't use Preset.PublicChat because Cypress doesn't
                    // understand Typescript to import it
                    preset: "public_chat" as Preset,
                    name: "test-msc2716",
                    room_version: "org.matrix.msc2716v3",
                });
                roomId = resp.room_id;
                return roomId;
            })
            .as('roomId');

        cy.get<string>("@roomId").then(roomId => {
            // Join the logged in user to the room
            cy.joinRoom(roomId);

            // Then visit the room
            cy.visit("/#/room/" + roomId);
        });

        // Send 3 live messages as the application service.
        // Then make sure they are visible from the perspective of the logged in user.
        cy.get<string>("@roomId")
            .then(async (roomId) => {
                // Send 3 messages and wait for them to be sent
                const liveMessageEventIds = [];
                for (let i = 0; i < 3; i++) {
                    // Send the messages sequentially waiting for each request
                    // to finish before we move onto the next so we don't end up
                    // with a pile of live messages at the same depth. This
                    // gives more of an expected order at the end.
                    const { event_id } = await asMatrixClient.sendMessage(roomId, null, {
                        body: `live_event${i}`,
                        msgtype: "m.text",
                    });
                    liveMessageEventIds.push(event_id);
                }

                // Make this available for later chains
                cy.wrap(liveMessageEventIds).as('liveMessageEventIds');

                // Wait for the messages to show up for the logged in user
                waitForEventIdsInClient(liveMessageEventIds);

                cy.wrap(liveMessageEventIds).as('liveMessageEventIds');
            });

        cy.get<string>("@liveMessageEventIds")
            .then(async (liveMessageEventIds) => {
                // Make sure the right thing was yielded
                expect(liveMessageEventIds).to.have.lengthOf(3);

                // Send a batch of historical messages
                const insertTimestamp = Date.now();
                batchSend({
                    synapse,
                    accessToken: asMatrixClient.getAccessToken(),
                    roomId,
                    prevEventId: liveMessageEventIds[1],
                    batchId: null,
                    payload: {
                        state_events_at_start: createJoinStateEventsForBatchSendRequest(virtualUserIDs, insertTimestamp),
                        events: createMessageEventsForBatchSendRequest(
                            virtualUserIDs,
                            insertTimestamp,
                            3,
                        ),
                    },
                })
                    .then((res) => {
                        assert.exists(res.body.event_ids);
                        assert.exists(res.body.base_insertion_event_id);

                        // Make this available for later chains
                        cy.wrap(res.body.event_ids).as('historicalEventIds');
                        cy.wrap(res.body.base_insertion_event_id).as('baseInsertionEventId');
                    });
            });


        cy.get<string>("@roomId")
            .then(async function(roomId) {
                // Ensure historical messages do not appear yet. We can do this by
                // sending another live event and wait for it to sync back to us. If
                // we're able to see eventIDAfterHistoricalImport without any the
                // historicalEventIds/historicalStateEventIds in between, we're
                // probably safe to assume it won't sync.
                const {event_id: eventIDAfterHistoricalImport } = await asMatrixClient.sendMessage(roomId, null, {
                    body: `live_event after historical import`,
                    msgtype: "m.text",
                });
                // Wait for the message to show up for the logged in user
                waitForEventIdsInClient([eventIDAfterHistoricalImport]);
            });


        // Send the marker event which lets the client know there are
        // some historical messages back at the given insertion event.
        cy.get<string>("@roomId")
            .then(async function(roomId) {
                assert.exists(this.baseInsertionEventId);

                const {event_id: markeEventId } = await asMatrixClient.sendStateEvent(roomId, 'org.matrix.msc2716.marker', {
                    "org.matrix.msc2716.marker.insertion": this.baseInsertionEventId,
                }, Cypress._.uniqueId("marker_state_key_"));
                // Wait for the message to show up for the logged in user
                waitForEventIdsInClient([markeEventId]);
            });

        // Ensure the "History import detected" notice is shown
        cy.get(`[data-cy="historical-import-detected-status-bar"]`).should("exist");

        // Press "Refresh timeline"
        cy.get(`[data-cy="refresh-timeline-button"]`).click();

        // Ensure historical messages are now shown
        cy.wrap(true)
            .then(function() {
                // TODO: Assert in the correct order
                waitForEventIdsInClient([
                    this.liveMessageEventIds[0],
                    this.liveMessageEventIds[1],
                    ...this.historicalEventIds,
                    this.liveMessageEventIds[2]
                ]);
            });
    });

});
