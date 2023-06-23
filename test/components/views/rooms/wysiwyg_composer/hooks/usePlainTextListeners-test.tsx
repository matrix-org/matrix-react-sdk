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

import { renderHook } from "@testing-library/react-hooks";
import { act } from "@testing-library/react";

import {
    amendInnerHtmlButBetter,
    usePlainTextListeners,
} from "../../../../../../src/components/views/rooms/wysiwyg_composer/hooks/usePlainTextListeners";

describe("setContent", () => {
    it("calling with a string calls the onChange argument", () => {
        const mockOnChange = jest.fn();
        const { result } = renderHook(() => usePlainTextListeners("initialContent", mockOnChange));

        const newContent = "new content";
        act(() => {
            result.current.setContent(newContent);
        });

        expect(mockOnChange).toHaveBeenCalledWith(newContent);
    });

    it("calling with no argument and no editor ref does not call onChange", () => {
        const mockOnChange = jest.fn();
        const { result } = renderHook(() => usePlainTextListeners("initialContent", mockOnChange));

        act(() => {
            result.current.setContent();
        });

        expect(mockOnChange).not.toHaveBeenCalled();
    });

    it("calling with no argument and a valid editor ref calls onChange with the editorRef innerHTML", () => {
        const mockOnChange = jest.fn();

        // create a div to represent the editor and append some content
        const mockEditor = document.createElement("div");
        const mockEditorText = "some text content";
        const textNode = document.createTextNode(mockEditorText);
        mockEditor.appendChild(textNode);

        const { result } = renderHook(() => usePlainTextListeners("initialContent", mockOnChange));

        // @ts-ignore in order to allow us to reassign the ref without complaint
        result.current.ref.current = mockEditor;

        act(() => {
            result.current.setContent();
        });

        expect(mockOnChange).toHaveBeenCalledWith(mockEditor.innerHTML);
    });
});

