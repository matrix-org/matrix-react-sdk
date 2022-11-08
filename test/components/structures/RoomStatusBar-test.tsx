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

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { act } from 'react-dom/test-utils';
import { Room } from "matrix-js-sdk/src/models/room";
import { PendingEventOrdering } from 'matrix-js-sdk/src/client';
import { EventStatus, MatrixEvent } from "matrix-js-sdk/src/models/event";
import {
    ISyncStateData, SyncState,
} from 'matrix-js-sdk/src/sync';
import { MatrixError } from "matrix-js-sdk/src/http-api";

import MatrixClientContext from "../../../src/contexts/MatrixClientContext";
import RoomStatusBar from "../../../src/components/structures/RoomStatusBar";
import { getUnsentMessages } from "../../../src/components/structures/RoomStatusBar";
import { MatrixClientPeg } from "../../../src/MatrixClientPeg";
import { mkEvent, stubClient } from "../../test-utils/test-utils";
import { mkThread } from "../../test-utils/threads";
import { sleep } from "matrix-js-sdk/src/utils";

// Fake date to give a predictable snapshot
const realDateNow = Date.now;
const realDateToISOString = Date.prototype.toISOString;
Date.now = jest.fn(() => 2345678901234);
// eslint-disable-next-line no-extend-native
Date.prototype.toISOString = jest.fn(() => "2021-11-23T14:35:14.240Z");

afterAll(() => {
    Date.now = realDateNow;
    // eslint-disable-next-line no-extend-native
    Date.prototype.toISOString = realDateToISOString;
});

