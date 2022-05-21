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

import { mount, ReactWrapper } from "enzyme";
import { EventTimeline } from "matrix-js-sdk/src/models/event-timeline";
import React from "react";
import { MessageEvent } from 'matrix-events-sdk';
import { EventTimelineSet } from "matrix-js-sdk/src/models/event-timeline-set";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { Room } from "matrix-js-sdk/src/models/room";
import { EventType } from "matrix-js-sdk/src/@types/event";

import TimelinePanel from "../../../src/components/structures/TimelinePanel";
import { MatrixClientPeg } from "../../../src/MatrixClientPeg";
import { mkRoom, stubClient } from "../../test-utils";
import SettingsStore from "../../../src/settings/SettingsStore";

describe("TimelinePanel", () => {
    beforeAll(() => {
        stubClient();
    });

    describe("read receipts", () => {
        it("sends public read receipt when enabled", () => {
            const client = MatrixClientPeg.get();
            const room = mkRoom(client, "roomId");
            const events = mockEvents(room);

            const getValueCopy = SettingsStore.getValue;
            SettingsStore.getValue = jest.fn().mockImplementation((name: string) => {
                if (name === "sendReadReceipts") return true;
                return getValueCopy(name);
            });

            mountPanel(room, events);
            expect(client.setRoomReadMarkers).toHaveBeenCalledWith(room.roomId, null, events[0], events[0]);
        });

        it("does not send public read receipt when enabled", () => {
            const client = MatrixClientPeg.get();
            const room = mkRoom(client, "roomId");
            const events = mockEvents(room);

            const getValueCopy = SettingsStore.getValue;
            SettingsStore.getValue = jest.fn().mockImplementation((name: string) => {
                if (name === "sendReadReceipts") return false;
                return getValueCopy(name);
            });

            mountPanel(room, events);
            expect(client.setRoomReadMarkers).toHaveBeenCalledWith(room.roomId, null, null, events[0]);
        });
    });
});

const mountPanel = (room: Room, events: MatrixEvent[]): ReactWrapper => {
    const timelineSet = { room: room as Room } as EventTimelineSet;
    const timeline = new EventTimeline(timelineSet);
    events.forEach((event) => timeline.addEvent(event, true));
    timelineSet.getLiveTimeline = () => timeline;
    timelineSet.getTimelineForEvent = () => timeline;
    timelineSet.getPendingEvents = () => events;
    timelineSet.room.getEventReadUpTo = () => events[1].getId();

    return mount(
        <TimelinePanel
            timelineSet={timelineSet}
            manageReadReceipts
            sendReadReceiptOnLoad
        />,
    );
};

const mockEvents = (room: Room, count = 2): MatrixEvent[] => {
    const events = [];
    for (let index = 0; index < count; index++) {
        events.push(new MatrixEvent({
            room_id: room.roomId,
            event_id: `event_${index}`,
            type: EventType.RoomMessage,
            user_id: "userId",
            content: MessageEvent.from(`Event${index}`).serialize().content,
        }));
    }

    return events;
};
