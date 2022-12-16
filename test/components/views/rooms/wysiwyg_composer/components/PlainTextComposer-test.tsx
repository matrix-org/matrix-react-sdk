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

import { PlainTextComposer } from "../../../../../../src/components/views/rooms/wysiwyg_composer/components/PlainTextComposer";
import * as mockUseSettingsHook from "../../../../../../src/hooks/useSettings";
import * as mockKeyboard from "../../../../../../src/Keyboard";
import { text } from "stream/consumers";

jest.mock("../../../../../../src/hooks/useSettings");

jest.mock("../../../../../../src/hooks/useSettings");

beforeEach(() => {
    // defaults for these tests are:
    // ctrlEnterToSend is false
    mockUseSettingsHook.useSettingValue = jest.fn().mockReturnValue(false);
    // platform is not mac
    mockKeyboard.IS_MAC = false;
});



describe("PlainTextComposer", () => {
    const customRender = (
        onChange = (_content: string) => void 0,
        onSend = () => void 0,
        disabled = false,
        initialContent?: string,
    ) => {
        return render(
            <PlainTextComposer
                onChange={onChange}
                onSend={onSend}
                disabled={disabled}
                initialContent={initialContent}
            />,
        );
    };

    it("Should have contentEditable at false when disabled", () => {
        // When
        customRender(jest.fn(), jest.fn(), true);

        // Then
        expect(screen.getByRole("textbox")).toHaveAttribute("contentEditable", "false");
    });

    it("Should have focus", () => {
        // When
        customRender(jest.fn(), jest.fn(), false);

        // Then
        expect(screen.getByRole("textbox")).toHaveFocus();
    });

    it("Should call onChange handler", async () => {
        // When
        const content = "content";
        const onChange = jest.fn();
        customRender(onChange, jest.fn());
        await userEvent.type(screen.getByRole("textbox"), content);

        // Then
        expect(onChange).toBeCalledWith(content);
    });

    it("Should call onSend when Enter is pressed and ctrlEnterToSend is false", async () => {
        //When
        const onSend = jest.fn();
        customRender(jest.fn(), onSend);
        await userEvent.type(screen.getByRole("textbox"), "{enter}");

        // Then it sends a message
        expect(onSend).toBeCalledTimes(1);
    });

    it("Should not call onSend when Enter is pressed and ctrlEnterToSend is true", async () => {
        //When
        mockUseSettingsHook.useSettingValue.mockReturnValue(true);
        const onSend = jest.fn();
        customRender(jest.fn(), onSend);
        await userEvent.type(screen.getByRole("textbox"), "{enter}");

        // Then it does not send a message
        expect(onSend).toBeCalledTimes(0);
    });

    it("Should only call onSend when ctrl+enter is pressed if ctrlEnterToSend is true on windows", async () => {
        //When
        mockUseSettingsHook.useSettingValue.mockReturnValue(true);

        const onSend = jest.fn();
        customRender(jest.fn(), onSend);
        const textBox = screen.getByRole("textbox");
        await userEvent.type(textBox, "hello");

        // Then it does NOT send a message on enter
        await userEvent.type(textBox, "{enter}");
        expect(onSend).toBeCalledTimes(0);

        // Then it does NOT send a message on windows+enter
        await userEvent.type(textBox, "{meta>}{enter}{meta/}");
        expect(onSend).toBeCalledTimes(0);

        // Then it does send a message on ctrl+enter
        await userEvent.type(textBox, "{control>}{enter}{control/}");
        expect(onSend).toBeCalledTimes(1);
    });

    it("Should only call onSend when cmd+enter is pressed if ctrlEnterToSend is true on mac", async () => {
        //When
        mockUseSettingsHook.useSettingValue.mockReturnValue(true);
        mockKeyboard.IS_MAC = true;

        const onSend = jest.fn();
        customRender(jest.fn(), onSend);
        const textBox = screen.getByRole("textbox");
        await userEvent.type(textBox, "hello");

        // Then it does NOT send a message on enter
        await userEvent.type(textBox, "{enter}");
        expect(onSend).toBeCalledTimes(0);

        // Then it does NOT send a message on ctrl+enter
        await userEvent.type(textBox, "{control>}{enter}{control/}");
        expect(onSend).toBeCalledTimes(0);

        // Then it does send a message on cmd+enter
        await userEvent.type(textBox, "{meta>}{enter}{meta/}");
        expect(onSend).toBeCalledTimes(1);
    });

    it("Should insert a newline character when shift enter is pressed and ctrlEnterToSend is false", async () => {
        //When
        const onSend = jest.fn();
        customRender(jest.fn(), onSend);
        const textBox = screen.getByRole("textbox");
        const inputWithShiftEnter = "new{Shift>}{enter}{/Shift}line";
        const expectedInnerHtml = "new\nline";

        await userEvent.click(textBox);
        await userEvent.type(textBox, inputWithShiftEnter);

        // Then it does not send a message, but inserts a newline character
        expect(onSend).toBeCalledTimes(0);
        expect(textBox.innerHTML).toBe(expectedInnerHtml);
    });

    it("Should insert a newline character when shift enter is pressed and ctrlEnterToSend is true", async () => {
        //When
        mockUseSettingsHook.useSettingValue.mockReturnValue(true);
        const onSend = jest.fn();
        customRender(jest.fn(), onSend);
        const textBox = screen.getByRole("textbox");
        const keyboardInput = "new{Shift>}{enter}{/Shift}line";
        const expectedInnerHtml = "new\nline";

        await userEvent.click(textBox);
        await userEvent.type(textBox, keyboardInput);

        // Then it does not send a message, but inserts a newline character
        expect(onSend).toBeCalledTimes(0);
        expect(textBox.innerHTML).toBe(expectedInnerHtml);
    });

    it("Should not insert div and br tags when enter is pressed and ctrlEnterToSend is true", async () => {
        //When
        mockUseSettingsHook.useSettingValue.mockReturnValue(true);
        const onSend = jest.fn();
        customRender(jest.fn(), onSend);
        const textBox = screen.getByRole("textbox");
        const defaultEnterHtml = "<div><br></div";

        await userEvent.click(textBox);
        await userEvent.type(textBox, "{enter}");

        // Then it does not send a message, but inserts a newline character
        expect(onSend).toBeCalledTimes(0);
        expect(textBox).not.toContainHTML(defaultEnterHtml);
    });

    it("Should clear textbox content when clear is called", async () => {
        //When
        let composer;
        render(
            <PlainTextComposer onChange={jest.fn()} onSend={jest.fn()}>
                {(ref, composerFunctions) => {
                    composer = composerFunctions;
                    return null;
                }}
            </PlainTextComposer>,
        );
        await userEvent.type(screen.getByRole("textbox"), "content");
        expect(screen.getByRole("textbox").innerHTML).toBe("content");
        composer.clear();

        // Then
        expect(screen.getByRole("textbox").innerHTML).toBeFalsy();
    });

    it("Should have data-is-expanded when it has two lines", async () => {
        let resizeHandler: ResizeObserverCallback = jest.fn();
        let editor: Element | null = null;
        jest.spyOn(global, "ResizeObserver").mockImplementation((handler) => {
            resizeHandler = handler;
            return {
                observe: (element) => {
                    editor = element;
                },
                unobserve: jest.fn(),
                disconnect: jest.fn(),
            };
        });
        jest.spyOn(global, "requestAnimationFrame").mockImplementation((cb) => {
            cb(0);
            return 0;
        });

        //When
        render(<PlainTextComposer onChange={jest.fn()} onSend={jest.fn()} />);

        // Then
        expect(screen.getByTestId("WysiwygComposerEditor").attributes["data-is-expanded"].value).toBe("false");
        expect(editor).toBe(screen.getByRole("textbox"));

        // When
        resizeHandler(
            [{ contentBoxSize: [{ blockSize: 100 }] } as unknown as ResizeObserverEntry],
            {} as ResizeObserver,
        );
        jest.runAllTimers();

        // Then
        expect(screen.getByTestId("WysiwygComposerEditor").attributes["data-is-expanded"].value).toBe("true");

        (global.ResizeObserver as jest.Mock).mockRestore();
        (global.requestAnimationFrame as jest.Mock).mockRestore();
    });
});
