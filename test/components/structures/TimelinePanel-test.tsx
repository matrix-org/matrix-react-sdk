/*
Copyright 2022 - 2023 The Matrix.org Foundation C.I.C.

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

import { render, waitFor, screen } from "@testing-library/react";
import { ReceiptType } from "matrix-js-sdk/src/@types/read_receipts";
import {
    EventTimelineSet,
    EventType,
    MatrixClient,
    MatrixEvent,
    PendingEventOrdering,
    RelationType,
    Room,
    RoomEvent,
    RoomMember,
    RoomState,
    TimelineWindow,
} from "matrix-js-sdk/src/matrix";
import { EventTimeline } from "matrix-js-sdk/src/models/event-timeline";
import {
    FeatureSupport,
    Thread,
    THREAD_RELATION_TYPE,
    ThreadEvent,
    ThreadFilterType,
} from "matrix-js-sdk/src/models/thread";
import React, { createRef } from "react";
import { Mocked, mocked } from "jest-mock";

import TimelinePanel from "../../../src/components/structures/TimelinePanel";
import MatrixClientContext from "../../../src/contexts/MatrixClientContext";
import { MatrixClientPeg } from "../../../src/MatrixClientPeg";
import { isCallEvent } from "../../../src/components/structures/LegacyCallEventGrouper";
import { filterConsole, flushPromises, mkMembership, mkRoom, stubClient } from "../../test-utils";
import { mkThread } from "../../test-utils/threads";
import { createMessageEventContent } from "../../test-utils/events";
import SettingsStore from "../../../src/settings/SettingsStore";

const newReceipt = (eventId: string, userId: string, readTs: number, fullyReadTs: number): MatrixEvent => {
    const receiptContent = {
        [eventId]: {
            [ReceiptType.Read]: { [userId]: { ts: readTs } },
            [ReceiptType.ReadPrivate]: { [userId]: { ts: readTs } },
            [ReceiptType.FullyRead]: { [userId]: { ts: fullyReadTs } },
        },
    };
    return new MatrixEvent({ content: receiptContent, type: EventType.Receipt });
};

const getProps = (room: Room, events: MatrixEvent[]): TimelinePanel["props"] => {
    const timelineSet = { room: room as Room, findEventById: (eventId: string) => undefined } as EventTimelineSet;
    const timeline = new EventTimeline(timelineSet);
    events.forEach((event) => timeline.addEvent(event, { toStartOfTimeline: true }));
    timelineSet.getLiveTimeline = () => timeline;
    timelineSet.getTimelineForEvent = () => timeline;
    timelineSet.getPendingEvents = () => events;
    timelineSet.room!.getEventReadUpTo = () => events[1].getId() ?? null;

    return {
        timelineSet,
        manageReadReceipts: true,
        sendReadReceiptOnLoad: true,
    };
};

const mockEvents = (room: Room, count = 2): MatrixEvent[] => {
    const events: MatrixEvent[] = [];
    for (let index = 0; index < count; index++) {
        events.push(
            new MatrixEvent({
                room_id: room.roomId,
                event_id: `${room.roomId}_event_${index}`,
                type: EventType.RoomMessage,
                sender: "userId",
                content: createMessageEventContent("`Event${index}`"),
            }),
        );
    }

    return events;
};

const setupTestData = (): [MatrixClient, Room, MatrixEvent[]] => {
    const client = MatrixClientPeg.get();
    const room = mkRoom(client, "roomId");
    const events = mockEvents(room);
    return [client, room, events];
};

describe("TimelinePanel", () => {
    let client: Mocked<MatrixClient>;
    let userId: string;

    filterConsole("checkForPreJoinUISI: showing all messages, skipping check");

    beforeEach(() => {
        client = mocked(stubClient());
        userId = client.getSafeUserId();
    });

    describe("read receipts and markers", () => {
        const roomId = "#room:example.com";
        let room: Room;
        let timelineSet: EventTimelineSet;
        let timelinePanel: TimelinePanel;

        const ev1 = new MatrixEvent({
            event_id: "ev1",
            sender: "@u2:m.org",
            origin_server_ts: 111,
            type: EventType.RoomMessage,
            content: createMessageEventContent("hello 1"),
        });

        const ev2 = new MatrixEvent({
            event_id: "ev2",
            sender: "@u2:m.org",
            origin_server_ts: 222,
            type: EventType.RoomMessage,
            content: createMessageEventContent("hello 2"),
        });

        const renderTimelinePanel = async (): Promise<void> => {
            const ref = createRef<TimelinePanel>();
            render(
                <TimelinePanel
                    timelineSet={timelineSet}
                    manageReadMarkers={true}
                    manageReadReceipts={true}
                    ref={ref}
                />,
            );
            await flushPromises();
            timelinePanel = ref.current;
        };

        const setUpTimelineSet = (threadRoot?: MatrixEvent) => {
            let thread: Thread | undefined = undefined;

            if (threadRoot) {
                thread = new Thread(threadRoot.getId(), threadRoot, {
                    client: client,
                    room,
                });
            }

            timelineSet = new EventTimelineSet(room, {}, client, thread);
            timelineSet.on(RoomEvent.Timeline, (...args) => {
                // TimelinePanel listens for live events on the client.
                // → Re-emit on the client.
                client.emit(RoomEvent.Timeline, ...args);
            });
        };

        beforeEach(() => {
            room = new Room(roomId, client, userId, { pendingEventOrdering: PendingEventOrdering.Detached });
        });

        afterEach(() => {
            TimelinePanel.roomReadMarkerTsMap = {};
        });

        describe("when there is a non-threaded timeline", () => {
            beforeEach(() => {
                setUpTimelineSet();
            });

            describe("and reading the timeline", () => {
                beforeEach(async () => {
                    await renderTimelinePanel();
                    timelineSet.addLiveEvent(ev1, {});
                    await flushPromises();

                    // @ts-ignore
                    await timelinePanel.sendReadReceipts();
                    // @ts-ignore Simulate user activity by calling updateReadMarker on the TimelinePanel.
                    timelinePanel.updateReadMarker();

                    await flushPromises();
                });

                it("should send a fully read marker and a public receipt", async () => {
                    expect(client.sendReadReceipt).toHaveBeenCalledWith(ev1, ReceiptType.FullyRead, true);
                    expect(client.sendReadReceipt).toHaveBeenCalledWith(ev1, ReceiptType.Read);
                });

                describe("and reading the timeline again", () => {
                    beforeEach(async () => {
                        client.sendReadReceipt.mockClear();

                        // @ts-ignore Simulate user activity by calling updateReadMarker on the TimelinePanel.
                        timelinePanel.updateReadMarker();
                    });

                    it("should not send receipts again", () => {
                        expect(client.sendReadReceipt).not.toHaveBeenCalled();
                    });

                    it("and forgetting the read markers, should send the stored marker again", async () => {
                        timelineSet.addLiveEvent(ev2, {});
                        room.addEphemeralEvents([newReceipt(ev2.getId(), userId, 222, 200)]);
                        timelinePanel.forgetReadMarker();
                        await flushPromises();
                        expect(client.sendReadReceipt).toHaveBeenCalledWith(ev2, ReceiptType.FullyRead, true);
                    });
                });
            });

            describe("and sending receipts is disabled", () => {
                beforeEach(async () => {
                    client.isVersionSupported.mockResolvedValue(true);
                    client.doesServerSupportUnstableFeature.mockResolvedValue(true);

                    jest.spyOn(SettingsStore, "getValue").mockImplementation((setting: string) => {
                        if (setting === "sendReadReceipt") return false;

                        return undefined;
                    });
                });

                afterEach(() => {
                    mocked(SettingsStore.getValue).mockReset();
                });

                it("should send a fully read marker and a private receipt", async () => {
                    await renderTimelinePanel();
                    timelineSet.addLiveEvent(ev1, {});
                    await flushPromises();

                    // @ts-ignore
                    await timelinePanel.sendReadReceipts();

                    // Expect the private reception to be sent directly
                    expect(client.sendReadReceipt).toHaveBeenCalledWith(ev1, ReceiptType.ReadPrivate);
                    // Expect the fully_read marker not to be send yet
                    expect(client.sendReadReceipt).not.toHaveBeenCalledWith(ev1, ReceiptType.FullyRead, true);

                    client.sendReadReceipt.mockClear();

                    // @ts-ignore simulate user activity
                    timelinePanel.updateReadMarker();

                    // It should not send the receipt again.
                    expect(client.sendReadReceipt).not.toHaveBeenCalledWith(ev1, ReceiptType.ReadPrivate);
                    // Expect the fully_read marker to be sent after user activity.
                    expect(client.sendReadReceipt).toHaveBeenCalledWith(ev1, ReceiptType.FullyRead, true);
                });
            });
        });

        describe("and there is a thread timeline", () => {
            const threadEv1 = new MatrixEvent({
                event_id: "thread_ev1",
                sender: "@u2:m.org",
                origin_server_ts: 222,
                type: EventType.RoomMessage,
                content: {
                    ...createMessageEventContent("hello 2"),
                    "m.relates_to": {
                        event_id: ev1.getId(),
                        rel_type: RelationType.Thread,
                    },
                },
            });

            beforeEach(() => {
                client.supportsThreads.mockReturnValue(true);
                setUpTimelineSet(ev1);
            });

            it("should send receipts but no fully_read when reading the thread timeline", async () => {
                await renderTimelinePanel();
                timelineSet.addLiveEvent(threadEv1, {});
                await flushPromises();

                // @ts-ignore
                await timelinePanel.sendReadReceipts();

                // fully_read is not supported for threads per spec
                expect(client.sendReadReceipt).not.toHaveBeenCalledWith(threadEv1, ReceiptType.FullyRead, true);
                expect(client.sendReadReceipt).toHaveBeenCalledWith(threadEv1, ReceiptType.Read);
            });
        });
    });

    it("should scroll event into view when props.eventId changes", () => {
        const client = MatrixClientPeg.get();
        const room = mkRoom(client, "roomId");
        const events = mockEvents(room);

        const props = {
            ...getProps(room, events),
            onEventScrolledIntoView: jest.fn(),
        };

        const { rerender } = render(<TimelinePanel {...props} />);
        expect(props.onEventScrolledIntoView).toHaveBeenCalledWith(undefined);
        props.eventId = events[1].getId();
        rerender(<TimelinePanel {...props} />);
        expect(props.onEventScrolledIntoView).toHaveBeenCalledWith(events[1].getId());
    });

    describe("onRoomTimeline", () => {
        it("ignores events for other timelines", () => {
            const [client, room, events] = setupTestData();

            const otherTimelineSet = { room: room as Room } as EventTimelineSet;
            const otherTimeline = new EventTimeline(otherTimelineSet);

            const props = {
                ...getProps(room, events),
                onEventScrolledIntoView: jest.fn(),
            };

            const paginateSpy = jest.spyOn(TimelineWindow.prototype, "paginate").mockClear();

            render(<TimelinePanel {...props} />);

            const event = new MatrixEvent({ type: RoomEvent.Timeline });
            const data = { timeline: otherTimeline, liveEvent: true };
            client.emit(RoomEvent.Timeline, event, room, false, false, data);

            expect(paginateSpy).not.toHaveBeenCalled();
        });

        it("ignores timeline updates without a live event", () => {
            const [client, room, events] = setupTestData();

            const props = getProps(room, events);

            const paginateSpy = jest.spyOn(TimelineWindow.prototype, "paginate").mockClear();

            render(<TimelinePanel {...props} />);

            const event = new MatrixEvent({ type: RoomEvent.Timeline });
            const data = { timeline: props.timelineSet.getLiveTimeline(), liveEvent: false };
            client.emit(RoomEvent.Timeline, event, room, false, false, data);

            expect(paginateSpy).not.toHaveBeenCalled();
        });

        it("ignores timeline where toStartOfTimeline is true", () => {
            const [client, room, events] = setupTestData();

            const props = getProps(room, events);

            const paginateSpy = jest.spyOn(TimelineWindow.prototype, "paginate").mockClear();

            render(<TimelinePanel {...props} />);

            const event = new MatrixEvent({ type: RoomEvent.Timeline });
            const data = { timeline: props.timelineSet.getLiveTimeline(), liveEvent: false };
            const toStartOfTimeline = true;
            client.emit(RoomEvent.Timeline, event, room, toStartOfTimeline, false, data);

            expect(paginateSpy).not.toHaveBeenCalled();
        });

        it("advances the timeline window", () => {
            const [client, room, events] = setupTestData();

            const props = getProps(room, events);

            const paginateSpy = jest.spyOn(TimelineWindow.prototype, "paginate").mockClear();

            render(<TimelinePanel {...props} />);

            const event = new MatrixEvent({ type: RoomEvent.Timeline });
            const data = { timeline: props.timelineSet.getLiveTimeline(), liveEvent: true };
            client.emit(RoomEvent.Timeline, event, room, false, false, data);

            expect(paginateSpy).toHaveBeenCalledWith(EventTimeline.FORWARDS, 1, false);
        });

        it("advances the overlay timeline window", async () => {
            const [client, room, events] = setupTestData();

            const virtualRoom = mkRoom(client, "virtualRoomId");
            const virtualEvents = mockEvents(virtualRoom);
            const { timelineSet: overlayTimelineSet } = getProps(virtualRoom, virtualEvents);

            const props = {
                ...getProps(room, events),
                overlayTimelineSet,
            };

            const paginateSpy = jest.spyOn(TimelineWindow.prototype, "paginate").mockClear();

            render(<TimelinePanel {...props} />);

            const event = new MatrixEvent({ type: RoomEvent.Timeline });
            const data = { timeline: props.timelineSet.getLiveTimeline(), liveEvent: true };
            client.emit(RoomEvent.Timeline, event, room, false, false, data);

            await flushPromises();

            expect(paginateSpy).toHaveBeenCalledTimes(2);
        });
    });

    describe("with overlayTimeline", () => {
        // Trying to understand why this is not passing anymore
        it.skip("renders merged timeline", () => {
            const [client, room, events] = setupTestData();
            const virtualRoom = mkRoom(client, "virtualRoomId");
            const virtualCallInvite = new MatrixEvent({
                type: "m.call.invite",
                room_id: virtualRoom.roomId,
                event_id: `virtualCallEvent1`,
            });
            const virtualCallMetaEvent = new MatrixEvent({
                type: "org.matrix.call.sdp_stream_metadata_changed",
                room_id: virtualRoom.roomId,
                event_id: `virtualCallEvent2`,
            });
            const virtualEvents = [virtualCallInvite, ...mockEvents(virtualRoom), virtualCallMetaEvent];
            const { timelineSet: overlayTimelineSet } = getProps(virtualRoom, virtualEvents);

            const props = {
                ...getProps(room, events),
                overlayTimelineSet,
                overlayTimelineSetFilter: isCallEvent,
            };

            const { container } = render(<TimelinePanel {...props} />);

            const eventTiles = container.querySelectorAll(".mx_EventTile");
            const eventTileIds = [...eventTiles].map((tileElement) => tileElement.getAttribute("data-event-id"));
            expect(eventTileIds).toEqual([
                // main timeline events are included
                events[1].getId(),
                events[0].getId(),
                // virtual timeline call event is included
                virtualCallInvite.getId(),
                // virtual call event has no tile renderer => not rendered
            ]);
        });
    });

    describe("when a thread updates", () => {
        let client: MatrixClient;
        let room: Room;
        let allThreads: EventTimelineSet;
        let root: MatrixEvent;
        let reply1: MatrixEvent;
        let reply2: MatrixEvent;

        beforeEach(() => {
            client = MatrixClientPeg.get();

            Thread.hasServerSideSupport = FeatureSupport.Stable;
            room = new Room("roomId", client, "userId");
            allThreads = new EventTimelineSet(
                room,
                {
                    pendingEvents: false,
                },
                undefined,
                undefined,
                ThreadFilterType.All,
            );
            const timeline = new EventTimeline(allThreads);
            allThreads.getLiveTimeline = () => timeline;
            allThreads.getTimelineForEvent = () => timeline;

            reply1 = new MatrixEvent({
                room_id: room.roomId,
                event_id: "event_reply_1",
                type: EventType.RoomMessage,
                sender: "userId",
                content: createMessageEventContent("ReplyEvent1"),
            });

            reply2 = new MatrixEvent({
                room_id: room.roomId,
                event_id: "event_reply_2",
                type: EventType.RoomMessage,
                sender: "userId",
                content: createMessageEventContent("ReplyEvent2"),
            });

            root = new MatrixEvent({
                room_id: room.roomId,
                event_id: "event_root_1",
                type: EventType.RoomMessage,
                sender: "userId",
                content: createMessageEventContent("RootEvent"),
            });

            const eventMap: { [key: string]: MatrixEvent } = {
                [root.getId()!]: root,
                [reply1.getId()!]: reply1,
                [reply2.getId()!]: reply2,
            };

            room.findEventById = (eventId: string) => eventMap[eventId];
            client.fetchRoomEvent = async (roomId: string, eventId: string) =>
                roomId === room.roomId ? eventMap[eventId]?.event : {};
        });

        it("updates thread previews", async () => {
            root.setUnsigned({
                "m.relations": {
                    [THREAD_RELATION_TYPE.name]: {
                        latest_event: reply1.event,
                        count: 1,
                        current_user_participated: true,
                    },
                },
            });

            const thread = room.createThread(root.getId()!, root, [], true);
            // So that we do not have to mock the thread loading
            thread.initialEventsFetched = true;
            // @ts-ignore
            thread.fetchEditsWhereNeeded = () => Promise.resolve();
            await thread.addEvent(reply1, true);
            await allThreads.getLiveTimeline().addEvent(thread.rootEvent!, { toStartOfTimeline: true });
            const replyToEvent = jest.spyOn(thread, "replyToEvent", "get");

            const dom = render(
                <MatrixClientContext.Provider value={client}>
                    <TimelinePanel timelineSet={allThreads} manageReadReceipts sendReadReceiptOnLoad />
                </MatrixClientContext.Provider>,
            );
            await dom.findByText("RootEvent");
            await dom.findByText("ReplyEvent1");
            expect(replyToEvent).toHaveBeenCalled();

            root.setUnsigned({
                "m.relations": {
                    [THREAD_RELATION_TYPE.name]: {
                        latest_event: reply2.event,
                        count: 2,
                        current_user_participated: true,
                    },
                },
            });

            replyToEvent.mockClear();
            await thread.addEvent(reply2, false, true);
            await dom.findByText("RootEvent");
            await dom.findByText("ReplyEvent2");
            expect(replyToEvent).toHaveBeenCalled();
        });

        it("ignores thread updates for unknown threads", async () => {
            root.setUnsigned({
                "m.relations": {
                    [THREAD_RELATION_TYPE.name]: {
                        latest_event: reply1.event,
                        count: 1,
                        current_user_participated: true,
                    },
                },
            });

            const realThread = room.createThread(root.getId()!, root, [], true);
            // So that we do not have to mock the thread loading
            realThread.initialEventsFetched = true;
            // @ts-ignore
            realThread.fetchEditsWhereNeeded = () => Promise.resolve();
            await realThread.addEvent(reply1, true);
            await allThreads.getLiveTimeline().addEvent(realThread.rootEvent!, { toStartOfTimeline: true });
            const replyToEvent = jest.spyOn(realThread, "replyToEvent", "get");

            // @ts-ignore
            const fakeThread1: Thread = {
                id: undefined!,
                get roomId(): string {
                    return room.roomId;
                },
            };

            const fakeRoom = new Room("thisroomdoesnotexist", client, "userId");
            // @ts-ignore
            const fakeThread2: Thread = {
                id: root.getId()!,
                get roomId(): string {
                    return fakeRoom.roomId;
                },
            };

            const dom = render(
                <MatrixClientContext.Provider value={client}>
                    <TimelinePanel timelineSet={allThreads} manageReadReceipts sendReadReceiptOnLoad />
                </MatrixClientContext.Provider>,
            );
            await dom.findByText("RootEvent");
            await dom.findByText("ReplyEvent1");
            expect(replyToEvent).toHaveBeenCalled();

            replyToEvent.mockClear();
            room.emit(ThreadEvent.Update, fakeThread1);
            room.emit(ThreadEvent.Update, fakeThread2);
            await dom.findByText("ReplyEvent1");
            expect(replyToEvent).not.toHaveBeenCalled();
            replyToEvent.mockClear();
        });
    });

    it("renders when the last message is an undecryptable thread root", async () => {
        const client = MatrixClientPeg.get();
        client.isRoomEncrypted = () => true;
        client.supportsThreads = () => true;
        client.decryptEventIfNeeded = () => Promise.resolve();
        const authorId = client.getUserId()!;
        const room = new Room("roomId", client, authorId, {
            lazyLoadMembers: false,
            pendingEventOrdering: PendingEventOrdering.Detached,
        });

        const events = mockEvents(room);
        const timelineSet = room.getUnfilteredTimelineSet();

        const { rootEvent } = mkThread({
            room,
            client,
            authorId,
            participantUserIds: [authorId],
        });

        events.push(rootEvent);

        events.forEach((event) => timelineSet.getLiveTimeline().addEvent(event, { toStartOfTimeline: true }));

        const roomMembership = mkMembership({
            mship: "join",
            prevMship: "join",
            user: authorId,
            room: room.roomId,
            event: true,
            skey: "123",
        });

        events.push(roomMembership);

        const member = new RoomMember(room.roomId, authorId);
        member.membership = "join";

        const roomState = new RoomState(room.roomId);
        jest.spyOn(roomState, "getMember").mockReturnValue(member);

        jest.spyOn(timelineSet.getLiveTimeline(), "getState").mockReturnValue(roomState);
        timelineSet.addEventToTimeline(roomMembership, timelineSet.getLiveTimeline(), { toStartOfTimeline: false });

        for (const event of events) {
            jest.spyOn(event, "isDecryptionFailure").mockReturnValue(true);
            jest.spyOn(event, "shouldAttemptDecryption").mockReturnValue(false);
        }

        const { container } = render(
            <MatrixClientContext.Provider value={client}>
                <TimelinePanel timelineSet={timelineSet} manageReadReceipts={true} sendReadReceiptOnLoad={true} />
            </MatrixClientContext.Provider>,
        );

        await waitFor(() => expect(screen.queryByRole("progressbar")).toBeNull());
        await waitFor(() => expect(container.querySelector(".mx_RoomView_MessageList")).not.toBeEmptyDOMElement());
    });
});
