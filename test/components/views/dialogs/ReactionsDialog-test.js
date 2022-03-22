import "../../../skinned-sdk";

import React from "react";
import { mount } from "enzyme";
import { act } from "react-dom/test-utils";

import * as TestUtils from "../../../test-utils";
import ReactionsDialog from "../../../../src/components/views/dialogs/ReactionsDialog";

describe("ReactionsDialog", () => {
    const sourceRoom = "!111111111111111111:example.org";
    const defaultMessage = TestUtils.mkMessage({
        room: sourceRoom,
        user: "@alice:example.org",
        msg: "Hello world!",
        event: true,
    });
    const room = TestUtils.mkStubRoom(sourceRoom);
    room.getMember = (name) => ({ name });

    const event1 = TestUtils.mkEvent({
        type: "m.reaction",
        content: ":)", // content is required
        user: 'matti',
        event: true,
    });
    const event2 = TestUtils.mkEvent({
        type: "m.reaction",
        content: ":)",
        user: 'teppo',
        event: true,
    });
    const mountReactionsDialog = async (message = defaultMessage) => {
        const reactions = [
            ["😊", new Set([event1])],
            ["🌴", new Set([event2, event1])],
        ];
        reactions.getSortedAnnotationsByKey = jest.fn().mockReturnValue(reactions);

        let wrapper;
        await act(async () => {
            wrapper = mount(
                <ReactionsDialog
                    reactions={reactions}
                    room={room}
                />,
            );
            // Wait one tick for our profile data to load so the state update happens within act
            await new Promise(resolve => setImmediate(resolve));
        });
        wrapper.update();

        return wrapper;
    };

    let wrapper;
    describe("emoji list", () => {
        beforeEach(async () => {
            wrapper = await mountReactionsDialog();
        });

        it("shows correct total number of reactions", async () => {
            const emojiList = wrapper.find('.mx_EmojiList > li');
            expect(emojiList).toHaveLength(3);
            expect(emojiList.at(0).text()).toContain('3');
        });

        it("shows correct reactions ordered by reaction count", async () => {
            const emojiList = wrapper.find('.mx_EmojiList > li');
            expect(emojiList.at(1).text()).toContain("🌴");
            expect(emojiList.at(1).text()).toContain("2");
            expect(emojiList.at(2).text()).toContain("😊");
            expect(emojiList.at(2).text()).toContain("1");
        });
    });

    describe("sender list", () => {
        beforeEach(async () => {
            wrapper = await mountReactionsDialog();
        });

        it("shows all senders and emojis by default, ordered by reaction count, sender name", async () => {
            const senderList = wrapper.find('.mx_SenderList > li');
            expect(senderList).toHaveLength(3);
            expect(senderList.at(0).text()).toContain("🌴");
            expect(senderList.at(0).text()).toContain("matti");
            expect(senderList.at(1).text()).toContain("🌴");
            expect(senderList.at(1).text()).toContain("teppo");
            expect(senderList.at(2).text()).toContain("😊");
            expect(senderList.at(2).text()).toContain("matti");
        });

        it("filters senders when clicking an emoji", async () => {
            const emojiButtons = wrapper.find('.mx_EmojiList > li');

            // 🌴
            emojiButtons.at(1).find('div').simulate('click');
            await new Promise(resolve => setImmediate(resolve));
            let senderList = wrapper.find('.mx_SenderList > li');
            expect(senderList).toHaveLength(2);
            expect(senderList.at(0).text()).toContain('🌴');
            expect(senderList.at(0).text()).toContain('matti');

            // 😊
            emojiButtons.at(2).find('div').simulate('click');
            await new Promise(resolve => setImmediate(resolve));
            senderList = wrapper.find('.mx_SenderList > li');
            expect(senderList).toHaveLength(1);
            expect(senderList.at(0).text()).toContain('😊');

            // All
            emojiButtons.at(0).find('div').simulate('click');
            await new Promise(resolve => setImmediate(resolve));
            senderList = wrapper.find('.mx_SenderList > li');
            expect(senderList).toHaveLength(3);
        });
    });
});
