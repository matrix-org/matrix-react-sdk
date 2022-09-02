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
import { act } from "react-dom/test-utils";
import { sleep } from "matrix-js-sdk/src/utils";
import { ISendEventResponse, MatrixClient, MsgType } from "matrix-js-sdk/src/matrix";
// eslint-disable-next-line deprecate/import
import { mount } from 'enzyme';
import { mocked } from "jest-mock";

import SendMessageComposer, {
    createMessageContent,
    isQuickReaction,
    SendMessageComposer as SendMessageComposerClass,
} from "../../../../src/components/views/rooms/SendMessageComposer";
import MatrixClientContext from "../../../../src/contexts/MatrixClientContext";
import RoomContext, { TimelineRenderingType } from "../../../../src/contexts/RoomContext";
import EditorModel from "../../../../src/editor/model";
import { createPartCreator, createRenderer } from "../../../editor/mock";
import { createTestClient, mkEvent, mkStubRoom } from "../../../test-utils";
import { MatrixClientPeg } from "../../../../src/MatrixClientPeg";
import defaultDispatcher from "../../../../src/dispatcher/dispatcher";
import DocumentOffset from '../../../../src/editor/offset';
import { Layout } from '../../../../src/settings/enums/Layout';
import { IRoomState } from "../../../../src/components/structures/RoomView";
import { RoomPermalinkCreator } from "../../../../src/utils/permalinks/Permalinks";
import { mockPlatformPeg } from "../../../test-utils/platform";
import { doMaybeLocalRoomAction } from "../../../../src/utils/local-room";

jest.mock("../../../../src/utils/local-room", () => ({
    doMaybeLocalRoomAction: jest.fn(),
}));

const WrapWithProviders: React.FC<{
    roomContext: IRoomState;
    client: MatrixClient;
}> = ({ children, roomContext, client }) => <MatrixClientContext.Provider value={client}>
    <RoomContext.Provider value={roomContext}>
        { children }
    </RoomContext.Provider>
</MatrixClientContext.Provider>;

