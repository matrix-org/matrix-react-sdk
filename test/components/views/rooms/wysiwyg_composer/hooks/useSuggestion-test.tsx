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

import { MappedSuggestion } from "@matrix-org/matrix-wysiwyg";

import {
    PlainTextSuggestionPattern,
    mapSuggestion,
} from "../../../../../../src/components/views/rooms/wysiwyg_composer/hooks/useSuggestion";

describe("mapSuggestion", () => {
    it("returns null if called with a null argument", () => {
        expect(mapSuggestion(null)).toBeNull();
    });

    it("returns a mapped suggestion when passed a suggestion", () => {
        const input: PlainTextSuggestionPattern = {
            keyChar: "/",
            type: "command",
            text: "some text",
            node: document.createTextNode(""),
            startOffset: 0,
            endOffset: 0,
        };

        const expected: MappedSuggestion = {
            keyChar: "/",
            type: "command",
            text: "some text",
        };

        const output = mapSuggestion(input);

        expect(output).toEqual(expected);
    });
});
