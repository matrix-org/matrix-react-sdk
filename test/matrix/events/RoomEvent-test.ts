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

import {RoomEvent} from "../../../src/matrix/events/RoomEvent";
import {MHtml, MText} from "../../../src/matrix/events/schema/text";
import {MMessage} from "../../../src/matrix/events/schema/message";
import {EventType, MsgType} from "matrix-js-sdk/src/@types/event";

describe("RoomEvent", () => {
    describe("pure legacy", () => {
        it("should parse plaintext", () => {
            const ev = {
                type: EventType.RoomMessage,
                content: {
                    msgtype: MsgType.Text,
                    body: "Hello World",
                },
            };
            const re = RoomEvent.fromRaw(ev);
            expect(re).toBeDefined();
            expect(re.textNode).toBeDefined();
            expect(re.textNode.text).toEqual(ev.content.body);
            expect(re.textNode.html).toBeFalsy();
        });
        it("should parse HTML", () => {
            const ev = {
                type: EventType.RoomMessage,
                content: {
                    msgtype: MsgType.Text,
                    body: "Hello World",
                    format: "org.matrix.custom.html",
                    formatted_body: "<b>Hello world</b>",
                },
            };
            const re = RoomEvent.fromRaw(ev);
            expect(re).toBeDefined();
            expect(re.textNode).toBeDefined();
            expect(re.textNode.text).toEqual(ev.content.body);
            expect(re.textNode.html).toEqual(ev.content.formatted_body);
        });
        it("should parse not parse unknown formats as HTML", () => {
            const ev = {
                type: EventType.RoomMessage,
                content: {
                    msgtype: MsgType.Text,
                    body: "Hello World",
                    format: "com.example.not_html",
                    formatted_body: "<b>Hello world</b>",
                },
            };
            const re = RoomEvent.fromRaw(ev);
            expect(re).toBeDefined();
            expect(re.textNode).toBeDefined();
            expect(re.textNode.text).toEqual(ev.content.body);
            expect(re.textNode.html).toBeFalsy();
        });
    });
    describe("hybrid legacy", () => {
        it("should find plaintext", () => {
            const ev = {
                type: EventType.RoomMessage,
                content: {
                    msgtype: MsgType.Text,
                    body: "Hello World",
                    [MText.name]: "This is the real text",
                },
            };
            const re = RoomEvent.fromRaw(ev);
            expect(re).toBeDefined();
            expect(re.textNode).toBeDefined();
            expect(re.textNode.text).toEqual(ev.content[MText.name]);
        });
        it("should parse HTML", () => {
            const ev = {
                type: EventType.RoomMessage,
                content: {
                    msgtype: MsgType.Text,
                    body: "Hello World",
                    format: "org.matrix.custom.html",
                    formatted_body: "<b>Hello world</b>",
                    [MText.name]: "This is the real text",
                    [MHtml.name]: "<p>This is the real text</p>",
                },
            };
            const re = RoomEvent.fromRaw(ev);
            expect(re).toBeDefined();
            expect(re.textNode).toBeDefined();
            expect(re.textNode.text).toEqual(ev.content[MText.name]);
            expect(re.textNode.html).toEqual(ev.content[MHtml.name]);
        });
    });
    describe("m.message", () => {
        // Note: We don't test extensively because we're just seeing if the RoomEvent class is
        // properly handing off to the TextNode class.

        it("should parse plaintext", () => {
            const ev = {
                type: MMessage.name,
                content: {
                    [MMessage.name]: [
                        {mimetype: "text/plain", body: "hello world"},
                    ],
                },
            };
            const re = RoomEvent.fromRaw(ev);
            expect(re).toBeDefined();
            expect(re.textNode).toBeDefined();
            expect(re.textNode.text).toEqual(ev.content[MMessage.name][0].body);
            expect(re.textNode.html).toBeFalsy();
        });

        it("should parse HTML", () => {
            const ev = {
                type: MMessage.name,
                content: {
                    [MMessage.name]: [
                        {mimetype: "text/plain", body: "hello world"},
                        {mimetype: "text/html", body: "<p>hello world</p>"},
                    ],
                },
            };
            const re = RoomEvent.fromRaw(ev);
            expect(re).toBeDefined();
            expect(re.textNode).toBeDefined();
            expect(re.textNode.text).toEqual(ev.content[MMessage.name][0].body);
            expect(re.textNode.html).toEqual(ev.content[MMessage.name][1].body);
        });

        it("should not parse legacy m.room.message fields", () => {
            const ev = {
                type: MMessage.name,
                content: {
                    msgtype: MsgType.Text,
                    body: "WRONG",
                    [MMessage.name]: [
                        {mimetype: "text/plain", body: "hello world"},
                    ],
                },
            };
            const re = RoomEvent.fromRaw(ev);
            expect(re).toBeDefined();
            expect(re.textNode).toBeDefined();
            expect(re.textNode.text).toEqual(ev.content[MMessage.name][0].body);
            expect(re.textNode.html).toBeFalsy();
        });
    });
});
