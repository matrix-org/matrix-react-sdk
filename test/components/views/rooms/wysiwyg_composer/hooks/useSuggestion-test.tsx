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
    processSelectionChange,
} from "../../../../../../src/components/views/rooms/wysiwyg_composer/hooks/useSuggestion";
import { text } from "stream/consumers";

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
    it("does not change parent hook state if suggestion or editor ref is null", () => {
        // create a div and append a text node to it with some initial text
        const editorDiv = document.createElement("div");
        const initialText = "text";
        const textNode = document.createTextNode(initialText);
        editorDiv.appendChild(textNode);

        // create a mockSuggestion using the text node above
        const mockSuggestion = createMockPlainTextSuggestionPattern({ node: textNode });
        const mockSetSuggestion = jest.fn();
        const mockSetText = jest.fn();

        // call the function with a null editorRef.current value
        processCommand(
            "should not be seen",
            { current: null } as React.RefObject<HTMLDivElement>,
            mockSuggestion,
            mockSetSuggestion,
            mockSetText,
        );

        // check that the parent state setter has not been called
        expect(mockSetText).not.toHaveBeenCalled();

        // call the function with a valid editorRef.current, but a null suggestion
        processCommand(
            "should not be seen",
            { current: editorDiv } as React.RefObject<HTMLDivElement>,
            null,
            mockSetSuggestion,
            mockSetText,
        );

        // check that the parent state setter has not been called
        expect(mockSetText).not.toHaveBeenCalled();
    });

    it("can change the parent hook state when required", () => {
        // create a div and append a text node to it with some initial text
        const editorDiv = document.createElement("div");
        const initialText = "text";
        const textNode = document.createTextNode(initialText);
        editorDiv.appendChild(textNode);

        // create a mockSuggestion using the text node above
        const mockSuggestion = createMockPlainTextSuggestionPattern({ node: textNode });
        const mockSetSuggestion = jest.fn();
        const mockSetText = jest.fn();
        const replacementText = "/replacement text";

        processCommand(
            replacementText,
            { current: editorDiv } as React.RefObject<HTMLDivElement>,
            mockSuggestion,
            mockSetSuggestion,
            mockSetText,
        );

        // check that the text has changed and includes a trailing space
        expect(mockSetText).toHaveBeenCalledWith(`${replacementText} `);
    });
});

describe.only("processSelectionChange", () => {
    it("returns early if current editorRef is null", () => {
        const mockEditorRef = { current: null } as React.RefObject<HTMLDivElement>;
        const getSelectionSpy = jest.spyOn(document, "getSelection");
        processSelectionChange(mockEditorRef, null, jest.fn());
        expect(getSelectionSpy).not.toHaveBeenCalled();
    });

    it("does not call setSuggestion if selection is not a cursor", () => {
        const mockEditor = document.createElement("div");
        const textContent = document.createTextNode("content");
        mockEditor.appendChild(textContent);
        const mockSetSuggestion = jest.fn();
        const mockEditorRef = { current: mockEditor } as React.RefObject<HTMLDivElement>;

        document.getSelection()?.setBaseAndExtent(textContent, 0, textContent, 4);

        processSelectionChange(mockEditorRef, createMockPlainTextSuggestionPattern(), mockSetSuggestion);

        expect(mockSetSuggestion).not.toHaveBeenCalled();
    });

    it("does not call setSuggestion if selection cursor is not inside a text node", () => {
        const mockEditor = document.createElement("div");
        const textContent = document.createTextNode("content");
        mockEditor.appendChild(textContent);
        const mockSetSuggestion = jest.fn();
        const mockEditorRef = { current: mockEditor } as React.RefObject<HTMLDivElement>;

        document.getSelection()?.setBaseAndExtent(mockEditor, 0, mockEditor, 0);

        processSelectionChange(mockEditorRef, createMockPlainTextSuggestionPattern(), mockSetSuggestion);

        expect(mockSetSuggestion).not.toHaveBeenCalled();
    });

    it("calls setSuggestion with null if we have an existing suggestion but no command match", () => {
        const mockEditor = document.createElement("div");
        const textNode = document.createTextNode("this will not match");
        mockEditor.appendChild(textNode);
        document.body.appendChild(mockEditor);
        const mockSetSuggestion = jest.fn();
        const mockEditorRef = { current: mockEditor } as React.RefObject<HTMLDivElement>;

        document.getSelection()?.setBaseAndExtent(textNode, 0, textNode, 0);

        processSelectionChange(mockEditorRef, createMockPlainTextSuggestionPattern(), mockSetSuggestion);

        expect(mockSetSuggestion).toHaveBeenCalledWith(null);
    });

    it("calls setSuggestion with the expected arguments when text node is valid command", () => {
        const mockEditor = document.createElement("div");
        const textNode = document.createTextNode("/potentialCommand");
        mockEditor.appendChild(textNode);
        document.body.appendChild(mockEditor);
        const mockSetSuggestion = jest.fn();
        const mockEditorRef = { current: mockEditor } as React.RefObject<HTMLDivElement>;

        document.getSelection()?.setBaseAndExtent(textNode, 3, textNode, 3);

        processSelectionChange(mockEditorRef, null, mockSetSuggestion);

        expect(mockSetSuggestion).toHaveBeenCalledWith({
            keyChar: "/",
            type: "command",
            text: "potentialCommand",
            node: textNode,
            startOffset: 0,
            endOffset: 17,
        });
    });
});
