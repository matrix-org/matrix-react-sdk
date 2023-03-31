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

import { ICompletion } from "../../../../../../src/autocomplete/Autocompleter";
import {
    buildQuery,
    getRoomFromCompletion,
    getMentionDisplayText,
    getMentionAttributes,
} from "../../../../../../src/components/views/rooms/wysiwyg_composer/utils/autocomplete";
import { createTestClient, mkRoom } from "../../../../../test-utils";

const mockClient = createTestClient();
const mockRoomId = "mockRoomId";
const mockRoom = mkRoom(mockClient, mockRoomId);

const createMockCompletion = (props: Partial<ICompletion>): ICompletion => {
    return {
        completion: "mock",
        range: { beginning: true, start: 0, end: 0 },
        ...props,
    };
};

beforeEach(() => jest.clearAllMocks());
afterAll(() => jest.restoreAllMocks());

describe("buildQuery", () => {
    it("returns an empty string for a falsy argument", () => {
        expect(buildQuery(null)).toBe("");
    });

    it("returns an empty string when keyChar is falsy", () => {
        const noKeyCharSuggestion = { keyChar: "" as const, text: "test", type: "unknown" as const };
        expect(buildQuery(noKeyCharSuggestion)).toBe("");
    });

    it("returns an empty string when suggestion is a command", () => {
        // TODO alter this test when commands are implemented
        const commandSuggestion = { keyChar: "/" as const, text: "slash", type: "command" as const };
        expect(buildQuery(commandSuggestion)).toBe("");
    });

    it("combines the keyChar and text of the suggestion in the query", () => {
        const handledSuggestion = { keyChar: "@" as const, text: "alice", type: "mention" as const };
        expect(buildQuery(handledSuggestion)).toBe("@alice");
    });
});

describe("getRoomFromCompletion", () => {
    const createMockRoomCompletion = (props: Partial<ICompletion>): ICompletion => {
        return createMockCompletion({ ...props, type: "room" });
    };

    it("calls getRoom with completionId if present in the completion", () => {
        const testId = "arbitraryId";
        const completionWithId = createMockRoomCompletion({ completionId: testId });

        getRoomFromCompletion(completionWithId, mockClient);

        expect(mockClient.getRoom).toHaveBeenCalledWith(testId);
    });

    it("calls getRoom with completion if present and correct format", () => {
        const testCompletion = "arbitraryCompletion";
        const completionWithId = createMockRoomCompletion({ completionId: testCompletion });

        getRoomFromCompletion(completionWithId, mockClient);

        expect(mockClient.getRoom).toHaveBeenCalledWith(testCompletion);
    });

    it("calls getRooms if no completionId is present and completion starts with #", () => {
        const completionWithId = createMockRoomCompletion({ completion: "#hash" });

        const result = getRoomFromCompletion(completionWithId, mockClient);

        expect(mockClient.getRoom).not.toHaveBeenCalled();
        expect(mockClient.getRooms).toHaveBeenCalled();

        // in this case, because the mock client returns an empty array of rooms
        // from the call to get rooms, we'd expect the result to be null
        expect(result).toBe(null);
    });
});

describe("getMentionDisplayText", () => {
    it("returns an empty string if we are not handling a user or a room type", () => {
        const nonHandledCompletionTypes = ["at-room", "community", "command"] as const;
        const nonHandledCompletions = nonHandledCompletionTypes.map((type) => createMockCompletion({ type }));

        nonHandledCompletions.forEach((completion) => {
            expect(getMentionDisplayText(completion, mockClient)).toBe("");
        });
    });

    it("returns the completion if we are handling a user", () => {
        const testCompletion = "display this";
        const userCompletion = createMockCompletion({ type: "user", completion: testCompletion });

        expect(getMentionDisplayText(userCompletion, mockClient)).toBe(testCompletion);
    });

    it("returns the room name when the room has a valid completionId", () => {
        const testCompletionId = "testId";
        const userCompletion = createMockCompletion({ type: "room", completionId: testCompletionId });

        // as this uses the mockClient, the name will be the mock room name returned from there
        expect(getMentionDisplayText(userCompletion, mockClient)).toBe(mockClient.getRoom("")?.name);
    });

    it("falls back to the completion for a room if completion starts with #", () => {
        const testCompletion = "#hash";
        const userCompletion = createMockCompletion({ type: "room", completion: testCompletion });

        // as this uses the mockClient, the name will be the mock room name returned from there
        expect(getMentionDisplayText(userCompletion, mockClient)).toBe(testCompletion);
    });
});

describe("getMentionAttributes", () => {
    it("returns an empty object for completion types other than room or user", () => {
        const nonHandledCompletionTypes = ["at-room", "community", "command"] as const;
        const nonHandledCompletions = nonHandledCompletionTypes.map((type) => createMockCompletion({ type }));

        nonHandledCompletions.forEach((completion) => {
            expect(getMentionAttributes(completion, mockClient, mockRoom)).toEqual({});
        });
    });
});
