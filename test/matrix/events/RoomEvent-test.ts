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

describe("RoomEvent", () => {
    describe("pure legacy", () => {
        it("should parse plaintext", () => {
            const ev = {
                type: "m.room.message",
                content: {
                    msgtype: "m.text",
                    body: "Hello World",
                },
            };
            const re = RoomEvent.fromRaw(ev);
            expect(re).toBeDefined();
            expect(re.text).toEqual(ev.content.body);
            expect(re.textNode).toMatchObject({
                mimetype: "text/plain",
                body: ev.content.body,
            });

            // We shouldn't have HTML
            expect(re.html).toBeFalsy();
            expect(re.htmlNode).toBeFalsy();
        });
        it("should parse HTML", () => {
            const ev = {
                type: "m.room.message",
                content: {
                    msgtype: "m.text",
                    body: "Hello World",
                    format: "org.matrix.custom.html",
                    formatted_body: "<b>Hello world</b>",
                },
            };
            const re = RoomEvent.fromRaw(ev);

            // Check that the HTML didn't break plaintext parsing
            expect(re).toBeDefined();
            expect(re.text).toEqual(ev.content.body);
            expect(re.textNode).toMatchObject({
                mimetype: "text/plain",
                body: ev.content.body,
            });

            // Now check HTML
            expect(re.html).toEqual(ev.content.formatted_body);
            expect(re.htmlNode).toMatchObject({
                mimetype: "text/html",
                body: ev.content.formatted_body,
            });
        });
        it("should parse not parse unknown formats as HTML", () => {
            const ev = {
                type: "m.room.message",
                content: {
                    msgtype: "m.text",
                    body: "Hello World",
                    format: "com.example.not_html",
                    formatted_body: "<b>Hello world</b>",
                },
            };
            const re = RoomEvent.fromRaw(ev);
            expect(re).toBeDefined();
            expect(re.text).toEqual(ev.content.body);
            expect(re.textNode).toMatchObject({
                mimetype: "text/plain",
                body: ev.content.body,
            });
            expect(re.html).toBeFalsy();
            expect(re.htmlNode).toBeFalsy();
        });
    });
    describe("hybrid legacy", () => {
        it("should parse plaintext", () => {
            const ev = {
                type: "m.room.message",
                content: {
                    msgtype: "m.text",
                    body: "Hello World",
                    [MText.name]: "This is the real text",
                },
            };
            const re = RoomEvent.fromRaw(ev);
            expect(re).toBeDefined();
            expect(re.text).toEqual(ev.content[MText.name]);
            expect(re.textNode).toMatchObject({
                mimetype: "text/plain",
                body: ev.content[MText.name],
            });

            // We shouldn't have HTML
            expect(re.html).toBeFalsy();
            expect(re.htmlNode).toBeFalsy();
        });
        it("should parse HTML", () => {
            const ev = {
                type: "m.room.message",
                content: {
                    msgtype: "m.text",
                    body: "Hello World",
                    format: "org.matrix.custom.html",
                    formatted_body: "<b>Hello world</b>",
                    [MText.name]: "This is the real text",
                    [MHtml.name]: "<i>This is the real text</i>",
                },
            };
            const re = RoomEvent.fromRaw(ev);

            // Check that the HTML didn't break plaintext parsing
            expect(re).toBeDefined();
            expect(re.text).toEqual(ev.content[MText.name]);
            expect(re.textNode).toMatchObject({
                mimetype: "text/plain",
                body: ev.content[MText.name],
            });

            // Now check HTML
            expect(re.html).toEqual(ev.content[MHtml.name]);
            expect(re.htmlNode).toMatchObject({
                mimetype: "text/html",
                body: ev.content[MHtml.name],
            });
        });
    });
    describe("m.message", () => {
        it("should parse plaintext from m.text", () => {
            const ev = {
                type: MMessage.name,
                content: {
                    [MText.name]: "This is the real text",
                },
            };
            const re = RoomEvent.fromRaw(ev);
            expect(re).toBeDefined();
            expect(re.text).toEqual(ev.content[MText.name]);
            expect(re.textNode).toMatchObject({
                mimetype: "text/plain",
                body: ev.content[MText.name],
            });

            // We shouldn't have HTML
            expect(re.html).toBeFalsy();
            expect(re.htmlNode).toBeFalsy();
        });
        it("should parse plaintext from m.message", () => {
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
            expect(re.text).toEqual(ev.content[MMessage.name][0].body);
            expect(re.textNode).toMatchObject({
                mimetype: "text/plain",
                body: ev.content[MMessage.name][0].body,
            });

            // We shouldn't have HTML
            expect(re.html).toBeFalsy();
            expect(re.htmlNode).toBeFalsy();
        });
        it("should parse plaintext from m.message without mimetypes", () => {
            const ev = {
                type: MMessage.name,
                content: {
                    [MMessage.name]: [
                        {body: "hello world"},
                    ],
                },
            };
            const re = RoomEvent.fromRaw(ev);
            expect(re).toBeDefined();
            expect(re.text).toEqual(ev.content[MMessage.name][0].body);
            expect(re.textNode).toMatchObject({
                //mimetype: "text/plain", // our example text node doesn't have a mimetype
                body: ev.content[MMessage.name][0].body,
            });

            // We shouldn't have HTML
            expect(re.html).toBeFalsy();
            expect(re.htmlNode).toBeFalsy();
        });
        it("should parse plaintext from m.message from available options", () => {
            const ev = {
                type: MMessage.name,
                content: {
                    [MMessage.name]: [
                        {mimetype: "text/plain", body: "hello world"},
                        {mimetype: "text/not-plain", body: "WRONG"},
                    ],
                },
            };
            const re = RoomEvent.fromRaw(ev);
            expect(re).toBeDefined();
            expect(re.text).toEqual(ev.content[MMessage.name][0].body);
            expect(re.textNode).toMatchObject({
                mimetype: "text/plain",
                body: ev.content[MMessage.name][0].body,
            });

            // We shouldn't have HTML
            expect(re.html).toBeFalsy();
            expect(re.htmlNode).toBeFalsy();
        });
        it("should parse HTML from m.html", () => {
            const ev = {
                type: MMessage.name,
                content: {
                    [MText.name]: "This is the real text",
                    [MHtml.name]: "<b>This is the real text</b>",
                },
            };
            const re = RoomEvent.fromRaw(ev);
            expect(re).toBeDefined();
            expect(re.text).toEqual(ev.content[MText.name]);
            expect(re.textNode).toMatchObject({
                mimetype: "text/plain",
                body: ev.content[MText.name],
            });
            expect(re.html).toEqual(ev.content[MHtml.name]);
            expect(re.htmlNode).toMatchObject({
                mimetype: "text/html",
                body: ev.content[MHtml.name],
            });
        });
        it("should parse HTML from m.message", () => {
            const ev = {
                type: MMessage.name,
                content: {
                    [MMessage.name]: [
                        {mimetype: "text/plain", body: "hello world"},
                        {mimetype: "text/html", body: "<b>hello world</b>"},
                    ],
                },
            };
            const re = RoomEvent.fromRaw(ev);
            expect(re).toBeDefined();
            expect(re.text).toEqual(ev.content[MMessage.name][0].body);
            expect(re.textNode).toMatchObject({
                mimetype: "text/plain",
                body: ev.content[MMessage.name][0].body,
            });
            expect(re.html).toEqual(ev.content[MMessage.name][1].body);
            expect(re.htmlNode).toMatchObject({
                mimetype: "text/html",
                body: ev.content[MMessage.name][1].body,
            });
        });
    });
});
