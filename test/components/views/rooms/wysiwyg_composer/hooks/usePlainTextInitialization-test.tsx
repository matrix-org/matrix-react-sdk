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
    usePlainTextInitialization,
    wipFormatter,
    getMentionAttributesFromMarkdown,
} from "../../../../../../src/components/views/rooms/wysiwyg_composer/hooks/usePlainTextInitialization";

it("does something", () => {});
// TODO port to the new function
// describe("amendLinksInPlainText", () => {
//     it("returns the plain text if the rich text contains no links", () => {
//         const richText = "does not contain a link";
//         const plainText = "plain Text";
//         const output = wipFormatter(richText, plainText);

//         expect(output).toBe(plainText);
//     });

//     it("removes the angle brackets from a regular plain text link", () => {
//         const richText = '<a href="www.link.com">regular link</a>';
//         const plainText = "[regular link](<https://www.link.com>)";
//         const output = wipFormatter(richText, plainText);

//         expect(output).toBe("[regular link](https://www.link.com)");
//     });

//     it("replaces at at-room mention with it's rich text equivalent", () => {
//         const richText = '<a href="#">@room</a> something';
//         const plainText = "[@room](<https://#>) something";
//         const output = wipFormatter(richText, plainText);

//         expect(output).toBe(richText);
//     });

//     it("replaces a user mention with it's rich text equivalent", () => {
//         const richText = '<a href="matrix.to/#/@test:user.io">testuser</a>';
//         const plainText = "[testuser](<https://matrix.to/#/@test:user.io>)";
//         const output = wipFormatter(richText, plainText);

//         expect(output).toBe(richText);
//     });
// });