describe('<SendMessageComposer/>', () => {
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
    };
    describe("createMessageContent", () => {
        const permalinkCreator = jest.fn() as any;

        it("sends plaintext messages correctly", () => {
            const model = new EditorModel([], createPartCreator(), createRenderer());
            const documentOffset = new DocumentOffset(11, true);
            model.update("hello world", "insertText", documentOffset);

            const content = createMessageContent(model, null, undefined, permalinkCreator);

            expect(content).toEqual({
                body: "hello world",
                msgtype: "m.text",
            });
        });

        it("sends markdown messages correctly", () => {
            const model = new EditorModel([], createPartCreator(), createRenderer());
            const documentOffset = new DocumentOffset(13, true);
            model.update("hello *world*", "insertText", documentOffset);

            const content = createMessageContent(model, null, undefined, permalinkCreator);

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

            const content = createMessageContent(model, null, undefined, permalinkCreator);

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

            const content = createMessageContent(model, null, undefined, permalinkCreator);

            expect(content).toEqual({
                body: "✨sparkles✨",
                msgtype: "m.emote",
            });
        });

        it("allows sending double-slash escaped slash commands correctly", () => {
            const model = new EditorModel([], createPartCreator(), createRenderer());
            const documentOffset = new DocumentOffset(32, true);

            model.update("//dev/null is my favourite place", "insertText", documentOffset);

            const content = createMessageContent(model, null, undefined, permalinkCreator);

            expect(content).toEqual({
                body: "/dev/null is my favourite place",
                msgtype: "m.text",
            });
        });
    });

    describe("functions correctly mounted", () => {
        const mockClient = createTestClient();
        jest.spyOn(MatrixClientPeg, 'get').mockReturnValue(mockClient);
        const mockRoom = mkStubRoom('myfakeroom', 'myfakeroom', mockClient) as any;
        const mockEvent = mkEvent({
            type: "m.room.message",
            room: 'myfakeroom',
            user: 'myfakeuser',
            content: { "msgtype": "m.text", "body": "Replying to this" },
            event: true,
        });
        mockRoom.findEventById = jest.fn(eventId => {
            return eventId === mockEvent.getId() ? mockEvent : null;
        });

        const spyDispatcher = jest.spyOn(defaultDispatcher, "dispatch");

        beforeEach(() => {
            localStorage.clear();
            spyDispatcher.mockReset();
        });

        const addTextToComposer = (wrapper, text) => act(() => {
            // couldn't get input event on contenteditable to work
            // paste works without illegal private method access
            const pasteEvent = {
                clipboardData: {
                    types: [],
                    files: [],
                    getData: type => type === "text/plain" ? text : undefined,
                },
            };
            wrapper.find('[role="textbox"]').simulate('paste', pasteEvent);
            wrapper.update();
        });

        const defaultProps = {
            room: mockRoom,
            toggleStickerPickerOpen: jest.fn(),
            permalinkCreator: new RoomPermalinkCreator(mockRoom),
        };
        const getComponent = (props = {}, roomContext = defaultRoomContext, client = mockClient) => {
            return mount(<SendMessageComposer {...defaultProps} {...props} />, {
                wrappingComponent: WrapWithProviders,
                wrappingComponentProps: { roomContext, client },
            });
        };

        it("renders text and placeholder correctly", () => {
            const wrapper = getComponent({ placeholder: "placeholder string" });

            expect(wrapper.find('[aria-label="placeholder string"]')).toHaveLength(1);

            addTextToComposer(wrapper, "Test Text");

            expect(wrapper.text()).toBe("Test Text");
        });

        it("correctly persists state to and from localStorage", () => {
            const wrapper = getComponent({ replyToEvent: mockEvent });

            addTextToComposer(wrapper, "Test Text");

            // @ts-ignore
            const key = wrapper.find(SendMessageComposerClass).instance().editorStateKey;

            expect(wrapper.text()).toBe("Test Text");
            expect(localStorage.getItem(key)).toBeNull();

            // ensure the right state was persisted to localStorage
            wrapper.unmount();
            expect(JSON.parse(localStorage.getItem(key))).toStrictEqual({
                parts: [{ "type": "plain", "text": "Test Text" }],
                replyEventId: mockEvent.getId(),
            });

            // ensure the correct model is re-loaded
            wrapper.mount();
            expect(wrapper.text()).toBe("Test Text");
            expect(spyDispatcher).toHaveBeenCalledWith({
                action: "reply_to_event",
                event: mockEvent,
                context: TimelineRenderingType.Room,
            });

            // now try with localStorage wiped out
            wrapper.unmount();
            localStorage.removeItem(key);
            wrapper.mount();
            expect(wrapper.text()).toBe("");
        });

        it("persists state correctly without replyToEvent onbeforeunload", () => {
            const wrapper = getComponent();

            addTextToComposer(wrapper, "Hello World");

            // @ts-ignore
            const key = wrapper.find(SendMessageComposerClass).instance().editorStateKey;

            expect(wrapper.text()).toBe("Hello World");
            expect(localStorage.getItem(key)).toBeNull();

            // ensure the right state was persisted to localStorage
            window.dispatchEvent(new Event('beforeunload'));
            expect(JSON.parse(localStorage.getItem(key))).toStrictEqual({
                parts: [{ "type": "plain", "text": "Hello World" }],
            });
        });

        it("persists to session history upon sending", async () => {
            mockPlatformPeg({ overrideBrowserShortcuts: jest.fn().mockReturnValue(false) });

            const wrapper = getComponent({ replyToEvent: mockEvent });

            addTextToComposer(wrapper, "This is a message");
            act(() => {
                wrapper.find(".mx_SendMessageComposer").simulate("keydown", { key: "Enter" });
                wrapper.update();
            });
            await sleep(10); // await the async _sendMessage
            wrapper.update();
            expect(spyDispatcher).toHaveBeenCalledWith({
                action: "reply_to_event",
                event: null,
                context: TimelineRenderingType.Room,
            });

            expect(wrapper.text()).toBe("");
            const str = sessionStorage.getItem(`mx_cider_history_${mockRoom.roomId}[0]`);
            expect(JSON.parse(str)).toStrictEqual({
                parts: [{ "type": "plain", "text": "This is a message" }],
                replyEventId: mockEvent.getId(),
            });
        });

        it('correctly sets the editorStateKey for threads', () => {
            const relation = {
                rel_type: "m.thread",
                event_id: "myFakeThreadId",
            };
            const includeReplyLegacyFallback = false;
            const wrapper = getComponent({ relation, includeReplyLegacyFallback });
            const instance = wrapper.find(SendMessageComposerClass).instance();
            // @ts-ignore
            const key = instance.editorStateKey;
            expect(key).toEqual('mx_cider_state_myfakeroom_myFakeThreadId');
        });

        it("correctly sends a message", () => {
            mocked(doMaybeLocalRoomAction).mockImplementation((
                roomId: string,
                fn: (actualRoomId: string) => Promise<ISendEventResponse>,
                _client?: MatrixClient,
            ) => {
                return fn(roomId);
            });

            mockPlatformPeg({ overrideBrowserShortcuts: jest.fn().mockReturnValue(false) });
            const wrapper = getComponent();

            addTextToComposer(wrapper, "test message");
            act(() => {
                wrapper.find(".mx_SendMessageComposer").simulate("keydown", { key: "Enter" });
                wrapper.update();
            });

            expect(mockClient.sendMessage).toHaveBeenCalledWith(
                "myfakeroom",
                null,
                {
                    "body": "test message",
                    "msgtype": MsgType.Text,
                },
            );
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

