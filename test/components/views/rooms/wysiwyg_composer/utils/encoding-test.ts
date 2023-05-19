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
    amendMarkdownLinks,
    encodeHtmlEntities,
} from "../../../../../../src/components/views/rooms/wysiwyg_composer/utils/encoding";

describe("encodeHtmlEntities", () => {
    it("converts strings with encoding", () => {
        const input = "&amp;";
        const expected = "&amp;amp;";

        expect(encodeHtmlEntities(input)).toBe(expected);
    });
    it("converts markdown links in text to html encoded equivalent", () => {
        const input = "[example](<https://www.markdownlink.com>)";
        const expected = "[example](&lt;https://www.markdownlink.com&gt;)";

        expect(encodeHtmlEntities(input)).toBe(expected);
    });
});

describe("amendMarkdownLinks", () => {
    it("does not alter markdown links without angle brackets surrounding the href", () => {
        const input = "[example](https://www.markdownlink.com)";

        expect(amendMarkdownLinks(input)).toBe(input);
    });

    it("converts angle brackets surrounding link hrefs in markdown from html encoding to plain text", () => {
        const input = "[example](&lt;https://www.markdownlink.com&gt;)";
        const expected = "[example](<https://www.markdownlink.com>)";

        expect(amendMarkdownLinks(input)).toBe(expected);
    });
});
