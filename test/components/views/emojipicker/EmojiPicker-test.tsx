/*
Copyright 2022 Ryan Browne <code@commonlawfeature.com>

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

import EmojiPicker from "../../../../src/components/views/emojipicker/EmojiPicker";
import { stubClient } from "../../../test-utils";
import { MatrixClientPeg } from "../../../../src/MatrixClientPeg";

describe("EmojiPicker", function () {
    stubClient();
    MatrixClientPeg.get();

    it("sort emojis by shortcode and size", function () {
        const ep = new EmojiPicker(null);

        //@ts-ignore private access
        for (let cat of ep.categories) {
            //@ts-ignore private access
            cat.ref.current = { disabled: false };
        }

        //@ts-ignore private access
        ep.onChangeFilter("heart");

        //@ts-ignore private access
        expect(ep.memoizedDataByCategory["people"][0].shortcodes[0]).toEqual("heart");
        //@ts-ignore private access
        expect(ep.memoizedDataByCategory["people"][1].shortcodes[0]).toEqual("heartbeat");
    });
});
