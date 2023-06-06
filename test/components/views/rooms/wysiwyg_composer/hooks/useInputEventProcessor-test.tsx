/*
Copyright 2023 The Matrix.org Foundation C.I.C.

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
import { IEventRelation } from "matrix-js-sdk/src/matrix";
import { waitFor } from "@testing-library/react";

import { handleClipboardEvent } from "../../../../../../src/components/views/rooms/wysiwyg_composer/hooks/useInputEventProcessor";
import { TimelineRenderingType } from "../../../../../../src/contexts/RoomContext";
import { Layout } from "../../../../../../src/settings/enums/Layout";
import { mkStubRoom, stubClient } from "../../../../../test-utils";
import ContentMessages from "../../../../../../src/ContentMessages";

describe("handleClipboardEvent", () => {
    const mockClient = stubClient();
    const mockRoom = mkStubRoom("mock room", "mock room", mockClient);
    const mockRoomState = {
        room: mockRoom,
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
        showTopUnreadMessagesBar: false,
        statusBarVisible: false,
        canReact: false,
        canSelfRedact: false,
        canSendMessages: false,
        resizing: false,
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
        showUrlPreview: false,
        timelineRenderingType: TimelineRenderingType.Room,
        threadId: undefined,
        liveTimeline: undefined,
        narrow: false,
        activeCall: null,
        msc3946ProcessDynamicPredecessor: false,
    };

    const sendContentListToRoomSpy = jest.spyOn(ContentMessages.sharedInstance(), "sendContentListToRoom");
    const sendContentToRoomSpy = jest.spyOn(ContentMessages.sharedInstance(), "sendContentToRoom");
    const fetchSpy = jest.spyOn(window, "fetch");
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    it("returns false if it is not a paste event", () => {
        const originalEvent = { type: "copy" } as ClipboardEvent;
        const input = [originalEvent, mockRoomState, mockClient] as const;
        const output = handleClipboardEvent(...input);
        expect(output).toBe(false);
    });

    it("returns false if clipboard data is null", () => {
        const originalEvent = { type: "paste", clipboardData: null } as ClipboardEvent;
        const input = [originalEvent, mockRoomState, mockClient] as const;
        const output = handleClipboardEvent(...input);
        expect(output).toBe(false);
    });

    it("returns false if room is undefined", () => {
        const originalEvent = { type: "paste" } as ClipboardEvent;
        const { room, ...roomStateWithoutRoom } = mockRoomState;
        const input = [originalEvent, roomStateWithoutRoom, mockClient] as const;
        const output = handleClipboardEvent(...input);
        expect(output).toBe(false);
    });

    it("handles event and calls sendContentListToRoom when data files are present", () => {
        const originalEvent = {
            type: "paste",
            clipboardData: { files: ["something here"], types: [] },
        } as unknown as ClipboardEvent;
        const input = [originalEvent, mockRoomState, mockClient] as const;
        const output = handleClipboardEvent(...input);

        expect(sendContentListToRoomSpy).toHaveBeenCalledTimes(1);
        expect(sendContentListToRoomSpy).toHaveBeenCalledWith(
            originalEvent.clipboardData?.files,
            mockRoom.roomId,
            undefined, // this is the event relation, an optional arg
            mockClient,
            mockRoomState.timelineRenderingType,
        );
        expect(output).toBe(true);
    });

    it("calls sendContentListToRoom with eventRelation when present", () => {
        const originalEvent = {
            type: "paste",
            clipboardData: { files: ["something here"], types: [] },
        } as unknown as ClipboardEvent;
        const mockEventRelation = {} as unknown as IEventRelation;
        const input = [originalEvent, mockRoomState, mockClient, mockEventRelation] as const;
        const output = handleClipboardEvent(...input);

        expect(sendContentListToRoomSpy).toHaveBeenCalledTimes(1);
        expect(sendContentListToRoomSpy).toHaveBeenCalledWith(
            originalEvent.clipboardData?.files,
            mockRoom.roomId,
            mockEventRelation, // this is the event relation, an optional arg
            mockClient,
            mockRoomState.timelineRenderingType,
        );
        expect(output).toBe(true);
    });

    it("calls the error handler when sentContentListToRoom errors", async () => {
        const mockErrorMessage = "something went wrong";
        sendContentListToRoomSpy.mockRejectedValueOnce(new Error(mockErrorMessage));

        const originalEvent = {
            type: "paste",
            clipboardData: { files: ["something here"], types: [] },
        } as unknown as ClipboardEvent;
        const mockEventRelation = {} as unknown as IEventRelation;
        const input = [originalEvent, mockRoomState, mockClient, mockEventRelation] as const;
        const output = handleClipboardEvent(...input);

        expect(sendContentListToRoomSpy).toHaveBeenCalledTimes(1);
        await waitFor(() => {
            expect(logSpy).toHaveBeenCalledWith(mockErrorMessage);
        });
        expect(output).toBe(true);
    });

    it("calls the error handler when data types has text/html but data can not be parsed", () => {
        const originalEvent = {
            type: "paste",
            clipboardData: {
                files: [],
                types: ["text/html"],
                getData: jest.fn().mockReturnValue("<div>invalid html"),
            },
        } as unknown as ClipboardEvent;
        const mockEventRelation = {} as unknown as IEventRelation;
        const input = [originalEvent, mockRoomState, mockClient, mockEventRelation] as const;
        const output = handleClipboardEvent(...input);

        expect(logSpy).toHaveBeenCalledWith("Failed to handle pasted content as Safari inserted content");
        expect(output).toBe(false);
    });

    it("calls fetch when data types has text/html and data can parsed", () => {
        const originalEvent = {
            type: "paste",
            clipboardData: {
                files: [],
                types: ["text/html"],
                getData: jest.fn().mockReturnValue(`<img src="blob:" />`),
            },
        } as unknown as ClipboardEvent;
        const mockEventRelation = {} as unknown as IEventRelation;
        const input = [originalEvent, mockRoomState, mockClient, mockEventRelation] as const;
        handleClipboardEvent(...input);

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(fetchSpy).toHaveBeenCalledWith("blob:");
    });

    it("calls sendContentToRoom when parsing is successful", async () => {
        fetchSpy.mockResolvedValueOnce({
            url: "test/file",
            blob: () => {
                return Promise.resolve({ type: "image/jpeg" } as Blob);
            },
        } as Response);

        const originalEvent = {
            type: "paste",
            clipboardData: {
                files: [],
                types: ["text/html"],
                getData: jest.fn().mockReturnValue(`<img src="blob:" />`),
            },
        } as unknown as ClipboardEvent;
        const mockEventRelation = {} as unknown as IEventRelation;
        const input = [originalEvent, mockRoomState, mockClient, mockEventRelation] as const;
        const output = handleClipboardEvent(...input);

        await waitFor(() => {
            expect(sendContentToRoomSpy).toHaveBeenCalledTimes(1);
        });
        expect(output).toBe(true);
    });
});