describe("amendHtmlInABetterWay", () => {
    let mockComposer: HTMLDivElement;
    beforeEach(() => {
        mockComposer = document.createElement("div");
    });

    it("can cope with divs with a line break", () => {
        const innerDiv = document.createElement("div");
        const innerBreak = document.createElement("br");
        innerDiv.appendChild(innerBreak);
        mockComposer.appendChild(innerDiv);

        const expected = "\n";
        expect(amendInnerHtmlButBetter(mockComposer)).toBe(expected);
    });

    it("can cope with divs with text content", () => {
        const innerDiv = document.createElement("div");
        innerDiv.appendChild(document.createTextNode("some text"));
        mockComposer.appendChild(innerDiv);

        const expected = "some text";
        expect(amendInnerHtmlButBetter(mockComposer)).toBe(expected);
    });

    it("can cope with multiple divs with text content", () => {
        const firstInnerDiv = document.createElement("div");
        const secondInnerDiv = document.createElement("div");
        firstInnerDiv.appendChild(document.createTextNode("some text"));
        secondInnerDiv.appendChild(document.createTextNode("some more text"));

        mockComposer.append(firstInnerDiv, secondInnerDiv);

        const expected = "some text\nsome more text";
        expect(amendInnerHtmlButBetter(mockComposer)).toBe(expected);
    });

    it("can cope div following plain text node", () => {
        const firstTextNode = "textnode text";
        const secondDiv = document.createElement("div");
        secondDiv.appendChild(document.createTextNode("some more text"));

        mockComposer.append(firstTextNode, secondDiv);

        const expected = "textnode text\nsome more text";
        expect(amendInnerHtmlButBetter(mockComposer)).toBe(expected);
    });

    it("can cope with multiple adjacent text nodes at top level", () => {
        const strings = ["first string", "second string", "third string"];
        strings.forEach((s) => mockComposer.appendChild(document.createTextNode(s)));

        const expected = strings.join("\n");
        expect(amendInnerHtmlButBetter(mockComposer)).toBe(expected);
    });

    it("can cope with multiple adjacent text nodes in nested div", () => {
        const innerDiv = document.createElement("div");
        const strings = ["first string", "second string", "third string"];
        strings.forEach((s) => innerDiv.appendChild(document.createTextNode(s)));
        mockComposer.appendChild(innerDiv);

        const expected = strings.join("\n");
        expect(amendInnerHtmlButBetter(mockComposer)).toBe(expected);
    });

    it("can cope with a mention at the top level", () => {
        const mention = document.createElement("a");
        mention.appendChild(document.createTextNode("inner text"));
        mention.setAttribute("href", "testHref");
        mention.setAttribute("data-mention-type", "testType");
        mention.setAttribute("style", "testStyle");
        mention.setAttribute("contenteditable", "false");
        mockComposer.appendChild(mention);

        const expected = `<a href="testHref" data-mention-type="testType" style="testStyle" contenteditable="false">inner text</a>`;
        expect(amendInnerHtmlButBetter(mockComposer)).toBe(expected);
    });

    it("can cope with a mention at the top level inline with textnodes", () => {
        const mention = document.createElement("a");
        mention.appendChild(document.createTextNode("inner text"));
        mention.setAttribute("href", "testHref");
        mention.setAttribute("data-mention-type", "testType");
        mention.setAttribute("style", "testStyle");
        mention.setAttribute("contenteditable", "false");

        mockComposer.appendChild(document.createTextNode("preceding "));
        mockComposer.appendChild(mention);
        mockComposer.appendChild(document.createTextNode(" following"));

        const expected = `preceding <a href="testHref" data-mention-type="testType" style="testStyle" contenteditable="false">inner text</a> following`;
        expect(amendInnerHtmlButBetter(mockComposer)).toBe(expected);
    });

    it("can cope with a nested mention", () => {
        const innerDiv = document.createElement("div");
        const mention = document.createElement("a");
        mention.appendChild(document.createTextNode("inner text"));
        mention.setAttribute("href", "testHref");
        mention.setAttribute("data-mention-type", "testType");
        mention.setAttribute("style", "testStyle");
        mention.setAttribute("contenteditable", "false");
        innerDiv.appendChild(mention);
        mockComposer.appendChild(innerDiv);

        const expected = `<a href="testHref" data-mention-type="testType" style="testStyle" contenteditable="false">inner text</a>`;
        expect(amendInnerHtmlButBetter(mockComposer)).toBe(expected);
    });

    it("can cope with a nested mention with nested text nodes", () => {
        const innerDiv = document.createElement("div");
        const mention = document.createElement("a");
        mention.appendChild(document.createTextNode("inner text"));
        mention.setAttribute("href", "testHref");
        mention.setAttribute("data-mention-type", "testType");
        mention.setAttribute("style", "testStyle");
        mention.setAttribute("contenteditable", "false");

        innerDiv.appendChild(document.createTextNode("preceding "));
        innerDiv.appendChild(mention);
        innerDiv.appendChild(document.createTextNode(" following"));
        mockComposer.appendChild(innerDiv);

        const expected = `preceding <a href="testHref" data-mention-type="testType" style="testStyle" contenteditable="false">inner text</a> following`;
        expect(amendInnerHtmlButBetter(mockComposer)).toBe(expected);
    });

    it("can cope with a nested mention next to top level text nodes", () => {
        const innerDiv = document.createElement("div");
        const mention = document.createElement("a");
        mention.appendChild(document.createTextNode("inner text"));
        mention.setAttribute("href", "testHref");
        mention.setAttribute("data-mention-type", "testType");
        mention.setAttribute("style", "testStyle");
        mention.setAttribute("contenteditable", "false");

        mockComposer.appendChild(document.createTextNode("preceding"));
        innerDiv.appendChild(mention);
        mockComposer.appendChild(innerDiv);
        mockComposer.appendChild(document.createTextNode("following"));

        const expected = `preceding\n<a href="testHref" data-mention-type="testType" style="testStyle" contenteditable="false">inner text</a>\nfollowing`;
        expect(amendInnerHtmlButBetter(mockComposer)).toBe(expected);
    });

    it("can cope with adjacent top level mentions", () => {
        ["1", "2", "3"].forEach((id) => {
            const mention = document.createElement("a");
            mention.appendChild(document.createTextNode("inner text" + id));
            mention.setAttribute("href", "testHref" + id);
            mention.setAttribute("data-mention-type", "testType" + id);
            mention.setAttribute("style", "testStyle" + id);
            mention.setAttribute("contenteditable", "false");

            mockComposer.appendChild(mention);
        });

        const expected = `<a href="testHref1" data-mention-type="testType1" style="testStyle1" contenteditable="false">inner text1</a><a href="testHref2" data-mention-type="testType2" style="testStyle2" contenteditable="false">inner text2</a><a href="testHref3" data-mention-type="testType3" style="testStyle3" contenteditable="false">inner text3</a>`;
        expect(amendInnerHtmlButBetter(mockComposer)).toBe(expected);
    });

    it("can cope with adjacent nested mentions", () => {
        ["1", "2", "3"].forEach((id) => {
            const mention = document.createElement("a");
            mention.appendChild(document.createTextNode("inner text" + id));
            mention.setAttribute("href", "testHref" + id);
            mention.setAttribute("data-mention-type", "testType" + id);
            mention.setAttribute("style", "testStyle" + id);
            mention.setAttribute("contenteditable", "false");

            if (id === "2") {
                const innerDiv = document.createElement("div");
                innerDiv.appendChild(mention);
                mockComposer.appendChild(innerDiv);
            } else {
                mockComposer.appendChild(mention);
            }
        });

        const expected = `<a href="testHref1" data-mention-type="testType1" style="testStyle1" contenteditable="false">inner text1</a>\n<a href="testHref2" data-mention-type="testType2" style="testStyle2" contenteditable="false">inner text2</a>\n<a href="testHref3" data-mention-type="testType3" style="testStyle3" contenteditable="false">inner text3</a>`;
        expect(amendInnerHtmlButBetter(mockComposer)).toBe(expected);
    });
});
