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

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MatrixClient, Room } from "matrix-js-sdk/src/matrix";

import BasicMessageComposer from "../../../../src/components/views/rooms/BasicMessageComposer";
import * as TestUtils from "../../../test-utils";
import { MatrixClientPeg } from "../../../../src/MatrixClientPeg";
import EditorModel from "../../../../src/editor/model";
import { createPartCreator, createRenderer } from "../../../editor/mock";
import SettingsStore from "../../../../src/settings/SettingsStore";
import * as mockPosthogAnalytics from "../../../../src/PosthogAnalytics";

describe("BasicMessageComposer", () => {
    const renderer = createRenderer();
    const pc = createPartCreator();
    const roomId = "!1234567890:domain";

    let client: MatrixClient;
    let userId: string;
    let room: Room;

    beforeEach(() => {
        TestUtils.stubClient();
        client = MatrixClientPeg.safeGet();

        userId = client.getSafeUserId();
        room = new Room(roomId, client, userId);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("should allow a user to paste a URL without it being mangled", async () => {
        const model = new EditorModel([], pc, renderer);
        render(<BasicMessageComposer model={model} room={room} />);
        const testUrl = "https://element.io";
        const mockDataTransfer = generateMockDataTransferForString(testUrl);
        await userEvent.paste(mockDataTransfer);

        expect(model.parts).toHaveLength(1);
        expect(model.parts[0].text).toBe(testUrl);
        expect(screen.getByText(testUrl)).toBeInTheDocument();
    });

    it("should replaceEmoticons properly", async () => {
        jest.spyOn(SettingsStore, "getValue").mockImplementation((settingName: string) => {
            return settingName === "MessageComposerInput.autoReplaceEmoji";
        });
        userEvent.setup();
        const model = new EditorModel([], pc, renderer);
        render(<BasicMessageComposer model={model} room={room} />);

        const tranformations = [
            { before: "4:3 video", after: "4:3 video" },
            { before: "regexp 12345678", after: "regexp 12345678" },
            { before: "--:--)", after: "--:--)" },

            { before: "we <3 matrix", after: "we ❤️ matrix" },
            { before: "hello world :-)", after: "hello world 🙂" },
            { before: ":) hello world", after: "🙂 hello world" },
            { before: ":D 4:3 video :)", after: "😄 4:3 video 🙂" },

            { before: ":-D", after: "😄" },
            { before: ":D", after: "😄" },
            { before: ":3", after: "😽" },
        ];
        const input = screen.getByRole("textbox");

        for (const { before, after } of tranformations) {
            await userEvent.clear(input);
            //add a space after the text to trigger the replacement
            await userEvent.type(input, before + " ");
            const transformedText = model.parts.map((part) => part.text).join("");
            expect(transformedText).toBe(after + " ");
        }
    });

    describe("Analytics", () => {
        beforeEach(async () => {
            jest.spyOn(mockPosthogAnalytics.PosthogAnalytics.instance, "trackEvent").mockImplementation(() => {});
        });

        const buttonsWithShortcuts = [
            { name: "Bold", formatAction: "Bold", keyboardShortcut: "{Control>}b{/Control}" },
            { name: "Italics", formatAction: "Italic", keyboardShortcut: "{Control>}i{/Control}" },
            { name: "Code block", formatAction: "InlineCode", keyboardShortcut: "{Control>}e{/Control}" },
            { name: "Quote", formatAction: "Quote", keyboardShortcut: "{Control>}{Shift>}>{/Shift}{/Control}" },
            { name: "Insert link", formatAction: "Link", keyboardShortcut: "{Control>}{Shift>}l{/Shift}{/Control}" },
        ];
        const buttonsWithoutShortcuts = [{ name: "Strikethrough", formatAction: "Strikethrough" }];

        it.each([...buttonsWithShortcuts, ...buttonsWithoutShortcuts])(
            "Fires analytic event on click for: $name",
            async ({ name, formatAction }) => {
                userEvent.setup();
                const model = new EditorModel([], pc, renderer);
                render(<BasicMessageComposer model={model} room={room} />);

                // type some text then use the keyboard to highlight a selection to display the formatting menu
                await userEvent.type(screen.getByRole("textbox"), "hello{Shift>}{ArrowLeft}{/Shift}");

                // select the button and click it to simulate activating the formatting method
                const button = screen.getByRole("button", { name });
                await userEvent.click(button);
                // check that the analytics tracking has fired once with the expected formattingAction
                expect(mockPosthogAnalytics.PosthogAnalytics.instance.trackEvent).toHaveBeenCalledTimes(1);
                expect(mockPosthogAnalytics.PosthogAnalytics.instance.trackEvent).toHaveBeenCalledWith({
                    eventName: "FormattedMessage",
                    editor: "RteFormatting",
                    formatAction,
                });
            },
        );

        it.each(buttonsWithShortcuts)(
            "Fires analytic event on use of keyboard shortcut for: $name",
            async ({ formatAction, keyboardShortcut }) => {
                userEvent.setup();
                const model = new EditorModel([], pc, renderer);
                render(<BasicMessageComposer model={model} room={room} />);

                // type some text then use the keyboard to highlight a selection to display the formatting menu
                await userEvent.type(screen.getByRole("textbox"), "hello");

                // activate the button using the keyboard shortcut
                await userEvent.keyboard(keyboardShortcut);

                // check that the analytics tracking has fired once with the expected formattingAction
                expect(mockPosthogAnalytics.PosthogAnalytics.instance.trackEvent).toHaveBeenCalledTimes(1);
                expect(mockPosthogAnalytics.PosthogAnalytics.instance.trackEvent).toHaveBeenCalledWith({
                    eventName: "FormattedMessage",
                    editor: "RteFormatting",
                    formatAction,
                });
            },
        );
    });
});

function generateMockDataTransferForString(string: string): DataTransfer {
    return {
        getData: (type) => {
            if (type === "text/plain") {
                return string;
            }
            return "";
        },
        dropEffect: "link",
        effectAllowed: "link",
        files: {} as FileList,
        items: {} as DataTransferItemList,
        types: [],
        clearData: () => {},
        setData: () => {},
        setDragImage: () => {},
    };
}
