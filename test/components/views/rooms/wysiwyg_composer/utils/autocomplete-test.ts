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
    buildQuery,
    getRoomFrom,
    getMentionDisplayText,
    getMentionAttributes,
} from "../../../../../../src/components/views/rooms/wysiwyg_composer/utils/autocomplete";

describe("buildQuery", () => {
    it("returns an empty string for a falsy argument", () => {
        expect(buildQuery(null)).toBe("");
    });

    it("returns an empty string when keyChar is falsy", () => {
        const noKeyCharSuggestion = { keyChar: "" as const, text: "test", type: "unknown" as const };
        expect(buildQuery(noKeyCharSuggestion)).toBe("");
    });

    it("returns an empty string when suggestion is a command", () => {
        // TODO alter this test when commands are implemented
        const commandSuggestion = { keyChar: "/" as const, text: "slash", type: "command" as const };
        expect(buildQuery(commandSuggestion)).toBe("");
    });

    it("combines the keyChar and text of the suggestion in the query", () => {
        const handledSuggestion = { keyChar: "@" as const, text: "alice", type: "mention" as const };
        expect(buildQuery(handledSuggestion)).toBe("@alice");
    });
});
