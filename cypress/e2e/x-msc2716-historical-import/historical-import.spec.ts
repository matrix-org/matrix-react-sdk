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
import { SettingLevel } from "../../../src/settings/SettingLevel";

/**
 * Create the join state events necessary for the given virtual user IDs to send
 * messages in the room. Usuable in a /batch_send requests.
 * @param {string[]} virtualUserIDs A list of virtualUserIds to create join events for
 * @param {number} insertTimestamp A unix timestamp when the join events should be marked as sent
 */
function createJoinStateEventsForBatchSendRequest(
    virtualUserIDs: string[],
    insertTimestamp: number,
) {
    return virtualUserIDs.map((virtualUserID, index) => {
        return {
            "content": {
                "displayname": `some-display-name-for-${virtualUserID}`,
                "membership": "join",
            },
            "origin_server_ts": insertTimestamp + index,
            "sender": virtualUserID,
            "state_key": virtualUserID,
            "type": "m.room.member",
        };
    });
}

let batchCount = 0;
/**
 * Create a number of message events that are usuable in a /batch_send request
 * @param {string[]} virtualUserIDs A list of virtualUserIds to send historical messages from
 * @param {number} insertTimestamp A unix timestamp when the messages should start from
 * @param {number} count The number of messages to create
 */
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
                "org.matrix.msc2716.historical": true,
            },
            "origin_server_ts": insertTimestamp + i,
            "sender": virtualUserID,
            "type": "m.room.message",
        };
    });

    batchCount++;

    return messageEvents;
}

/**
 * Wait for the given event IDs to show up in the UI
 * @param {string[]} eventIds The event IDs we ensure are visible in the UI
 */
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
 * @param {object} opts
 * @param {SynapseInstance} opts.synapse The given Synapse instance to `/batch_send` against
 * @param {string} opts.applicationServiceToken The given application service token to register
 *    the virtual users from
 * @param {string} opts.roomId The room to import the historical messages in
 * @param {string} opts.prevEventId The event ID to import the history next to
 * @param {string} opts.batchId The batch ID from a previous `/batch_send` request to connect
 *    them all together into one big chain of history.
 * @param {object} opts.payload The events and state to send in the batch
 */
function batchSend({
    synapse,
    applicationServiceToken,
    roomId,
    prevEventId,
    batchId,
    payload,
}: {
    synapse: SynapseInstance;
    applicationServiceToken: string;
    roomId: string;
    prevEventId: string;
    batchId: string | null;
    payload: { state_events_at_start?: any[], events: any[] };
}): Cypress.Chainable<Cypress.Response<IBatchSendResponse>> {
    const prefix = '/_matrix/client/unstable/org.matrix.msc2716';
    const batchSendUrl = new URL(`${synapse.baseUrl}${prefix}/rooms/${roomId}/batch_send`);
    batchSendUrl.searchParams.set('prev_event_id', prevEventId);
    if (batchId !== null) {
        batchSendUrl.searchParams.set('batch_id', batchId);
    }

    return cy.request<IBatchSendResponse>({
        url: batchSendUrl.toString(),
        method: "POST",
        headers: {
            'Authorization': `Bearer ${applicationServiceToken}`,
        },
        body: payload,
    });
}

/**
 * Make sure all of the given virtual user IDs are registered and ready to be
 * used in a `/batch_send` request.
 * @param {SynapseInstance} synapse The given Synapse instance to `/batch_send` against
 * @param {string} applicationServiceToken The given application service token to register
 *    the virtual users from
 * @param {string[]} virtualUserIDs A list of virtualUserIds to send historical messages from
 */
function ensureVirtualUsersRegistered(
    synapse: SynapseInstance,
    applicationServiceToken: string,
    virtualUserIds: string[],
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
                username: virtualUserLocalpart,
            },
            headers: {
                'Authorization': `Bearer ${applicationServiceToken}`,
            },
            // We'll handle the errors ourselves below
            failOnStatusCode: false,
        })
            .then((res) => {
                // Registration success
                if (res.status === 200) {
                    return;
                }

                const errcode = res.body.errcode;

                // User already registered and good to go
                if (res.status == 400 && errcode === "M_USER_IN_USE") {
                    return;
                }

                const errorMessage = res.body.error;
                throw new Error(
                    `ensureVirtualUserRegistered failed to register ` +
                    `${virtualUserLocalpart}: (${errcode}) ${errorMessage}`,
                );
            });
    });
}

