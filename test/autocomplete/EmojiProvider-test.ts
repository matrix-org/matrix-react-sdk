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

import { mocked } from "jest-mock";
import { MatrixEvent } from "matrix-js-sdk/src/matrix";
import { UnstableValue } from "matrix-js-sdk/src/NamespacedValue";

import EmojiProvider from "../../src/autocomplete/EmojiProvider";
import { mkStubRoom } from "../test-utils/test-utils";
import { add } from "../../src/emojipicker/recent";
import { stubClient } from "../test-utils";
import { MatrixClientPeg } from "../../src/MatrixClientPeg";
import SettingsStore from "../../src/settings/SettingsStore";

const EMOJI_SHORTCODES = [
    ":+1",
    ":heart",
    ":grinning",
    ":hand",
    ":man",
    ":sweat",
    ":monkey",
    ":boat",
    ":mailbox",
    ":cop",
    ":bow",
    ":kiss",
    ":golf",
];

// Some emoji shortcodes are too short and do not actually trigger autocompletion until the ending `:`.
// This means that we cannot compare their autocompletion before and after the ending `:` and have
// to simply assert that the final completion with the colon is the exact emoji.
const TOO_SHORT_EMOJI_SHORTCODE = [{ emojiShortcode: ":o", expectedEmoji: "⭕️" }];
const EMOTES_STATE = new UnstableValue("m.room.emotes", "org.matrix.msc3892.emotes");

describe("EmojiProvider", function () {
    const testRoom = mkStubRoom(undefined, undefined, undefined);
    stubClient();
    MatrixClientPeg.safeGet();

    it.each(EMOJI_SHORTCODES)("Returns consistent results after final colon %s", async function (emojiShortcode) {
        const ep = new EmojiProvider(testRoom);
        const range = { beginning: true, start: 0, end: 3 };
        const completionsBeforeColon = await ep.getCompletions(emojiShortcode, range);
        const completionsAfterColon = await ep.getCompletions(emojiShortcode + ":", range);

        const firstCompletionWithoutColon = completionsBeforeColon[0].completion;
        const firstCompletionWithColon = completionsAfterColon[0].completion;

        expect(firstCompletionWithoutColon).toEqual(firstCompletionWithColon);
    });

    it.each(TOO_SHORT_EMOJI_SHORTCODE)(
        "Returns correct results after final colon $emojiShortcode",
        async ({ emojiShortcode, expectedEmoji }) => {
            const ep = new EmojiProvider(testRoom);
            const range = { beginning: true, start: 0, end: 3 };
            const completions = await ep.getCompletions(emojiShortcode + ":", range);

            expect(completions[0].completion).toEqual(expectedEmoji);
        },
    );

    it("Recently used emojis are correctly sorted", async function () {
        add("😘"); //kissing_heart
        add("💗"); //heartpulse
        add("💗"); //heartpulse
        add("😍"); //heart_eyes

        const ep = new EmojiProvider(testRoom);
        const completionsList = await ep.getCompletions(":heart", { beginning: true, start: 0, end: 6 });
        expect(completionsList[0]?.component?.props.title).toEqual(":heartpulse:");
        expect(completionsList[1]?.component?.props.title).toEqual(":heart_eyes:");
    });

    it("Exact match in recently used takes the lead", async function () {
        add("😘"); //kissing_heart
        add("💗"); //heartpulse
        add("💗"); //heartpulse
        add("😍"); //heart_eyes

        add("❤️"); //heart
        const ep = new EmojiProvider(testRoom);
        const completionsList = await ep.getCompletions(":heart", { beginning: true, start: 0, end: 6 });

        expect(completionsList[0]?.component?.props.title).toEqual(":heart:");
        expect(completionsList[1]?.component?.props.title).toEqual(":heartpulse:");
        expect(completionsList[2]?.component?.props.title).toEqual(":heart_eyes:");
    });

    it("loads and returns custom emotes", async function () {
        const cli = stubClient();
        jest.spyOn(SettingsStore, "getValue").mockReturnValue(true);
        mocked(cli.getRoom).mockReturnValue(testRoom);
        mocked(cli.isRoomEncrypted).mockReturnValue(false);

        // @ts-ignore - mocked doesn't support overloads properly
        mocked(testRoom.currentState.getStateEvents).mockImplementation((type, key) => {
            if (key === undefined) return [] as MatrixEvent[];
            if (type === EMOTES_STATE.name) {
                return new MatrixEvent({
                    sender: "@sender:server",
                    room_id: testRoom.roomId,
                    type: EMOTES_STATE.name,
                    state_key: "",
                    content: {
                        testEmote: "abcde/custom-emote-123.png",
                    },
                });
            }
            return null;
        });

        const ep = new EmojiProvider(testRoom);
        const completionsList = await ep.getCompletions(":testEmote", { beginning: true, start: 0, end: 6 });
        expect(completionsList[0]?.component?.props.titleComponent).toEqual(
            "http://this.is.a.url/custom-emote-123.png",
        );
    });
});
