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

import EditorModel from "../../src/editor/model";
import { createPartCreator, createRenderer } from "./mock";
import {
    toggleInlineFormat,
    selectRangeOfWordAtCaret,
    formatRange,
} from "../../src/editor/operations";
import { Formatting } from "../../src/components/views/rooms/MessageComposerFormatBar";

const SERIALIZED_NEWLINE = { "text": "\n", "type": "newline" };

describe('editor/operations: formatting operations', () => {
    describe('toggleInlineFormat', () => {
        it('works for words', () => {
            const renderer = createRenderer();
            const pc = createPartCreator();
            const model = new EditorModel([
                pc.plain("hello world!"),
            ], pc, renderer);

            const range = model.startRange(model.positionForOffset(6, false),
                model.positionForOffset(11, false));  // around "world"

            expect(range.parts[0].text).toBe("world");
            expect(model.serializeParts()).toEqual([{ "text": "hello world!", "type": "plain" }]);
            formatRange(range, Formatting.Italics);
            expect(model.serializeParts()).toEqual([{ "text": "hello _world_!", "type": "plain" }]);
        });

        it('works for parts of words', () => {
            const renderer = createRenderer();
            const pc = createPartCreator();
            const model = new EditorModel([
                pc.plain("hello world!"),
            ], pc, renderer);

            const range = model.startRange(model.positionForOffset(7, false),
                model.positionForOffset(10, false));  // around "orl"

            expect(range.parts[0].text).toBe("orl");
            expect(model.serializeParts()).toEqual([{ "text": "hello world!", "type": "plain" }]);
            toggleInlineFormat(range, "*");
            expect(model.serializeParts()).toEqual([{ "text": "hello w*orl*d!", "type": "plain" }]);
        });

        it('works for around pills', () => {
            const renderer = createRenderer();
            const pc = createPartCreator();
            const model = new EditorModel([
                pc.plain("hello there "),
                pc.atRoomPill("@room"),
                pc.plain(", how are you doing?"),
            ], pc, renderer);

            const range = model.startRange(model.positionForOffset(6, false),
                model.positionForOffset(30, false));  // around "there @room, how are you"

            expect(range.parts.map(p => p.text).join("")).toBe("there @room, how are you");
            expect(model.serializeParts()).toEqual([
                { "text": "hello there ", "type": "plain" },
                { "text": "@room", "type": "at-room-pill" },
                { "text": ", how are you doing?", "type": "plain" },
            ]);
            formatRange(range, Formatting.Italics);
            expect(model.serializeParts()).toEqual([
                { "text": "hello _there ", "type": "plain" },
                { "text": "@room", "type": "at-room-pill" },
                { "text": ", how are you_ doing?", "type": "plain" },
            ]);
        });

        it('works for a paragraph', () => {
            const renderer = createRenderer();
            const pc = createPartCreator();
            const model = new EditorModel([
                pc.plain("hello world,"),
                pc.newline(),
                pc.plain("how are you doing?"),
            ], pc, renderer);

            const range = model.startRange(model.positionForOffset(6, false),
                model.positionForOffset(16, false));  // around "world,\nhow"

            expect(range.parts.map(p => p.text).join("")).toBe("world,\nhow");
            expect(model.serializeParts()).toEqual([
                { "text": "hello world,", "type": "plain" },
                SERIALIZED_NEWLINE,
                { "text": "how are you doing?", "type": "plain" },
            ]);
            formatRange(range, Formatting.Bold);
            expect(model.serializeParts()).toEqual([
                { "text": "hello **world,", "type": "plain" },
                SERIALIZED_NEWLINE,
                { "text": "how** are you doing?", "type": "plain" },
            ]);
        });

        it('works for a paragraph with spurious breaks around it in selected range', () => {
            const renderer = createRenderer();
            const pc = createPartCreator();
            const model = new EditorModel([
                pc.newline(),
                pc.newline(),
                pc.plain("hello world,"),
                pc.newline(),
                pc.plain("how are you doing?"),
                pc.newline(),
                pc.newline(),
            ], pc, renderer);

            const range = model.startRange(model.positionForOffset(0, false), model.getPositionAtEnd());  // select-all

            expect(range.parts.map(p => p.text).join("")).toBe("\n\nhello world,\nhow are you doing?\n\n");
            expect(model.serializeParts()).toEqual([
                SERIALIZED_NEWLINE,
                SERIALIZED_NEWLINE,
                { "text": "hello world,", "type": "plain" },
                SERIALIZED_NEWLINE,
                { "text": "how are you doing?", "type": "plain" },
                SERIALIZED_NEWLINE,
                SERIALIZED_NEWLINE,
            ]);
            formatRange(range, Formatting.Bold);
            expect(model.serializeParts()).toEqual([
                SERIALIZED_NEWLINE,
                SERIALIZED_NEWLINE,
                { "text": "**hello world,", "type": "plain" },
                SERIALIZED_NEWLINE,
                { "text": "how are you doing?**", "type": "plain" },
                SERIALIZED_NEWLINE,
                SERIALIZED_NEWLINE,
            ]);
        });

        it('works for multiple paragraph', () => {
            const renderer = createRenderer();
            const pc = createPartCreator();
            const model = new EditorModel([
                pc.plain("hello world,"),
                pc.newline(),
                pc.plain("how are you doing?"),
                pc.newline(),
                pc.newline(),
                pc.plain("new paragraph"),
            ], pc, renderer);

            let range = model.startRange(model.positionForOffset(0, true), model.getPositionAtEnd()); // select-all

            expect(model.serializeParts()).toEqual([
                { "text": "hello world,", "type": "plain" },
                SERIALIZED_NEWLINE,
                { "text": "how are you doing?", "type": "plain" },
                SERIALIZED_NEWLINE,
                SERIALIZED_NEWLINE,
                { "text": "new paragraph", "type": "plain" },
            ]);
            toggleInlineFormat(range, "__");
            expect(model.serializeParts()).toEqual([
                { "text": "__hello world,", "type": "plain" },
                SERIALIZED_NEWLINE,
                { "text": "how are you doing?__", "type": "plain" },
                SERIALIZED_NEWLINE,
                SERIALIZED_NEWLINE,
                { "text": "__new paragraph__", "type": "plain" },
            ]);
            range = model.startRange(model.positionForOffset(0, true), model.getPositionAtEnd()); // select-all
            toggleInlineFormat(range, "__");
            expect(model.serializeParts()).toEqual([
                { "text": "hello world,", "type": "plain" },
                SERIALIZED_NEWLINE,
                { "text": "how are you doing?", "type": "plain" },
                SERIALIZED_NEWLINE,
                SERIALIZED_NEWLINE,
                { "text": "new paragraph", "type": "plain" },
            ]);
        });

        it('format word at caret position at beginning of new line without previous selection', () => {
            const renderer = createRenderer();
            const pc = createPartCreator();
            const model = new EditorModel([
                pc.newline(),
                pc.plain("hello!"),
            ], pc, renderer);

            let range = model.startRange(model.positionForOffset(1, false));

            // Initial position should equal start and end since we did not select anything
            expect(range.getLastStartingPosition()).toBe(range.start);
            expect(range.getLastStartingPosition()).toBe(range.end);

            formatRange(range, Formatting.Bold); // Toggle

            expect(model.serializeParts()).toEqual([
                SERIALIZED_NEWLINE,
                { "text": "**hello!**", "type": "plain" },
            ]);

            formatRange(range, Formatting.Bold); // Untoggle

            expect(model.serializeParts()).toEqual([
                SERIALIZED_NEWLINE,
                { "text": "hello!", "type": "plain" },
            ]);

            // Check if it also works for code as it uses toggleInlineFormatting only indirectly
            range = model.startRange(model.positionForOffset(1, false));
            selectRangeOfWordAtCaret(range);

            formatRange(range, Formatting.Code); // Toggle

            expect(model.serializeParts()).toEqual([
                SERIALIZED_NEWLINE,
                { "text": "`hello!`", "type": "plain" },
            ]);

            formatRange(range, Formatting.Code); // Untoggle
            expect(model.serializeParts()).toEqual([
                SERIALIZED_NEWLINE,
                { "text": "hello!", "type": "plain" },
            ]);
        });

        it('caret resets correctly to current line when untoggling formatting while caret at line end', () => {
            const renderer = createRenderer();
            const pc = createPartCreator();
            const model = new EditorModel([
                pc.plain("hello **hello!**"),
                pc.newline(),
                pc.plain("world"),
            ], pc, renderer);

            expect(model.serializeParts()).toEqual([
                { "text": "hello **hello!**", "type": "plain" },
                SERIALIZED_NEWLINE,
                { "text": "world", "type": "plain" },
            ]);

            const endOfFirstLine = 16;
            const range = model.startRange(model.positionForOffset(endOfFirstLine, true));

            formatRange(range, Formatting.Bold); // Untoggle
            formatRange(range, Formatting.Italics); // Toggle

            // We expect formatting to still happen in the first line as the caret should not jump down
            expect(model.serializeParts()).toEqual([
                { "text": "hello _hello!_", "type": "plain" },
                SERIALIZED_NEWLINE,
                { "text": "world", "type": "plain" },
            ]);
        });

        it('format link in front of new line part', () => {
            const renderer = createRenderer();
            const pc = createPartCreator();
            const model = new EditorModel([
                pc.plain("hello!"),
                pc.newline(),
                pc.plain("world!"),
                pc.newline(),
            ], pc, renderer);

            let range = model.startRange(model.getPositionAtEnd().asOffset(model).add(-1).asPosition(model)); // select-all

            expect(model.serializeParts()).toEqual([
                { "text": "hello!", "type": "plain" },
                SERIALIZED_NEWLINE,
                { "text": "world!", "type": "plain" },
                SERIALIZED_NEWLINE,
            ]);

            formatRange(range, Formatting.InsertLink); // Toggle
            expect(model.serializeParts()).toEqual([
                { "text": "hello!", "type": "plain" },
                SERIALIZED_NEWLINE,
                { "text": "[world!]()", "type": "plain" },
                SERIALIZED_NEWLINE,
            ]);

            range = model.startRange(model.getPositionAtEnd().asOffset(model).add(-1).asPosition(model)); // select-all
            formatRange(range, Formatting.InsertLink); // Untoggle
            expect(model.serializeParts()).toEqual([
                { "text": "hello!", "type": "plain" },
                SERIALIZED_NEWLINE,
                { "text": "world!", "type": "plain" },
                SERIALIZED_NEWLINE,
            ]);
        });

        it('format multi line code', () => {
            const renderer = createRenderer();
            const pc = createPartCreator();
            const model = new EditorModel([
                pc.plain("int x = 1;"),
                pc.newline(),
                pc.newline(),
                pc.plain("int y = 42;"),
            ], pc, renderer);

            let range = model.startRange(model.positionForOffset(0), model.getPositionAtEnd()); // select-all

            expect(range.parts.map(p => p.text).join("")).toBe("int x = 1;\n\nint y = 42;");

            expect(model.serializeParts()).toEqual([
                { "text": "int x = 1;", "type": "plain" },
                SERIALIZED_NEWLINE,
                SERIALIZED_NEWLINE,
                { "text": "int y = 42;", "type": "plain" },
            ]);

            formatRange(range, Formatting.Code); // Toggle

            expect(model.serializeParts()).toEqual([
                { "text": "```", "type": "plain" },
                SERIALIZED_NEWLINE,
                { "text": "int x = 1;", "type": "plain" },
                SERIALIZED_NEWLINE,
                SERIALIZED_NEWLINE,
                { "text": "int y = 42;", "type": "plain" },
                SERIALIZED_NEWLINE,
                { "text": "```", "type": "plain" },
            ]);

            range = model.startRange(model.positionForOffset(0, false), model.getPositionAtEnd()); // select-all
            formatRange(range, Formatting.Code); // Untoggle

            expect(model.serializeParts()).toEqual([
                { "text": "int x = 1;", "type": "plain" },
                SERIALIZED_NEWLINE,
                SERIALIZED_NEWLINE,
                { "text": "int y = 42;", "type": "plain" },
            ]);
        });

        it('does not format pure white space', () => {
            const renderer = createRenderer();
            const pc = createPartCreator();
            const model = new EditorModel([
                pc.plain("       "),
                pc.newline(),
                pc.newline(),
                pc.plain("         "),
            ], pc, renderer);

            const range = model.startRange(model.positionForOffset(0), model.getPositionAtEnd()); // select-all
            expect(range.parts.map(p => p.text).join("")).toBe("       \n\n         ");

            expect(model.serializeParts()).toEqual([
                { "text": "       ", "type": "plain" },
                SERIALIZED_NEWLINE,
                SERIALIZED_NEWLINE,
                { "text": "         ", "type": "plain" },
            ]);

            formatRange(range, Formatting.Bold);

            expect(model.serializeParts()).toEqual([
                { "text": "       ", "type": "plain" },
                SERIALIZED_NEWLINE,
                SERIALIZED_NEWLINE,
                { "text": "         ", "type": "plain" },
            ]);
        });
    });
});
