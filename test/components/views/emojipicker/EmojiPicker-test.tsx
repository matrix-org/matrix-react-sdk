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

import React, { createRef } from "react";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mocked } from "jest-mock";
import { UnstableValue } from "matrix-js-sdk/src/NamespacedValue";
import { MatrixEvent } from "matrix-js-sdk/src/matrix";

import { mkStubRoom, stubClient } from "../../../test-utils";
import EmojiPicker from "../../../../src/components/views/emojipicker/EmojiPicker";
import { Media, mediaFromMxc } from "../../../../src/customisations/Media";

jest.mock("../../../../src/customisations/Media", () => ({
    mediaFromMxc: jest.fn(),
}));
const EMOTES_STATE = new UnstableValue("org.matrix.msc3892.emotes", "m.room.emotes");
describe("EmojiPicker", function () {
    stubClient();

    it("should not mangle default order after filtering", () => {
        const ref = createRef<EmojiPicker>();
        const { container } = render(
            <EmojiPicker ref={ref} onChoose={(str: string) => false} onFinished={jest.fn()} />,
        );

        // Record the HTML before filtering
        const beforeHtml = container.innerHTML;

        // Apply a filter and assert that the HTML has changed
        //@ts-ignore private access
        ref.current!.onChangeFilter("test");
        expect(beforeHtml).not.toEqual(container.innerHTML);

        // Clear the filter and assert that the HTML matches what it was before filtering
        //@ts-ignore private access
        ref.current!.onChangeFilter("");
        expect(beforeHtml).toEqual(container.innerHTML);
    });

    it("sort emojis by shortcode and size", function () {
        const ep = new EmojiPicker({ onChoose: (str: string) => false, onFinished: jest.fn() });

        //@ts-ignore private access
        ep.onChangeFilter("heart");

        //@ts-ignore private access
        expect(ep.memoizedDataByCategory["people"][0].shortcodes[0]).toEqual("heart");
        //@ts-ignore private access
        expect(ep.memoizedDataByCategory["people"][1].shortcodes[0]).toEqual("heartbeat");
    });

    it("should allow keyboard navigation using arrow keys", async () => {
        // mock offsetParent
        Object.defineProperty(HTMLElement.prototype, "offsetParent", {
            get() {
                return this.parentNode;
            },
        });

        const onChoose = jest.fn();
        const onFinished = jest.fn();
        const { container } = render(<EmojiPicker onChoose={onChoose} onFinished={onFinished} />);

        const input = container.querySelector("input")!;
        expect(input).toHaveFocus();

        function getEmoji(): string {
            const activeDescendant = input.getAttribute("aria-activedescendant");
            return container.querySelector("#" + activeDescendant)!.textContent!;
        }

        expect(getEmoji()).toEqual("😀");
        await userEvent.keyboard("[ArrowDown]");
        expect(getEmoji()).toEqual("🙂");
        await userEvent.keyboard("[ArrowUp]");
        expect(getEmoji()).toEqual("😀");
        await userEvent.keyboard("Flag");
        await userEvent.keyboard("[ArrowRight]");
        await userEvent.keyboard("[ArrowRight]");
        expect(getEmoji()).toEqual("📫️");
        await userEvent.keyboard("[ArrowDown]");
        expect(getEmoji()).toEqual("🇦🇨");
        await userEvent.keyboard("[ArrowLeft]");
        expect(getEmoji()).toEqual("📭️");
        await userEvent.keyboard("[ArrowUp]");
        expect(getEmoji()).toEqual("⛳️");
        await userEvent.keyboard("[ArrowRight]");
        expect(getEmoji()).toEqual("📫️");
        await userEvent.keyboard("[Enter]");

        expect(onChoose).toHaveBeenCalledWith("📫️");
        expect(onFinished).toHaveBeenCalled();
    });
    it("should load custom emotes", async () => {
        const cli = stubClient();
        const room = mkStubRoom("!roomId:server", "Room", cli);
        mocked(cli.getRoom).mockReturnValue(room);
        mocked(cli.isRoomEncrypted).mockReturnValue(false);
        mocked(mediaFromMxc).mockReturnValue({
            srcHttp: "http://this.is.a.url/server/custom-emote-123.png",
        } as Media);
        const ref = createRef<EmojiPicker>();

        // @ts-ignore - mocked doesn't support overloads properly
        mocked(room.currentState.getStateEvents).mockImplementation((type, key) => {
            if (key === undefined) return [] as MatrixEvent[];
            if (type === EMOTES_STATE.name) {
                return new MatrixEvent({
                    sender: "@sender:server",
                    room_id: room.roomId,
                    type: EMOTES_STATE.name,
                    state_key: "",
                    content: {
                        testEmote: "http://this.is.a.url/server/custom-emote-123.png",
                    },
                });
            }
            return null;
        });
        const { container } = render(
            <EmojiPicker ref={ref} onChoose={(str: string) => false} onFinished={jest.fn()} room={room} />,
        );
        await new Promise(process.nextTick);

        const customCategory = container.querySelector("#mx_EmojiPicker_category_custom");
        if (!customCategory) {
            throw new Error("custom emote not in emojipicker");
        }
    });
});
