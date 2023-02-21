/*
Copyright 2020 The Matrix.org Foundation C.I.C.

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
import { fireEvent, render, waitFor } from "@testing-library/react";
import { MatrixClient, MsgType } from "matrix-js-sdk/src/matrix";
import { mocked } from "jest-mock";

import SendMessageComposer, {
    createMessageContent,
    isQuickReaction,
} from "../../../../src/components/views/rooms/SendMessageComposer";
import MatrixClientContext from "../../../../src/contexts/MatrixClientContext";
import RoomContext, { TimelineRenderingType } from "../../../../src/contexts/RoomContext";
import EditorModel from "../../../../src/editor/model";
import { createPartCreator, createRenderer } from "../../../editor/mock";
import { createTestClient, mkEvent, mkStubRoom } from "../../../test-utils";
import { MatrixClientPeg } from "../../../../src/MatrixClientPeg";
import defaultDispatcher from "../../../../src/dispatcher/dispatcher";
import DocumentOffset from "../../../../src/editor/offset";
import { Layout } from "../../../../src/settings/enums/Layout";
import { IRoomState } from "../../../../src/components/structures/RoomView";
import { RoomPermalinkCreator } from "../../../../src/utils/permalinks/Permalinks";
import { mockPlatformPeg } from "../../../test-utils/platform";
import { doMaybeLocalRoomAction } from "../../../../src/utils/local-room";
import { addTextToComposer } from "../../../test-utils/composer";
import dis from "../../../../src/dispatcher/dispatcher";

jest.mock("../../../../src/utils/local-room", () => ({
    doMaybeLocalRoomAction: jest.fn(),
}));

describe("<SendMessageComposer/>", () => {
    const defaultRoomContext: IRoomState = {
        roomLoading: true,
        peekLoading: false,
        shouldPeek: true,
        membersLoaded: false,
        numUnreadMessages: 0,
        canPeek: false,
        showApps: false,
        isPeeking: false,
        showRightPanel: true,
        joining: false,
        atEndOfLiveTimeline: true,
        showTopUnreadMessagesBar: false,
        statusBarVisible: false,
        canReact: false,
        canSendMessages: false,
        layout: Layout.Group,
        lowBandwidth: false,
        alwaysShowTimestamps: false,
        showTwelveHourTimestamps: false,
        readMarkerInViewThresholdMs: 3000,
        readMarkerOutOfViewThresholdMs: 30000,
        showHiddenEvents: false,
        showReadReceipts: true,
        showRedactions: true,
        showJoinLeaves: true,
        showAvatarChanges: true,
        showDisplaynameChanges: true,
        matrixClientIsReady: false,
        timelineRenderingType: TimelineRenderingType.Room,
        liveTimeline: undefined,
        canSelfRedact: false,
        resizing: false,
        narrow: false,
        activeCall: null,
        msc3946ProcessDynamicPredecessor: false,
    };
    describe("createMessageContent", () => {
        const permalinkCreator = jest.fn() as any;

        it("sends plaintext messages correctly", () => {
            const model = new EditorModel([], createPartCreator(), createRenderer());
            const documentOffset = new DocumentOffset(11, true);
            model.update("hello world", "insertText", documentOffset);

            const content = createMessageContent(model, undefined, undefined, permalinkCreator);

            expect(content).toEqual({
                body: "hello world",
                msgtype: "m.text",
            });
        });

        it("sends markdown messages correctly", () => {
            const model = new EditorModel([], createPartCreator(), createRenderer());
            const documentOffset = new DocumentOffset(13, true);
            model.update("hello *world*", "insertText", documentOffset);

            const content = createMessageContent(model, undefined, undefined, permalinkCreator);

            expect(content).toEqual({
                body: "hello *world*",
                msgtype: "m.text",
                format: "org.matrix.custom.html",
                formatted_body: "hello <em>world</em>",
            });
        });

        it("strips /me from messages and marks them as m.emote accordingly", () => {
            const model = new EditorModel([], createPartCreator(), createRenderer());
            const documentOffset = new DocumentOffset(22, true);
            model.update("/me blinks __quickly__", "insertText", documentOffset);

            const content = createMessageContent(model, undefined, undefined, permalinkCreator);

            expect(content).toEqual({
                body: "blinks __quickly__",
                msgtype: "m.emote",
                format: "org.matrix.custom.html",
                formatted_body: "blinks <strong>quickly</strong>",
            });
        });

        it("allows emoting with non-text parts", () => {
            const model = new EditorModel([], createPartCreator(), createRenderer());
            const documentOffset = new DocumentOffset(16, true);
            model.update("/me ✨sparkles✨", "insertText", documentOffset);
            expect(model.parts.length).toEqual(4); // Emoji count as non-text

            const content = createMessageContent(model, undefined, undefined, permalinkCreator);

            expect(content).toEqual({
                body: "✨sparkles✨",
                msgtype: "m.emote",
            });
        });

        it("allows sending double-slash escaped slash commands correctly", () => {
            const model = new EditorModel([], createPartCreator(), createRenderer());
            const documentOffset = new DocumentOffset(32, true);

            model.update("//dev/null is my favourite place", "insertText", documentOffset);

            const content = createMessageContent(model, undefined, undefined, permalinkCreator);

            expect(content).toEqual({
                body: "/dev/null is my favourite place",
                msgtype: "m.text",
            });
        });
    });

    describe("functions correctly mounted", () => {
        const mockClient = createTestClient();
        jest.spyOn(MatrixClientPeg, "get").mockReturnValue(mockClient);
        const mockRoom = mkStubRoom("myfakeroom", "myfakeroom", mockClient) as any;
        const mockEvent = mkEvent({
            type: "m.room.message",
            room: "myfakeroom",
            user: "myfakeuser",
            content: { msgtype: "m.text", body: "Replying to this" },
            event: true,
        });
        mockRoom.findEventById = jest.fn((eventId) => {
            return eventId === mockEvent.getId() ? mockEvent : null;
        });

        const spyDispatcher = jest.spyOn(defaultDispatcher, "dispatch");

        beforeEach(() => {
            localStorage.clear();
            spyDispatcher.mockReset();
        });

        const defaultProps = {
            room: mockRoom,
            toggleStickerPickerOpen: jest.fn(),
            permalinkCreator: new RoomPermalinkCreator(mockRoom),
        };
        const getRawComponent = (props = {}, roomContext = defaultRoomContext, client = mockClient) => (
            <MatrixClientContext.Provider value={client}>
                <RoomContext.Provider value={roomContext}>
                    <SendMessageComposer {...defaultProps} {...props} />
                </RoomContext.Provider>
            </MatrixClientContext.Provider>
        );
        const getComponent = (props = {}, roomContext = defaultRoomContext, client = mockClient) => {
            return render(getRawComponent(props, roomContext, client));
        };

        it("renders text and placeholder correctly", () => {
            const { container } = getComponent({ placeholder: "placeholder string" });

            expect(container.querySelectorAll('[aria-label="placeholder string"]')).toHaveLength(1);

            addTextToComposer(container, "Test Text");

            expect(container.textContent).toBe("Test Text");
        });

        it("correctly persists state to and from localStorage", () => {
            const props = { replyToEvent: mockEvent };
            const { container, unmount, rerender } = getComponent(props);

            addTextToComposer(container, "Test Text");

            const key = "mx_cider_state_myfakeroom";

            expect(container.textContent).toBe("Test Text");
            expect(localStorage.getItem(key)).toBeNull();

            // ensure the right state was persisted to localStorage
            unmount();
            expect(JSON.parse(localStorage.getItem(key)!)).toStrictEqual({
                parts: [{ type: "plain", text: "Test Text" }],
                replyEventId: mockEvent.getId(),
            });

            // ensure the correct model is re-loaded
            rerender(getRawComponent(props));
            expect(container.textContent).toBe("Test Text");
            expect(spyDispatcher).toHaveBeenCalledWith({
                action: "reply_to_event",
                event: mockEvent,
                context: TimelineRenderingType.Room,
            });

            // now try with localStorage wiped out
            unmount();
            localStorage.removeItem(key);
            rerender(getRawComponent(props));
            expect(container.textContent).toBe("");
        });

        it("persists state correctly without replyToEvent onbeforeunload", () => {
            const { container } = getComponent();

            addTextToComposer(container, "Hello World");

            const key = "mx_cider_state_myfakeroom";

            expect(container.textContent).toBe("Hello World");
            expect(localStorage.getItem(key)).toBeNull();

            // ensure the right state was persisted to localStorage
            window.dispatchEvent(new Event("beforeunload"));
            expect(JSON.parse(localStorage.getItem(key)!)).toStrictEqual({
                parts: [{ type: "plain", text: "Hello World" }],
            });
        });

        it("persists to session history upon sending", async () => {
            mockPlatformPeg({ overrideBrowserShortcuts: jest.fn().mockReturnValue(false) });

            const { container } = getComponent({ replyToEvent: mockEvent });

            addTextToComposer(container, "This is a message");
            fireEvent.keyDown(container.querySelector(".mx_SendMessageComposer")!, { key: "Enter" });

            await waitFor(() => {
                expect(spyDispatcher).toHaveBeenCalledWith({
                    action: "reply_to_event",
                    event: null,
                    context: TimelineRenderingType.Room,
                });
            });

            expect(container.textContent).toBe("");
            const str = sessionStorage.getItem(`mx_cider_history_${mockRoom.roomId}[0]`)!;
            expect(JSON.parse(str)).toStrictEqual({
                parts: [{ type: "plain", text: "This is a message" }],
                replyEventId: mockEvent.getId(),
            });
        });

        it("correctly sends a message", () => {
            mocked(doMaybeLocalRoomAction).mockImplementation(
                <T extends {}>(roomId: string, fn: (actualRoomId: string) => Promise<T>, _client?: MatrixClient) => {
                    return fn(roomId);
                },
            );

            mockPlatformPeg({ overrideBrowserShortcuts: jest.fn().mockReturnValue(false) });
            const { container } = getComponent();

            addTextToComposer(container, "test message");
            fireEvent.keyDown(container.querySelector(".mx_SendMessageComposer")!, { key: "Enter" });

            expect(mockClient.sendMessage).toHaveBeenCalledWith("myfakeroom", null, {
                body: "test message",
                msgtype: MsgType.Text,
            });
        });

        it("shows chat effects on message sending", () => {
            mocked(doMaybeLocalRoomAction).mockImplementation(
                <T extends {}>(roomId: string, fn: (actualRoomId: string) => Promise<T>, _client?: MatrixClient) => {
                    return fn(roomId);
                },
            );

            mockPlatformPeg({ overrideBrowserShortcuts: jest.fn().mockReturnValue(false) });
            const { container } = getComponent();

            addTextToComposer(container, "🎉");
            fireEvent.keyDown(container.querySelector(".mx_SendMessageComposer")!, { key: "Enter" });

            expect(mockClient.sendMessage).toHaveBeenCalledWith("myfakeroom", null, {
                body: "test message",
                msgtype: MsgType.Text,
            });

            expect(dis.dispatch).toHaveBeenCalledWith({ action: `effects.confetti` });
        });

        it("not to send chat effects on message sending for threads", () => {
            mocked(doMaybeLocalRoomAction).mockImplementation(
                <T extends {}>(roomId: string, fn: (actualRoomId: string) => Promise<T>, _client?: MatrixClient) => {
                    return fn(roomId);
                },
            );

            mockPlatformPeg({ overrideBrowserShortcuts: jest.fn().mockReturnValue(false) });
            const { container } = getComponent({
                relation: {
                    rel_type: "m.thread",
                    event_id: "$yolo",
                    is_falling_back: true,
                },
            });

            addTextToComposer(container, "🎉");
            fireEvent.keyDown(container.querySelector(".mx_SendMessageComposer")!, { key: "Enter" });

            expect(mockClient.sendMessage).toHaveBeenCalledWith("myfakeroom", null, {
                body: "test message",
                msgtype: MsgType.Text,
            });

            expect(dis.dispatch).not.toHaveBeenCalledWith({ action: `effects.confetti` });
        });
    });

    describe("isQuickReaction", () => {
        it("correctly detects quick reaction", () => {
            const model = new EditorModel([], createPartCreator(), createRenderer());
            model.update("+😊", "insertText", new DocumentOffset(3, true));

            const isReaction = isQuickReaction(model);

            expect(isReaction).toBeTruthy();
        });

        it("correctly detects quick reaction with space", () => {
            const model = new EditorModel([], createPartCreator(), createRenderer());
            model.update("+ 😊", "insertText", new DocumentOffset(4, true));

            const isReaction = isQuickReaction(model);

            expect(isReaction).toBeTruthy();
        });

        it("correctly rejects quick reaction with extra text", () => {
            const model = new EditorModel([], createPartCreator(), createRenderer());
            const model2 = new EditorModel([], createPartCreator(), createRenderer());
            const model3 = new EditorModel([], createPartCreator(), createRenderer());
            const model4 = new EditorModel([], createPartCreator(), createRenderer());
            model.update("+😊hello", "insertText", new DocumentOffset(8, true));
            model2.update(" +😊", "insertText", new DocumentOffset(4, true));
            model3.update("+ 😊😊", "insertText", new DocumentOffset(6, true));
            model4.update("+smiley", "insertText", new DocumentOffset(7, true));

            expect(isQuickReaction(model)).toBeFalsy();
            expect(isQuickReaction(model2)).toBeFalsy();
            expect(isQuickReaction(model3)).toBeFalsy();
            expect(isQuickReaction(model4)).toBeFalsy();
        });
    });
});
