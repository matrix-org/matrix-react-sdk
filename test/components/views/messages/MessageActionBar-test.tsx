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

import React from "react";
import {
    EventType,
    EventStatus,
    MatrixEvent,
    MatrixEventEvent,
    MsgType,
    Room,
    FeatureSupport,
    Thread,
} from "matrix-js-sdk/src/matrix";

import { act, render, fireEvent } from "../../..";
import MessageActionBar from "../../../../src/components/views/messages/MessageActionBar";
import {
    getMockClientWithEventEmitter,
    mockClientMethodsUser,
    mockClientMethodsEvents,
    makeBeaconInfoEvent,
} from "../../../test-utils";
import { RoomPermalinkCreator } from "../../../../src/utils/permalinks/Permalinks";
import RoomContext, { TimelineRenderingType } from "../../../../src/contexts/RoomContext";
import { IRoomState } from "../../../../src/components/structures/RoomView";
import dispatcher from "../../../../src/dispatcher/dispatcher";
import SettingsStore from "../../../../src/settings/SettingsStore";
import { Action } from "../../../../src/dispatcher/actions";

jest.mock("../../../../src/dispatcher/dispatcher");

describe("<MessageActionBar />", () => {
    const userId = "@alice:server.org";
    const roomId = "!room:server.org";
    const alicesMessageEvent = new MatrixEvent({
        type: EventType.RoomMessage,
        sender: userId,
        room_id: roomId,
        content: {
            msgtype: MsgType.Text,
            body: "Hello",
        },
        event_id: "$alices_message",
    });

    const bobsMessageEvent = new MatrixEvent({
        type: EventType.RoomMessage,
        sender: "@bob:server.org",
        room_id: roomId,
        content: {
            msgtype: MsgType.Text,
            body: "I am bob",
        },
        event_id: "$bobs_message",
    });

    const redactedEvent = new MatrixEvent({
        type: EventType.RoomMessage,
        sender: userId,
    });
    redactedEvent.makeRedacted(redactedEvent);

    const client = getMockClientWithEventEmitter({
        ...mockClientMethodsUser(userId),
        ...mockClientMethodsEvents(),
        getRoom: jest.fn(),
    });

    const localStorageMock = (() => {
        let store: Record<string, any> = {};
        return {
            getItem: jest.fn().mockImplementation((key) => store[key] ?? null),
            setItem: jest.fn().mockImplementation((key, value) => {
                store[key] = value;
            }),
            clear: jest.fn().mockImplementation(() => {
                store = {};
            }),
            removeItem: jest.fn().mockImplementation((key) => delete store[key]),
        };
    })();
    Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
        writable: true,
    });

    const room = new Room(roomId, client, userId);
    jest.spyOn(room, "getPendingEvents").mockReturnValue([]);

    client.getRoom.mockReturnValue(room);

    const defaultProps = {
        getTile: jest.fn(),
        getReplyChain: jest.fn(),
        toggleThreadExpanded: jest.fn(),
        mxEvent: alicesMessageEvent,
        permalinkCreator: new RoomPermalinkCreator(room),
    };
    const defaultRoomContext = {
        ...RoomContext,
        timelineRenderingType: TimelineRenderingType.Room,
        canSendMessages: true,
        canReact: true,
    } as unknown as IRoomState;
    const getComponent = (props = {}, roomContext: Partial<IRoomState> = {}) =>
        render(
            <RoomContext.Provider value={{ ...defaultRoomContext, ...roomContext }}>
                <MessageActionBar {...defaultProps} {...props} />
            </RoomContext.Provider>,
        );

    beforeEach(() => {
        jest.clearAllMocks();
        alicesMessageEvent.setStatus(EventStatus.SENT);
        jest.spyOn(SettingsStore, "getValue").mockReturnValue(false);
        jest.spyOn(SettingsStore, "setValue").mockResolvedValue(undefined);
    });

    afterAll(() => {
        jest.spyOn(SettingsStore, "getValue").mockRestore();
        jest.spyOn(SettingsStore, "setValue").mockRestore();
    });

    it("kills event listeners on unmount", () => {
        const offSpy = jest.spyOn(alicesMessageEvent, "off").mockClear();
        const wrapper = getComponent({ mxEvent: alicesMessageEvent });

        act(() => {
            wrapper.unmount();
        });

        expect(offSpy.mock.calls[0][0]).toEqual(MatrixEventEvent.Status);
        expect(offSpy.mock.calls[1][0]).toEqual(MatrixEventEvent.Decrypted);
        expect(offSpy.mock.calls[2][0]).toEqual(MatrixEventEvent.BeforeRedaction);

        expect(client.decryptEventIfNeeded).toHaveBeenCalled();
    });

    describe("decryption", () => {
        it("decrypts event if needed", () => {
            getComponent({ mxEvent: alicesMessageEvent });
            expect(client.decryptEventIfNeeded).toHaveBeenCalled();
        });

        it("updates component on decrypted event", () => {
            const decryptingEvent = new MatrixEvent({
                type: EventType.RoomMessageEncrypted,
                sender: userId,
                room_id: roomId,
                content: {},
            });
            jest.spyOn(decryptingEvent, "isBeingDecrypted").mockReturnValue(true);
            const { queryByTestId } = getComponent({ mxEvent: decryptingEvent });

            // still encrypted event is not actionable => no reply button
            expect(queryByTestId("Reply")).toBeFalsy();

            act(() => {
                // ''decrypt'' the event
                decryptingEvent.event.type = alicesMessageEvent.getType();
                decryptingEvent.event.content = alicesMessageEvent.getContent();
                decryptingEvent.emit(MatrixEventEvent.Decrypted, decryptingEvent);
            });

            // new available actions after decryption
            expect(queryByTestId("Reply")).toBeTruthy();
        });
    });

    describe("status", () => {
        it("updates component when event status changes", () => {
            alicesMessageEvent.setStatus(EventStatus.QUEUED);
            const { queryByTestId } = getComponent({ mxEvent: alicesMessageEvent });

            // pending event status, cancel action available
            expect(queryByTestId("Delete")).toBeTruthy();

            act(() => {
                alicesMessageEvent.setStatus(EventStatus.SENT);
            });

            // event is sent, no longer cancelable
            expect(queryByTestId("Delete")).toBeFalsy();
        });
    });

    describe("redaction", () => {
        // this doesn't do what it's supposed to
        // because beforeRedaction event is fired... before redaction
        // event is unchanged at point when this component updates
        // TODO file bug
        it.skip("updates component on before redaction event", () => {
            const event = new MatrixEvent({
                type: EventType.RoomMessage,
                sender: userId,
                room_id: roomId,
                content: {
                    msgtype: MsgType.Text,
                    body: "Hello",
                },
            });
            const { queryByTestId } = getComponent({ mxEvent: event });

            // no pending redaction => no delete button
            expect(queryByTestId("Delete")).toBeFalsy();

            act(() => {
                const redactionEvent = new MatrixEvent({
                    type: EventType.RoomRedaction,
                    sender: userId,
                    room_id: roomId,
                });
                redactionEvent.setStatus(EventStatus.QUEUED);
                event.markLocallyRedacted(redactionEvent);
            });

            // updated with local redaction event, delete now available
            expect(queryByTestId("Delete")).toBeTruthy();
        });
    });

    describe("options button", () => {
        it("renders options menu", () => {
            const { queryByTestId } = getComponent({ mxEvent: alicesMessageEvent });
            expect(queryByTestId("Options")).toBeTruthy();
        });

        it("opens message context menu on click", () => {
            const { getByTestId, queryByTestId } = getComponent({ mxEvent: alicesMessageEvent });
            fireEvent.click(queryByTestId("Options")!);
            expect(getByTestId("mx_MessageContextMenu")).toBeTruthy();
        });
    });

    describe("reply button", () => {
        it("renders reply button on own actionable event", () => {
            const { queryByTestId } = getComponent({ mxEvent: alicesMessageEvent });
            expect(queryByTestId("Reply")).toBeTruthy();
        });

        it("renders reply button on others actionable event", () => {
            const { queryByTestId } = getComponent({ mxEvent: bobsMessageEvent }, { canSendMessages: true });
            expect(queryByTestId("Reply")).toBeTruthy();
        });

        it("does not render reply button on non-actionable event", () => {
            // redacted event is not actionable
            const { queryByTestId } = getComponent({ mxEvent: redactedEvent });
            expect(queryByTestId("Reply")).toBeFalsy();
        });

        it("does not render reply button when user cannot send messaged", () => {
            // redacted event is not actionable
            const { queryByTestId } = getComponent({ mxEvent: redactedEvent }, { canSendMessages: false });
            expect(queryByTestId("Reply")).toBeFalsy();
        });

        it("dispatches reply event on click", () => {
            const { queryByTestId } = getComponent({ mxEvent: alicesMessageEvent });

            fireEvent.click(queryByTestId("Reply")!);

            expect(dispatcher.dispatch).toHaveBeenCalledWith({
                action: "reply_to_event",
                event: alicesMessageEvent,
                context: TimelineRenderingType.Room,
            });
        });
    });

    describe("react button", () => {
        it("renders react button on own actionable event", () => {
            const { queryByTestId } = getComponent({ mxEvent: alicesMessageEvent });
            expect(queryByTestId("React")).toBeTruthy();
        });

        it("renders react button on others actionable event", () => {
            const { queryByTestId } = getComponent({ mxEvent: bobsMessageEvent });
            expect(queryByTestId("React")).toBeTruthy();
        });

        it("does not render react button on non-actionable event", () => {
            // redacted event is not actionable
            const { queryByTestId } = getComponent({ mxEvent: redactedEvent });
            expect(queryByTestId("React")).toBeFalsy();
        });

        it("does not render react button when user cannot react", () => {
            // redacted event is not actionable
            const { queryByTestId } = getComponent({ mxEvent: redactedEvent }, { canReact: false });
            expect(queryByTestId("React")).toBeFalsy();
        });

        it("opens reaction picker on click", () => {
            const { queryByTestId, getByTestId } = getComponent({ mxEvent: alicesMessageEvent });
            fireEvent.click(queryByTestId("React")!);
            expect(getByTestId("mx_EmojiPicker")).toBeTruthy();
        });
    });

    describe("cancel button", () => {
        it("renders cancel button for an event with a cancelable status", () => {
            alicesMessageEvent.setStatus(EventStatus.QUEUED);
            const { queryByTestId } = getComponent({ mxEvent: alicesMessageEvent });
            expect(queryByTestId("Delete")).toBeTruthy();
        });

        it("renders cancel button for an event with a pending edit", () => {
            const event = new MatrixEvent({
                type: EventType.RoomMessage,
                sender: userId,
                room_id: roomId,
                content: {
                    msgtype: MsgType.Text,
                    body: "Hello",
                },
            });
            event.setStatus(EventStatus.SENT);
            const replacingEvent = new MatrixEvent({
                type: EventType.RoomMessage,
                sender: userId,
                room_id: roomId,
                content: {
                    msgtype: MsgType.Text,
                    body: "replacing event body",
                },
            });
            replacingEvent.setStatus(EventStatus.QUEUED);
            event.makeReplaced(replacingEvent);
            const { queryByTestId } = getComponent({ mxEvent: event });
            expect(queryByTestId("Delete")).toBeTruthy();
        });

        it("renders cancel button for an event with a pending redaction", () => {
            const event = new MatrixEvent({
                type: EventType.RoomMessage,
                sender: userId,
                room_id: roomId,
                content: {
                    msgtype: MsgType.Text,
                    body: "Hello",
                },
            });
            event.setStatus(EventStatus.SENT);

            const redactionEvent = new MatrixEvent({
                type: EventType.RoomRedaction,
                sender: userId,
                room_id: roomId,
            });
            redactionEvent.setStatus(EventStatus.QUEUED);

            event.markLocallyRedacted(redactionEvent);
            const { queryByTestId } = getComponent({ mxEvent: event });
            expect(queryByTestId("Delete")).toBeTruthy();
        });

        it("renders cancel and retry button for an event with NOT_SENT status", () => {
            alicesMessageEvent.setStatus(EventStatus.NOT_SENT);
            const { queryByTestId } = getComponent({ mxEvent: alicesMessageEvent });
            expect(queryByTestId("Retry")).toBeTruthy();
            expect(queryByTestId("Delete")).toBeTruthy();
        });

        it.todo("unsends event on cancel click");
        it.todo("retrys event on retry click");
    });

    describe("thread button", () => {
        beforeEach(() => {
            Thread.setServerSideSupport(FeatureSupport.Stable);
        });

        describe("when threads feature is enabled", () => {
            it("renders thread button on own actionable event", () => {
                const { queryByTestId } = getComponent({ mxEvent: alicesMessageEvent });
                expect(queryByTestId("Reply in thread")).toBeTruthy();
            });

            it("does not render thread button for a beacon_info event", () => {
                const beaconInfoEvent = makeBeaconInfoEvent(userId, roomId);
                const { queryByTestId } = getComponent({ mxEvent: beaconInfoEvent });
                expect(queryByTestId("Reply in thread")).toBeFalsy();
            });

            it("opens thread on click", () => {
                const { getByTestId } = getComponent({ mxEvent: alicesMessageEvent });

                fireEvent.click(getByTestId("Reply in thread"));

                expect(dispatcher.dispatch).toHaveBeenCalledWith({
                    action: Action.ShowThread,
                    rootEvent: alicesMessageEvent,
                    push: false,
                });
            });

            it("opens parent thread for a thread reply message", () => {
                const threadReplyEvent = new MatrixEvent({
                    type: EventType.RoomMessage,
                    sender: userId,
                    room_id: roomId,
                    content: {
                        msgtype: MsgType.Text,
                        body: "this is a thread reply",
                    },
                });
                // mock the thread stuff
                jest.spyOn(threadReplyEvent, "isThreadRoot", "get").mockReturnValue(false);
                // set alicesMessageEvent as the root event
                jest.spyOn(threadReplyEvent, "getThread").mockReturnValue({
                    rootEvent: alicesMessageEvent,
                } as unknown as Thread);
                const { getByTestId } = getComponent({ mxEvent: threadReplyEvent });

                fireEvent.click(getByTestId("Reply in thread"));

                expect(dispatcher.dispatch).toHaveBeenCalledWith({
                    action: Action.ShowThread,
                    rootEvent: alicesMessageEvent,
                    initialEvent: threadReplyEvent,
                    highlighted: true,
                    scroll_into_view: true,
                    push: false,
                });
            });
        });
    });

    it.each([["React"], ["Reply"], ["Reply in thread"], ["Edit"]])(
        "does not show context menu when right-clicking",
        (buttonLabel: string) => {
            // For favourite button
            jest.spyOn(SettingsStore, "getValue").mockReturnValue(true);

            const event = new MouseEvent("contextmenu", {
                bubbles: true,
                cancelable: true,
            });
            event.stopPropagation = jest.fn();
            event.preventDefault = jest.fn();

            const { queryByTestId } = getComponent({ mxEvent: alicesMessageEvent });
            fireEvent(queryByTestId(buttonLabel)!, event);
            expect(event.stopPropagation).toHaveBeenCalled();
            expect(event.preventDefault).toHaveBeenCalled();
            expect(queryByTestId("mx_MessageContextMenu")).toBeFalsy();
        },
    );

    it("does shows context menu when right-clicking options", () => {
        const { queryByTestId } = getComponent({ mxEvent: alicesMessageEvent });
        fireEvent.contextMenu(queryByTestId("Options")!);
        expect(queryByTestId("mx_MessageContextMenu")).toBeTruthy();
    });
});
