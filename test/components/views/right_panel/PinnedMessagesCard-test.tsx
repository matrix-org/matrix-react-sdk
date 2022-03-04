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
import { mount } from "enzyme";
import { act } from "react-dom/test-utils";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { EventType, RelationType, MsgType } from "matrix-js-sdk/src/@types/event";
import { RoomStateEvent } from "matrix-js-sdk/src/models/room-state";

import "../../../skinned-sdk";
import {
    stubClient,
    wrapInMatrixClientContext,
    mkStubRoom,
    mkEvent,
    mkMessage,
} from "../../../test-utils";
import { MatrixClientPeg } from "../../../../src/MatrixClientPeg";
import _PinnedMessagesCard from "../../../../src/components/views/right_panel/PinnedMessagesCard";
import PinnedEventTile from "../../../../src/components/views/rooms/PinnedEventTile";

describe("<PinnedMessagesCard />", () => {
    stubClient();
    const cli = MatrixClientPeg.get();
    cli.setRoomAccountData = () => {};
    cli.relations = jest.fn().mockResolvedValue({ events: [] });
    const PinnedMessagesCard = wrapInMatrixClientContext(_PinnedMessagesCard);

    const mkRoom = (localPins: MatrixEvent[], nonLocalPins: MatrixEvent[]): Room => {
        const room = mkStubRoom("!room:example.org");
        // Deferred since we may be adding or removing pins later
        const pins = () => [...localPins, ...nonLocalPins];

        // Insert pin IDs into room state
        room.currentState.getStateEvents.mockImplementation(() => mkEvent({
            event: true,
            type: EventType.RoomPinnedEvents,
            content: {
                pinned: pins().map(e => e.getId()),
            },
        }));

        // Insert local pins into local timeline set
        room.getUnfilteredTimelineSet = () => ({
            getTimelineForEvent: () => ({
                getEvents: () => localPins,
            }),
        });

        // Return all pins over fetchRoomEvent
        cli.fetchRoomEvent = (roomId, eventId) => pins().find(e => e.getId() === eventId)?.event;

        return room;
    };

    const mountPins = async (room: Room): ReactWrapper => {
        let pins;
        await act(async () => {
            pins = mount(<PinnedMessagesCard room={room} onClose={() => {}} />);
            // Wait a tick for state updates
            await new Promise(resolve => setImmediate(resolve));
        });
        pins.update();

        return pins;
    };

    const emitPinUpdates = async (pins: ReactWrapper) => {
        const room = pins.props().room;
        const pinListener = room.currentState.on.mock.calls
            .find(([eventName, listener]) => eventName === RoomStateEvent.Events)[1];

        await act(async () => {
            // Emit the update
            pinListener(room.currentState.getStateEvents());
            // Wait a tick for state updates
            await new Promise(resolve => setImmediate(resolve));
        });
        pins.update();
    };

    const pin1 = mkMessage({
        event: true,
        room: "!room:example.org",
        user: "@alice:example.org",
        msg: "First pinned message",
    });
    const pin2 = mkMessage({
        event: true,
        room: "!room:example.org",
        user: "@alice:example.org",
        msg: "The second one",
    });

    it("updates when messages are pinned", async () => {
        // Start with nothing pinned
        const localPins = [];
        const nonLocalPins = [];
        const pins = await mountPins(mkRoom(localPins, nonLocalPins));
        expect(pins.find(PinnedEventTile).length).toBe(0);

        // Pin the first message
        localPins.push(pin1);
        await emitPinUpdates(pins);
        expect(pins.find(PinnedEventTile).length).toBe(1);

        // Pin the second message
        nonLocalPins.push(pin2);
        await emitPinUpdates(pins);
        expect(pins.find(PinnedEventTile).length).toBe(2);
    });

    it("updates when messages are unpinned", async () => {
        // Start with two pins
        const localPins = [pin1];
        const nonLocalPins = [pin2];
        const pins = await mountPins(mkRoom(localPins, nonLocalPins));
        expect(pins.find(PinnedEventTile).length).toBe(2);

        // Unpin the first message
        localPins.pop();
        await emitPinUpdates(pins);
        expect(pins.find(PinnedEventTile).length).toBe(1);

        // Unpin the second message
        nonLocalPins.pop();
        await emitPinUpdates(pins);
        expect(pins.find(PinnedEventTile).length).toBe(0);
    });

    it("hides unpinnable events found in local timeline", async () => {
        // Redacted messages are unpinnable
        const pin = mkEvent({
            event: true,
            type: EventType.RoomMessage,
            content: {},
            unsigned: { redacted_because: {} },
        });

        const pins = await mountPins(mkRoom([pin], []));
        expect(pins.find(PinnedEventTile).length).toBe(0);
    });

    it("hides unpinnable events not found in local timeline", async () => {
        // Redacted messages are unpinnable
        const pin = mkEvent({
            event: true,
            type: EventType.RoomMessage,
            content: {},
            unsigned: { redacted_because: {} },
        });

        const pins = await mountPins(mkRoom([], [pin]));
        expect(pins.find(PinnedEventTile).length).toBe(0);
    });

    it("accounts for edits", async () => {
        cli.relations.mockResolvedValue({
            events: [mkEvent({
                event: true,
                type: EventType.RoomMessage,
                room: "!room:example.org",
                user: "@alice:example.org",
                content: {
                    "msgtype": MsgType.Text,
                    "body": " * First pinned message, edited",
                    "m.new_content": {
                        msgtype: MsgType.Text,
                        body: "First pinned message, edited",
                    },
                    "m.relates_to": {
                        rel_type: RelationType.Replace,
                        event_id: pin1.getId(),
                    },
                },
            })],
        });

        const pins = await mountPins(mkRoom([], [pin1]));
        const pinTile = pins.find(PinnedEventTile);
        expect(pinTile.length).toBe(1);
        expect(pinTile.find(".mx_EventTile_body").text()).toEqual("First pinned message, edited");
    });
});