describe("RoomStatusBar", () => {
    let client;
    beforeEach(() => {
        stubClient();
        client = MatrixClientPeg.get();
    });

    const customRender = (room: Room) => {
        return render(
            <MatrixClientContext.Provider value={client}>
                <RoomStatusBar room={room} />
            </MatrixClientContext.Provider>,
        );
    };

    describe("getUnsentMessages", () => {
        const ROOM_ID = "!roomId:example.org";
        let room: Room;
        let event: MatrixEvent;

        beforeEach(() => {
            jest.clearAllMocks();

            room = new Room(ROOM_ID, client, client.getUserId(), {
                pendingEventOrdering: PendingEventOrdering.Detached,
            });
            event = mkEvent({
                event: true,
                type: "m.room.message",
                user: "@user1:server",
                room: "!room1:server",
                content: {},
            });
            event.status = EventStatus.NOT_SENT;
        });

        it("returns no unsent messages", () => {
            expect(getUnsentMessages(room)).toHaveLength(0);
        });

        it("checks the event status", () => {
            room.addPendingEvent(event, "123");

            expect(getUnsentMessages(room)).toHaveLength(1);
            event.status = EventStatus.SENT;

            expect(getUnsentMessages(room)).toHaveLength(0);
        });

        it("only returns events related to a thread", () => {
            room.addPendingEvent(event, "123");

            const { rootEvent, events } = mkThread({
                room,
                client,
                authorId: "@alice:example.org",
                participantUserIds: ["@alice:example.org"],
                length: 2,
            });
            rootEvent.status = EventStatus.NOT_SENT;
            room.addPendingEvent(rootEvent, rootEvent.getId());
            for (const event of events) {
                event.status = EventStatus.NOT_SENT;
                room.addPendingEvent(event, Date.now() + Math.random() + "");
            }

            const pendingEvents = getUnsentMessages(room, rootEvent.getId());

            expect(pendingEvents[0].threadRootId).toBe(rootEvent.getId());
            expect(pendingEvents[1].threadRootId).toBe(rootEvent.getId());
            expect(pendingEvents[2].threadRootId).toBe(rootEvent.getId());

            // Filters out the non thread events
            expect(pendingEvents.every(ev => ev.getId() !== event.getId())).toBe(true);
        });
    });

    it('does not show anything when no sync error or other status', () => {
        const r1 = new Room("r1", client, "@name:example.com", {
            pendingEventOrdering: PendingEventOrdering.Detached,
        });

        const wrapper = customRender(r1);
        expect(wrapper.asFragment()).toMatchSnapshot();
    });

    describe('connectivity lost bar', () => {
        it('should show connection lost bar when sync has an error', () => {
            client.getSyncState = (): SyncState => SyncState.Error,
            client.getSyncStateData = (): ISyncStateData => ({
                error: new MatrixError({
                    errcode: 'FAKE_ERROR',
                    error: "Fake sync error",
                }),
            });

            const r1 = new Room("r1", client, "@name:example.com", {
                pendingEventOrdering: PendingEventOrdering.Detached,
            });

            const wrapper = customRender(r1);
            expect(wrapper.asFragment()).toMatchSnapshot();
        });

        it('connectivity lost bar has priority over the timeline refresh bar', () => {
            // Show connectivity lost bar
            client.getSyncState = (): SyncState => SyncState.Error,
            client.getSyncStateData = (): ISyncStateData => ({
                error: new MatrixError({
                    errcode: 'FAKE_ERROR',
                    error: "Fake sync error",
                }),
            });

            const r1 = new Room("r1", client, "@name:example.com", {
                pendingEventOrdering: PendingEventOrdering.Detached,
            });

            // Show timeline needs refresh bar
            r1.setTimelineNeedsRefresh(true);

            const wrapper = customRender(r1);
            expect(wrapper.asFragment()).toMatchSnapshot();
        });
    });

    describe('timeline needs refresh bar (history import)', () => {
        it('should show timeline refresh bar when history import detected', () => {
            const r1 = new Room("r1", client, "@name:example.com", {
                pendingEventOrdering: PendingEventOrdering.Detached,
            });
            // Show timeline needs refresh bar
            r1.setTimelineNeedsRefresh(true);

            const wrapper = customRender(r1);
            expect(wrapper.asFragment()).toMatchSnapshot();
        });

        it('should refresh timeline for room when button clicked', () => {
            const r1 = new Room("r1", client, "@name:example.com", {
                pendingEventOrdering: PendingEventOrdering.Detached,
            });
            // Show timeline needs refresh bar
            r1.setTimelineNeedsRefresh(true);

            r1.refreshLiveTimeline = jest.fn();

            const wrapper = customRender(r1);

            act(() => {
                fireEvent.click(wrapper.getByTestId('refresh-timeline-button'));
            });

            // Make sure that the SDK was called to refresh the timeline
            expect(r1.refreshLiveTimeline).toHaveBeenCalled();
        });

        it('should show error state with option to submit debug logs ' +
           'in timeline refresh bar when something went wrong while refreshing', async () => {
            const r1 = new Room("r1", client, "@name:example.com", {
                pendingEventOrdering: PendingEventOrdering.Detached,
            });
            // Show timeline needs refresh bar
            r1.setTimelineNeedsRefresh(true);

            const wrapper = customRender(r1);

            r1.refreshLiveTimeline = jest.fn().mockRejectedValue(new Error('Fake error in test'));
            act(() => {
                fireEvent.click(wrapper.getByTestId('refresh-timeline-button'));
            });

            // Make sure that the SDK was called to refresh the timeline
            expect(r1.refreshLiveTimeline).toHaveBeenCalled();

            // Expect error to be shown. We have to wait for the UI to transition.
            await waitFor(() => expect(wrapper.getByTestId('historical-import-detected-error-content')).toBeDefined());

            // Expect an option to submit debug logs to be shown
            expect(wrapper.getByTestId('historical-import-detected-error-submit-debug-logs-button')).toBeDefined();
        });

        it('should show error state without submit debug logs option ' +
           'in timeline refresh bar when ConnectionError while refreshing', async () => {
            const r1 = new Room("r1", client, "@name:example.com", {
                pendingEventOrdering: PendingEventOrdering.Detached,
            });
            // Show timeline needs refresh bar
            r1.setTimelineNeedsRefresh(true);

            const wrapper = customRender(r1);

            const connectionError = new Error('Fake connection error in test');
            connectionError.name = "ConnectionError";
            r1.refreshLiveTimeline = jest.fn().mockRejectedValue(connectionError);
            act(() => {
                fireEvent.click(wrapper.getByTestId('refresh-timeline-button'));
            });

            // Make sure that the SDK was called to refresh the timeline
            expect(r1.refreshLiveTimeline).toHaveBeenCalled();

            // Expect error to be shown
            await waitFor(() => expect(wrapper.getByTestId('historical-import-detected-error-content')).toBeDefined());

            // The submit debug logs option should *NOT* be shown.
            //
            // We have to use `queryBy` so that it can return `null` for something that does not exist.
            expect(wrapper.queryByTestId('historical-import-detected-error-submit-debug-logs-button]')).toBeNull();
        });
    });
});
