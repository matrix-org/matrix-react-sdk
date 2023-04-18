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
import React from "react";
import { MappedSuggestion } from "@matrix-org/matrix-wysiwyg";

import {
    PlainTextSuggestionPattern,
    mapSuggestion,
    processCommand,
} from "../../../../../../src/components/views/rooms/wysiwyg_composer/hooks/useSuggestion";

const createMockPlainTextSuggestionPattern = (
    props: Partial<PlainTextSuggestionPattern> = {},
): PlainTextSuggestionPattern => {
    return {
        keyChar: "/",
        type: "command",
        text: "some text",
        node: document.createTextNode(""),
        startOffset: 0,
        endOffset: 0,
        ...props,
    };
};
describe("mapSuggestion", () => {
    it("returns null if called with a null argument", () => {
        expect(mapSuggestion(null)).toBeNull();
    });

    it("returns a mapped suggestion when passed a suggestion", () => {
        const input = createMockPlainTextSuggestionPattern();

        const expected: MappedSuggestion = {
            keyChar: "/",
            type: "command",
            text: "some text",
        };

        const output = mapSuggestion(input);

        expect(output).toEqual(expected);
    });
});

describe("processCommand", () => {
    it("does not change suggestion node text content if suggestion or editor ref is null", () => {
        // create a div and append a text node to it with some initial text
        const editorDiv = document.createElement("div");
        const initialText = "text";
        const textNode = document.createTextNode(initialText);
        editorDiv.appendChild(textNode);

        // create a mockSuggestion using the text node above
        const mockSuggestion = createMockPlainTextSuggestionPattern({ node: textNode });
        const mockSetSuggestion = jest.fn();

        // call the function with a null editorRef.current value
        processCommand(
            "should not be seen",
            { current: null } as React.RefObject<HTMLDivElement>,
            mockSuggestion,
            mockSetSuggestion,
        );

        // check that the text has not changed
        expect(textNode.textContent).toBe(initialText);

        // call the function with a valid editorRef.current, but a null suggestion
        processCommand(
            "should not be seen",
            { current: editorDiv } as React.RefObject<HTMLDivElement>,
            null,
            mockSetSuggestion,
        );

        // check that the text has not changed
        expect(textNode.textContent).toBe(initialText);
    });

    it("can change the text content of the suggestion node", () => {
        // create a div and append a text node to it with some initial text
        const editorDiv = document.createElement("div");
        const initialText = "text";
        const textNode = document.createTextNode(initialText);
        editorDiv.appendChild(textNode);

        // create a mockSuggestion using the text node above
        const mockSuggestion = createMockPlainTextSuggestionPattern({ node: textNode });
        const mockSetSuggestion = jest.fn();
        const replacementText = "/replacement text";

        processCommand(
            replacementText,
            { current: editorDiv } as React.RefObject<HTMLDivElement>,
            mockSuggestion,
            mockSetSuggestion,
        );

        // check that the text has changed and includes a trailing space
        expect(textNode.textContent).toBe(`${replacementText} `);
    });
});