/**
 * Send a marker event and ensure that the "History import detected" status bar is shown
 * which indicates that the client received the event.
 * @param {MatrixClient} asMatrixClient The given application service client to send
 *    marker event from.
 */
function sendMarkerEventAndEnsureHistoryDetectedStatusBar(asMatrixClient) {
    // Send the marker event which lets the client know there are
    // some historical messages back at the given insertion event.
    cy.all([
        cy.get<string>("@roomId"),
        cy.get<string>("@baseInsertionEventId"),
    ]).then(async ([roomId, baseInsertionEventId]) => {
        const { event_id: markerEventId } = await asMatrixClient.sendStateEvent(
            roomId,
            'org.matrix.msc2716.marker', {
                "org.matrix.msc2716.marker.insertion": baseInsertionEventId,
            },
            Cypress._.uniqueId("marker_state_key_"),
        );

        cy.wrap(markerEventId).as('markerEventId');

        // Wait for the message to show up for the logged in user
        waitForEventIdsInClient([markerEventId]);
    });

    // Ensure the "History import detected" notice is shown
    cy.get(`[data-testid="historical-import-detected-status-bar"]`).should("exist");
}

/**
 * Bootstrap a room with some messages and a historically imported batch that is
 * ready to be seen after refreshing the timeline.
 * @param {object} opts
 * @param {SynapseInstance} opts.synapse The given Synapse instance to `/batch_send` against
 * @param {MatrixClient} opts.asMatrixClient The given application service client to create
 *     the room and messages.
 * @param {string[]} opts.virtualUserIDs A list of virtualUserIds to send historical messages from
 */
function setupRoomWithHistoricalMessagesAndMarker({
    synapse,
    asMatrixClient,
    virtualUserIDs,
}: {
    synapse: SynapseInstance;
    asMatrixClient: MatrixClient;
    virtualUserIDs: string[];
}) {
    // As the application service, create the room so it is the room creator
    // and proper power_levels to send MSC2716 events. Then join the logged
    // in user to the room.
    cy.window().then(async (win) => {
        const resp = await asMatrixClient.createRoom({
            preset: win.matrixcs.Preset.PublicChat,
            name: "test-msc2716",
            room_version: "org.matrix.msc2716v3",
        });
        cy.wrap(resp.room_id).as('roomId');
    });

    cy.get<string>("@roomId").then((roomId) => {
        // Join the logged in user to the room
        cy.joinRoom(roomId);

        // Then visit the room
        cy.visit("/#/room/" + roomId);
    });

    // Send 3 live messages as the application service.
    // Then make sure they are visible from the perspective of the logged in user.
    cy.get<string>("@roomId").then(async (roomId) => {
        // Send 3 messages and wait for them to be sent
        const liveMessageEventIds = [];
        for (let i = 0; i < 3; i++) {
            // Send the messages sequentially waiting for each request
            // to finish before we move onto the next so we don't end up
            // with a pile of live messages at the same depth. This
            // gives more of an expected order at the end.
            const { event_id: eventId } = await asMatrixClient.sendMessage(roomId, null, {
                body: `live_event${i}`,
                msgtype: "m.text",
            });
            liveMessageEventIds.push(eventId);
        }

        // Make this available for later chains
        cy.wrap(liveMessageEventIds).as('liveMessageEventIds');

        // Wait for the messages to show up for the logged in user
        waitForEventIdsInClient(liveMessageEventIds);
    });

    cy.all([
        cy.get<string>("@roomId"),
        cy.get<string[]>("@liveMessageEventIds"),
    ]).then(([roomId, liveMessageEventIds]) => {
        // Make sure the right thing was yielded
        expect(liveMessageEventIds).to.have.lengthOf(3);

        // Send a batch of historical messages
        const insertTimestamp = Date.now();
        batchSend({
            synapse,
            applicationServiceToken: asMatrixClient.getAccessToken(),
            roomId: roomId,
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
        }).then((res) => {
            assert.exists(res.body.event_ids);
            assert.exists(res.body.base_insertion_event_id);

            // Make this available for later chains
            cy.wrap(res.body.event_ids).as('historicalEventIds');
            cy.wrap(res.body.base_insertion_event_id).as('baseInsertionEventId');
        });
    });

    cy.get<string>("@roomId").then(async (roomId) => {
        // Ensure historical messages do not appear yet. We can do this by
        // sending another live event and wait for it to sync back to us. If
        // we're able to see eventIdAfterHistoricalImport without any the
        // historicalEventIds/historicalStateEventIds in between, we're
        // probably safe to assume it won't sync.
        const { event_id: eventIdAfterHistoricalImport } = await asMatrixClient.sendMessage(roomId, null, {
            body: `live_event after historical import`,
            msgtype: "m.text",
        });

        // Wait for the message to show up for the logged in user
        waitForEventIdsInClient([eventIdAfterHistoricalImport]);
    });

    sendMarkerEventAndEnsureHistoryDetectedStatusBar(asMatrixClient);
}

