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

import {
    encodeHtml,
    formatPlainTextLinks,
    getAttributesForMention,
} from "../../../../../../src/components/views/rooms/wysiwyg_composer/hooks/usePlainTextInitialization";
import { mkRoom, stubClient } from "../../../../../test-utils";
import * as mockPermalink from "../../../../../../src/utils/permalinks/Permalinks";
import * as mockAutocomplete from "../../../../../../src/components/views/rooms/wysiwyg_composer/utils/autocomplete";
import { PermalinkParts } from "../../../../../../src/utils/permalinks/PermalinkConstructor";

describe("encodeHtml", () => {
    it("converts markdown links in text to html encoded equivalent", () => {
        const input = "[example](<https://www.markdownlink.com>)";
        const expected = "[example](&lt;https://www.markdownlink.com&gt;)";

        expect(encodeHtml(input)).toBe(expected);
    });
});

describe("formatPlainTextLinks", () => {
    it("returns text unchanged if it contains no links", () => {
        const mockClient = stubClient();
        const mockRoom = mkRoom(mockClient, "test-room-id");

        const input = "plain text containing no links";

        expect(formatPlainTextLinks(input, mockRoom, mockClient)).toBe(input);
    });

    it("replaces regular links with their html encoded equivalents", () => {
        const mockClient = stubClient();
        const mockRoom = mkRoom(mockClient, "test-room-id");

        const input = "[example](<https://www.markdownlink.com>)";
        const expected = "[example](&lt;https://www.markdownlink.com&gt;)";

        expect(formatPlainTextLinks(input, mockRoom, mockClient)).toBe(expected);
    });

    it("replaces at-room mentions with the expected html", () => {
        const mockClient = stubClient();
        const mockRoom = mkRoom(mockClient, "test-room-id");

        const input = "[@room](<https://#>)";

        // check the attributes by parsing the document html instead of checking the string directly
        // so that we are checking the html is also valid
        const mockEditor = document.createElement("div");
        mockEditor.innerHTML = formatPlainTextLinks(input, mockRoom, mockClient);

        const outputAsElement = mockEditor.querySelector("a");
        expect(outputAsElement).toHaveAttribute("data-mention-type", "at-room");
        expect(outputAsElement).toHaveAttribute("contenteditable", "false");
        expect(outputAsElement).toHaveAttribute("href", "#"); // TODO should this be https://#
        expect(outputAsElement).toHaveAttribute("style");
        expect(outputAsElement).toHaveTextContent("@room");
    });

    it("replaces user mentions with the expected html", () => {
        const mockClient = stubClient();
        const mockRoom = mkRoom(mockClient, "test-room-id");

        const displayText = "test user";
        const url = "https://matrix.to/#/@test:user.io";
        const input = `[${displayText}](<${url}>)`;

        // check the attributes by parsing the document html instead of checking the string directly
        // so that we are checking the html is also valid
        const mockEditor = document.createElement("div");
        mockEditor.innerHTML = formatPlainTextLinks(input, mockRoom, mockClient);

        const outputAsElement = mockEditor.querySelector("a");
        expect(outputAsElement).toHaveAttribute("data-mention-type", "user");
        expect(outputAsElement).toHaveAttribute("contenteditable", "false");
        expect(outputAsElement).toHaveAttribute("href", url);
        expect(outputAsElement).toHaveAttribute("style");
        expect(outputAsElement).toHaveTextContent(displayText);
    });

    it("replaces room mentions with the expected html", () => {
        const mockClient = stubClient();
        const mockRoom = mkRoom(mockClient, "test-room-id");

        const displayText = "test user";
        const url = "https://matrix.to/#/#test:room.io";
        const input = `[${displayText}](<${url}>)`;

        // check the attributes by parsing the document html instead of checking the string directly
        // so that we are checking the html is also valid
        const mockEditor = document.createElement("div");
        mockEditor.innerHTML = formatPlainTextLinks(input, mockRoom, mockClient);

        const outputAsElement = mockEditor.querySelector("a");
        expect(outputAsElement).toHaveAttribute("data-mention-type", "room");
        expect(outputAsElement).toHaveAttribute("contenteditable", "false");
        expect(outputAsElement).toHaveAttribute("href", url);
        expect(outputAsElement).toHaveAttribute("style");
        expect(outputAsElement).toHaveTextContent(displayText);
    });
});

describe("getAttributesForMention", () => {
    const mockClient = stubClient();
    const mockRoom = mkRoom(mockClient, "test-room-id");

    it("returns null if room is undefined", () => {
        const url = "https://www.testurl.com";
        const displayText = "displayText";

        expect(getAttributesForMention(url, displayText, undefined, mockClient)).toBeNull();
    });

    it("returns null if client is undefined", () => {
        const url = "https://www.testurl.com";
        const displayText = "displayText";

        expect(getAttributesForMention(url, displayText, mockRoom, undefined)).toBeNull();
    });

    describe("when parsePermalink returns null", () => {
        beforeEach(() => {
            jest.spyOn(mockPermalink, "parsePermalink").mockReturnValue(null);
        });
        afterEach(() => {
            jest.restoreAllMocks();
        });

        it("does not return null for @room special case", () => {
            const url = "https://#";
            const displayText = "@room";

            expect(getAttributesForMention(url, displayText, mockRoom, mockClient)).toEqual({
                "data-mention-type": "at-room",
                "contenteditable": "false",
                "href": "#", // TODO should this be https://#
                "style": "",
            });
        });

        it("returns null for any other case", () => {
            const url = "https://matrix.to/#/@valid:test:io";
            const displayText = "test user";

            expect(getAttributesForMention(url, displayText, mockRoom, mockClient)).toBeNull();
        });
    });

    it("returns null if parsePermalink returns a primaryEntityId starting with anything other than @ or #", () => {
        jest.spyOn(mockPermalink, "parsePermalink").mockReturnValue({
            primaryEntityId: "?unexpected",
        } as unknown as PermalinkParts);

        const url = "https://matrix.to/#/@valid:test:io";
        const displayText = "test user";

        expect(getAttributesForMention(url, displayText, mockRoom, mockClient)).toBeNull();
    });

    describe("when getMentionAttributes returns no attributes", () => {
        beforeEach(() => {
            jest.spyOn(mockAutocomplete, "getMentionAttributes").mockReturnValue({});
        });
        afterEach(() => {
            jest.restoreAllMocks();
        });

        it("returns null for a user", () => {
            const displayText = "test user";
            const url = "https://matrix.to/#/@test:user.io";
            expect(getAttributesForMention(url, displayText, mockRoom, mockClient)).toBeNull();
        });

        it("returns null for a room", () => {
            const displayText = "test room";
            const url = "https://matrix.to/#/#test:room.io";
            expect(getAttributesForMention(url, displayText, mockRoom, mockClient)).toBeNull();
        });
    });

    it("returns the expected attributes for a user mention", () => {
        const displayText = "test user";
        const url = "https://matrix.to/#/@test:user.io";
        expect(getAttributesForMention(url, displayText, mockRoom, mockClient)).toEqual({
            "contenteditable": "false",
            "href": url,
            "data-mention-type": "user",
            "style": expect.any(String),
        });
    });

    it("returns the expected attributes for a room mention", () => {
        const displayText = "test room";
        const url = "https://matrix.to/#/#test:room.io";
        expect(getAttributesForMention(url, displayText, mockRoom, mockClient)).toEqual({
            "contenteditable": "false",
            "href": url,
            "data-mention-type": "room",
            "style": expect.any(String),
        });
    });
});
