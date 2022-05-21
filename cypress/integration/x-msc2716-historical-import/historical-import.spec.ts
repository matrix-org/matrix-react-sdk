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

function ensureVirtualUsersRegistered(synapse: SynapseInstance, applicationServiceToken, virtualUserIds: string[]) {
    const url = `${synapse.baseUrl}/_matrix/client/r0/register`;

    const virtualUserLocalparts = virtualUserIds.map((virtualUserId) => {
        const userIdWithoutServer = virtualUserId.split(':')[0];
        const localpart = userIdWithoutServer.replace(/^@/, '');
        return localpart;
    });

    console.log('virtualUserLocalparts', virtualUserLocalparts);
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
                console.log('using asMatrixClient', asMatrixClient);
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
                const messageEventIds = (await Promise.all([...Array(3).keys()].map((i) => {
                    return asMatrixClient.sendMessage(roomId, null, {
                        body: `live_event${i}`,
                        msgtype: "m.text",
                    });
                })))
                    .map((messageResponse) => {
                        return messageResponse.event_id;
                    });

                // Wait for the messages to show up for the logged in user
                waitForEventIdsInClient(messageEventIds);

                console.log('messageEventIds1', messageEventIds);
                cy.wrap(messageEventIds);
            })
            .then(async (messageEventIds) => {
                console.log('messageEventIds2', messageEventIds);
                // Make sure the right thing was yielded
                expect(messageEventIds).to.have.lengthOf(3);

                // Send a batch of historical messages
                const insertTimestamp = Date.now();
                await asMatrixClient.batchSend(roomId, messageEventIds[1], null, {
                    state_events_at_start: createJoinStateEventsForBatchSendRequest(virtualUserIDs, insertTimestamp),
                    events: createMessageEventsForBatchSendRequest(
                        virtualUserIDs,
                        insertTimestamp,
                        3,
                    )
                })

                // Ensure historical messages do not appear yet. We can do this by
                // sending another live event and wait for it to sync back to us. If
                // we're able to see eventIDAfterHistoricalImport without any the
                // historicalEventIDs/historicalStateEventIDs in between, we're
                // probably safe to assume it won't sync.
                const {event_id: eventIDAfterHistoricalImport } = await asMatrixClient.sendMessage(roomId, null, {
                    body: `live_event after`,
                    msgtype: "m.text",
                });
                // Wait for the message to show up for the logged in user
                waitForEventIdsInClient([eventIDAfterHistoricalImport]);
            });


        // TODO: Send marker and wait for it

        // TODO: Ensure "History import detected" notice is shown

        // TODO: Press "Refresh timeline"

        // TODO: Ensure historical messages are now shown

    });

});
