/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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

import {MMessage} from "../../../../src/matrix/events/schema/message";
import {MHtml, MText} from "../../../../src/matrix/events/schema/text";
import {TextNode} from "../../../../src/matrix/events/nodes/TextNode";

describe("TextNode", () => {
    it("should parse plaintext from m.text", () => {
        const content = {
            [MText.name]: "This is the real text",
        };
        const node = TextNode.fromContent(content);
        expect(node).toBeDefined();
        expect(node.text).toEqual(content[MText.name]);
        expect(node.html).toBeFalsy();
    });
    it("should parse plaintext from m.message", () => {
        const content = {
            [MMessage.name]: [
                {mimetype: "text/plain", body: "hello world"},
            ],
        };
        const node = TextNode.fromContent(content);
        expect(node).toBeDefined();
        expect(node.text).toEqual(content[MMessage.name][0].body);
        expect(node.html).toBeFalsy();
    });
    it("should parse plaintext from m.message without mimetypes", () => {
        const content = {
            [MMessage.name]: [
                {body: "hello world"},
            ],
        };
        const node = TextNode.fromContent(content);
        expect(node).toBeDefined();
        expect(node.text).toEqual(content[MMessage.name][0].body);
        expect(node.html).toBeFalsy();
    });
    it("should parse plaintext from m.message from available options", () => {
        const content = {
            [MMessage.name]: [
                {mimetype: "text/plain", body: "hello world"},
                {mimetype: "text/not-plain", body: "WRONG"},
            ],
        };
        const node = TextNode.fromContent(content);
        expect(node).toBeDefined();
        expect(node.text).toEqual(content[MMessage.name][0].body);
        expect(node.html).toBeFalsy();
    });
    it("should parse HTML from m.html", () => {
        const content = {
            [MText.name]: "This is the real text",
            [MHtml.name]: "<p>This is HTML</p>",
        };
        const node = TextNode.fromContent(content);
        expect(node).toBeDefined();
        expect(node.text).toEqual(content[MText.name]);
        expect(node.html).toEqual(content[MHtml.name]);
    });
    it("should parse HTML from m.message", () => {
        const content = {
            [MMessage.name]: [
                {mimetype: "text/plain", body: "hello world"},
                {mimetype: "text/html", body: "<p>Hello World</p>"},
            ],
        };
        const node = TextNode.fromContent(content);
        expect(node).toBeDefined();
        expect(node.text).toEqual(content[MMessage.name][0].body);
        expect(node.html).toEqual(content[MMessage.name][1].body);
    });
});