describe("MSC2716: Historical Import", () => {
    let synapse: SynapseInstance;
    let asMatrixClient: MatrixClient;
    const virtualUserIDs = ['@maria-01234:localhost'];

    // This corresponds to the application service registration defined in the
    // "msc2716-historical-import" Synapse configuration
    const AS_TOKEN = 'as_token123';

    beforeEach(() => {
        // Default threads to ON for this spec
        cy.enableLabsFeature("feature_thread");

        cy.window().then(win => {
            // Collapse left panel for these tests (get more space in the area we care about)
            win.localStorage.setItem("mx_lhs_size", "0");
        });
        // Start Synapse with msc2716_enabled and an application service configured
        cy.startSynapse("msc2716-historical-import").then(data => {
            synapse = data;

            // This is the person we're logged in as
            cy.initTestUser(synapse, "Grace");

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
                baseUrl: synapse.baseUrl,
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

    it("Shows historical messages after refreshing the timeline", () => {
        setupRoomWithHistoricalMessagesAndMarker({
            synapse,
            asMatrixClient,
            virtualUserIDs,
        });

        // Press "Refresh timeline"
        cy.get(`[data-testid="refresh-timeline-button"]`).click();

        // Ensure historical messages are now shown
        cy.all([
            cy.get<string[]>("@liveMessageEventIds"),
            cy.get<string[]>("@historicalEventIds"),
        ]).then(([liveMessageEventIds, historicalEventIds]) => {
            // FIXME: Assert that they appear in the correct order
            waitForEventIdsInClient([
                liveMessageEventIds[0],
                liveMessageEventIds[1],
                ...historicalEventIds,
                liveMessageEventIds[2],
            ]);
        });
    });

    it("Able to refresh the timeline multiple times", () => {
        setupRoomWithHistoricalMessagesAndMarker({
            synapse,
            asMatrixClient,
            virtualUserIDs,
        });

        // Press "Refresh timeline"
        cy.get(`[data-testid="refresh-timeline-button"]`).click();

        // Ensure historical messages are now shown
        cy.all([
            cy.get<string[]>("@liveMessageEventIds"),
            cy.get<string[]>("@historicalEventIds"),
        ]).then(([liveMessageEventIds, historicalEventIds]) => {
            // FIXME: Assert that they appear in the correct order
            waitForEventIdsInClient([
                liveMessageEventIds[0],
                liveMessageEventIds[1],
                ...historicalEventIds,
                liveMessageEventIds[2],
            ]);
        });

        // Send another marker event. We're making sure that the history status
        // bar appears again and works (this is the special differentiator we're
        // testing in this test)
        sendMarkerEventAndEnsureHistoryDetectedStatusBar(asMatrixClient);

        // Press "Refresh timeline"
        cy.get(`[data-testid="refresh-timeline-button"]`).click();

        // Ensure all of the messages still show afterwards
        cy.all([
            cy.get<string[]>("@liveMessageEventIds"),
            cy.get<string[]>("@historicalEventIds"),
        ]).then(([liveMessageEventIds, historicalEventIds]) => {
            // FIXME: Assert that they appear in the correct order
            waitForEventIdsInClient([
                liveMessageEventIds[0],
                liveMessageEventIds[1],
                ...historicalEventIds,
                liveMessageEventIds[2],
            ]);
        });
    });

    it("Perfectly merges timelines if a sync finishes while refreshing the timeline", () => {
        setupRoomWithHistoricalMessagesAndMarker({
            synapse,
            asMatrixClient,
            virtualUserIDs,
        });

        // 1. Pause the `/context` request from `getEventTimeline` that happens
        //    when we refresh the timeline.
        // 2. Make sure a /sync happens in the middle (simulate a sync racing
        //    with us).
        // 3. Then resume the `/context` request.
        let resolveReq;
        cy.all([
            cy.get<string>("@roomId"),
            cy.get<string>("@markerEventId"),
        ]).then(([roomId, markerEventId]) => {
            // We're using `markerEventId` here because it's the latest event in the room
            const prefix = '/_matrix/client/r0';
            const path = `/rooms/${encodeURIComponent(roomId)}/context/${encodeURIComponent(markerEventId)}`;
            const contextUrl = `${synapse.baseUrl}${prefix}${path}*`;
            cy.intercept(contextUrl, async (req) => {
                return new Cypress.Promise(resolve => {
                    // Later, we only resolve this after we detect that the
                    // timeline was reset(when it goes blank) and force a sync
                    // to happen in the middle of all of this refresh timeline
                    // logic. We want to make sure the sync pagination still
                    // works as expected after messing the refresh timline logic
                    // messes with the pagination tokens.
                    resolveReq = resolve;
                }).then(req.reply);
            }).as('contextRequestThatWillMakeNewTimeline');
        });

        // Press "Refresh timeline"
        cy.get(`[data-testid="refresh-timeline-button"]`).click();

        // Wait for the timeline to go blank (meaning it was reset)
        // and in the middle of the refrsehing timeline function.
        cy.get('[data-test-id="message-list"] [data-event-id]')
            .should('not.exist');

        // Then make a `/sync` happen by sending a message and seeing that it
        // shows up (simulate a /sync naturally racing with us).
        cy.get<string>("@roomId").then(async (roomId) => {
            const { event_id: eventIdWhileRefreshingTimeline } = await asMatrixClient.sendMessage(
                roomId,
                null, {
                    body: `live_event while trying to refresh timeline`,
                    msgtype: "m.text",
                },
            );

            // Wait for the message to show up for the logged in user
            // indicating that a sync happened in the middle of us
            // refreshing the timeline. We want to make sure the sync
            // pagination still works as expected after messing the refresh
            // timeline logic messes with the pagination tokens.
            waitForEventIdsInClient([eventIdWhileRefreshingTimeline]);

            cy.wrap(eventIdWhileRefreshingTimeline).as('eventIdWhileRefreshingTimeline');
        }).then(() => {
            // Now we can resume the `/context` request
            resolveReq();
        });

        // Make sure the `/context` request was intercepted
        cy.wait('@contextRequestThatWillMakeNewTimeline').its('response.statusCode').should('eq', 200);

        // Make sure sync pagination still works by seeing a new message show up
        cy.get<string>("@roomId").then(async (roomId) => {
            const { event_id: eventIdAfterRefresh } = await asMatrixClient.sendMessage(roomId, null, {
                body: `live_event after refresh`,
                msgtype: "m.text",
            });

            // Wait for the message to show up for the logged in user
            waitForEventIdsInClient([eventIdAfterRefresh]);

            cy.wrap(eventIdAfterRefresh).as('eventIdAfterRefresh');
        });

        // Ensure historical messages are now shown
        cy.all([
            cy.get<string[]>("@liveMessageEventIds"),
            cy.get<string[]>("@historicalEventIds"),
            cy.get<string>("@eventIdWhileRefreshingTimeline"),
            cy.get<string>("@eventIdAfterRefresh"),
        ]).then(async ([
            liveMessageEventIds,
            historicalEventIds,
            eventIdWhileRefreshingTimeline,
            eventIdAfterRefresh,
        ]) => {
            // FIXME: Assert that they appear in the correct order
            waitForEventIdsInClient([
                liveMessageEventIds[0],
                liveMessageEventIds[1],
                ...historicalEventIds,
                liveMessageEventIds[2],
                eventIdWhileRefreshingTimeline,
                eventIdAfterRefresh,
            ]);
        });
    });

    it("Timeline recovers after `/context` request to generate new timeline fails", () => {
        setupRoomWithHistoricalMessagesAndMarker({
            synapse,
            asMatrixClient,
            virtualUserIDs,
        });

        // Make the `/context` fail when we try to refresh the timeline. We want
        // to make sure that we are resilient to this type of failure and can
        // retry and recover.
        cy.all([
            cy.get<string>("@roomId"),
            cy.get<string>("@markerEventId"),
        ]).then(async ([roomId, markerEventId]) => {
            // We're using `this.markerEventId` here because it's the latest event in the room
            const prefix = '/_matrix/client/r0';
            const path = `/rooms/${encodeURIComponent(roomId)}/context/${encodeURIComponent(markerEventId)}`;
            const contextUrl = `${synapse.baseUrl}${prefix}${path}*`;
            cy.intercept(contextUrl, {
                statusCode: 500,
                body: {
                    errcode: 'CYPRESS_FAKE_ERROR',
                    error: 'We purposely intercepted this /context request to make it fail ' +
                             'in order to test whether the refresh timeline code is resilient',
                },
            }).as('contextRequestThatWillTryToMakeNewTimeline');
        });

        // Press "Refresh timeline"
        cy.get(`[data-testid="refresh-timeline-button"]`).click();

        // Make sure the request was intercepted and thew an error
        cy.wait('@contextRequestThatWillTryToMakeNewTimeline').its('response.statusCode').should('eq', 500);

        // Make sure we tell the user that an error happened
        cy.get(`[data-testid="historical-import-detected-error-content"]`).should("exist");

        // Allow the requests to succeed now
        cy.all([
            cy.get<string>("@roomId"),
            cy.get<string>("@markerEventId"),
        ]).then(async ([roomId, markerEventId]) => {
            // We're using `this.markerEventId` here because it's the latest event in the room
            const prefix = '/_matrix/client/r0';
            const path = `/rooms/${encodeURIComponent(roomId)}/context/${encodeURIComponent(markerEventId)}`;
            const contextUrl = `${synapse.baseUrl}${prefix}${path}*`;
            cy.intercept(contextUrl, async (req) => {
                // Passthrough. We can't just omit this callback because the
                // other intercept will take precedent for some reason.
                req.reply();
            }).as('contextRequestThatWillMakeNewTimeline');
        });

        // Press "Refresh timeline" again, this time the network request should succeed
        cy.get(`[data-testid="refresh-timeline-button"]`).click();

        // Make sure the request was intercepted and succeeded
        cy.wait('@contextRequestThatWillMakeNewTimeline').its('response.statusCode').should('eq', 200);

        // Make sure sync pagination still works by seeing a new message show up
        cy.get<string>("@roomId").then(async (roomId) => {
            const { event_id: eventIdAfterRefresh } = await asMatrixClient.sendMessage(
                roomId,
                null, {
                    body: `live_event after refresh`,
                    msgtype: "m.text",
                },
            );

            // Wait for the message to show up for the logged in user
            waitForEventIdsInClient([eventIdAfterRefresh]);

            cy.wrap(eventIdAfterRefresh).as('eventIdAfterRefresh');
        });

        // Ensure historical messages are now shown
        cy.all([
            cy.get<string[]>("@liveMessageEventIds"),
            cy.get<string[]>("@historicalEventIds"),
            cy.get<string>("@eventIdAfterRefresh"),
        ]).then(async ([
            liveMessageEventIds,
            historicalEventIds,
            eventIdAfterRefresh,
        ]) => {
            // FIXME: Assert that they appear in the correct order
            waitForEventIdsInClient([
                liveMessageEventIds[0],
                liveMessageEventIds[1],
                ...historicalEventIds,
                liveMessageEventIds[2],
                eventIdAfterRefresh,
            ]);
        });
    });

    it("Perfectly resolves timelines when refresh fails and then another refresh causes `fetchLatestLiveTimeline()` " +
        "finds a threaded event", () => {
        setupRoomWithHistoricalMessagesAndMarker({
            synapse,
            asMatrixClient,
            virtualUserIDs,
        });

        // Send a threaded message so it's the latest message in the room
        cy.get<string>("@roomId").then(async (roomId) => {
            const { event_id: eventIdToThreadFrom } = await asMatrixClient.sendMessage(roomId, null, {
                body: `event to thread from (root)`,
                msgtype: "m.text",
            });
            const { event_id: eventIdThreadedMessage } = await asMatrixClient.sendMessage(roomId, null, {
                "body": `threaded message1`,
                "msgtype": "m.text",
                "m.relates_to": {
                    "rel_type": "m.thread",
                    "event_id": eventIdToThreadFrom,
                    "is_falling_back": true,
                    "m.in_reply_to": {
                        "event_id": eventIdToThreadFrom,
                    },
                },
            });

            // Wait for the message to show up for the logged in user
            waitForEventIdsInClient([eventIdToThreadFrom]);
            cy.wrap(eventIdToThreadFrom).as('eventIdToThreadFrom');
            // We don't wait for this event in the client because it will be
            // hidden away in a thread.
            cy.wrap(eventIdThreadedMessage).as('eventIdThreadedMessage');

            // Wait for the thread summary to appear which indicates that
            // `eventIdThreadedMessage` made it to the client
            cy.get(`[data-event-id="${eventIdToThreadFrom}"] [data-test-id="thread-summary"]`);
        });

        // Make the `/context` fail when we try to refresh the timeline. We want
        // to make sure that we are resilient to this type of failure and can
        // retry and recover.
        cy.all([
            cy.get<string>("@roomId"),
            cy.get<string>("@eventIdToThreadFrom"),
        ]).then(async ([roomId, eventIdToThreadFrom]) => {
            // We're using `eventIdToThreadFrom` here because it's the latest
            // event in the rooms main timeline which the refresh timeline logic
            // will use if available.
            const prefix = '/_matrix/client/r0';
            const path = `/rooms/${encodeURIComponent(roomId)}/context/${encodeURIComponent(eventIdToThreadFrom)}`;
            const contextUrl = `${synapse.baseUrl}${prefix}${path}*`;
            cy.intercept(contextUrl, {
                statusCode: 500,
                body: {
                    errcode: 'CYPRESS_FAKE_ERROR',
                    error: 'We purposely intercepted this /context request to make it fail ' +
                             'in order to test whether the refresh timeline code is resilient',
                },
            }).as('contextRequestThatWillTryToMakeNewTimeline');
        });

        // Press "Refresh timeline"
        cy.get(`[data-testid="refresh-timeline-button"]`).click();

        // Make sure the request was intercepted and thew an error
        cy.wait('@contextRequestThatWillTryToMakeNewTimeline').its('response.statusCode').should('eq', 500);

        // Wait for the timeline to go blank (meaning it was reset)
        // and refreshing the timeline failed.
        cy.get('[data-test-id="message-list"] [data-event-id]')
            .should('not.exist');

        // Allow the requests to succeed now
        cy.all([
            cy.get<string>("@roomId"),
            cy.get<string>("@eventIdThreadedMessage"),
        ]).then(async ([roomId, eventIdThreadedMessage]) => {
            // We're using `eventIdThreadedMessage` here because it's the latest event in
            // the room which `/messages?dir=b` will find from the refresh timeline ->
            // `client.fetchLatestLiveTimeline(...)` logic.
            const prefix = '/_matrix/client/r0';
            const path = `/rooms/${encodeURIComponent(roomId)}/context/${encodeURIComponent(eventIdThreadedMessage)}`;
            const contextUrl = `${synapse.baseUrl}${prefix}${path}*`;
            cy.intercept(contextUrl, async (req) => {
                // Passthrough. We can't just omit this callback because the
                // other intercept will take precedent for some reason.
                req.reply();
            }).as('contextRequestThatWillMakeNewTimeline');
        });

        // Press "Refresh timeline" again, this time the network request should succeed.
        //
        // Since the timeline is now blank, we have no most recent event to
        // draw from locally. So `MatrixClient::fetchLatestLiveTimeline()` will
        // fetch the latest from `/messages?dir=b` which will return
        // `eventIdThreadedMessage` as the latest event in the room.
        cy.get(`[data-testid="refresh-timeline-button"]`).click();

        // Make sure the request was intercepted and succeeded
        cy.wait('@contextRequestThatWillMakeNewTimeline').its('response.statusCode').should('eq', 200);

        // Make sure sync pagination still works by seeing a new message show up
        cy.get<string>("@roomId").then(async (roomId) => {
            const { event_id: eventIdAfterRefresh } = await asMatrixClient.sendMessage(roomId, null, {
                body: `live_event after refresh`,
                msgtype: "m.text",
            });

            // Wait for the message to show up for the logged in user
            waitForEventIdsInClient([eventIdAfterRefresh]);

            cy.wrap(eventIdAfterRefresh).as('eventIdAfterRefresh');
        });

        // Ensure historical messages are now shown
        cy.all([
            cy.get<string[]>("@liveMessageEventIds"),
            cy.get<string[]>("@historicalEventIds"),
            cy.get<string>("@eventIdToThreadFrom"),
            cy.get<string>("@eventIdAfterRefresh"),
        ]).then(async ([
            liveMessageEventIds,
            historicalEventIds,
            eventIdToThreadFrom,
            eventIdAfterRefresh,
        ]) => {
            // FIXME: Assert that they appear in the correct order
            waitForEventIdsInClient([
                liveMessageEventIds[0],
                liveMessageEventIds[1],
                ...historicalEventIds,
                liveMessageEventIds[2],
                eventIdToThreadFrom,
                eventIdAfterRefresh,
            ]);
        });
    });
});
