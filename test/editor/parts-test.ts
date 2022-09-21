/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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

import { EmojiPart, PlainPart, PartCreator } from "../../src/editor/parts";

describe("editor/parts", () => {
    describe("appendUntilRejected", () => {
        const femaleFacepalmEmoji = "🤦‍♀️";

        it("should not accept emoji strings into type=plain", () => {
            const part = new PlainPart();
            expect(part.appendUntilRejected(femaleFacepalmEmoji, "")).toEqual(femaleFacepalmEmoji);
            expect(part.text).toEqual("");
        });

        it("should accept emoji strings into type=emoji", () => {
            const part = new EmojiPart();
            expect(part.appendUntilRejected(femaleFacepalmEmoji, "")).toBeUndefined();
            expect(part.text).toEqual(femaleFacepalmEmoji);
        });
    });

    describe("plainWithEmoji", () => {
        it("should append an hair space after a regional emoji", () => {
            const regionalEmojiF = String.fromCodePoint(127467);
            const hairSpace = String.fromCodePoint(0x200A);
            const part = new PartCreator(null, null);
            const parts = part.plainWithEmoji(regionalEmojiF);
            expect(parts.length).toBe(2);
            expect(parts[0].text).toBe(regionalEmojiF);
            expect(parts[1].text).toBe(hairSpace);
        });
    });
});
