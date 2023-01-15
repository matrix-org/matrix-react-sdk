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
import { ActionState, ActionTypes, AllActionStates, FormattingFunctions } from "@matrix-org/matrix-wysiwyg";

import { FormattingButtons } from "../../../../../../src/components/views/rooms/wysiwyg_composer/components/FormattingButtons";
import * as LinkModal from "../../../../../../src/components/views/rooms/wysiwyg_composer/components/LinkModal";

const mockWysiwyg = {
    bold: jest.fn(),
    italic: jest.fn(),
    underline: jest.fn(),
    strikeThrough: jest.fn(),
    inlineCode: jest.fn(),
    link: jest.fn(),
    orderedList: jest.fn(),
    unorderedList: jest.fn(),
} as unknown as FormattingFunctions;

const openLinkModalSpy = jest.spyOn(LinkModal, "openLinkModal");

const testCases: Record<
    Exclude<ActionTypes, "undo" | "redo" | "clear">,
    { label: string; mockFormatFn: jest.Func | jest.SpyInstance }
> = {
    bold: { label: "Bold", mockFormatFn: mockWysiwyg.bold },
    italic: { label: "Italic", mockFormatFn: mockWysiwyg.italic },
    underline: { label: "Underline", mockFormatFn: mockWysiwyg.underline },
    strikeThrough: { label: "Strikethrough", mockFormatFn: mockWysiwyg.strikeThrough },
    inlineCode: { label: "Code", mockFormatFn: mockWysiwyg.inlineCode },
    link: { label: "Link", mockFormatFn: openLinkModalSpy },
    orderedList: { label: "Numbered list", mockFormatFn: mockWysiwyg.orderedList },
    unorderedList: { label: "Bulleted list", mockFormatFn: mockWysiwyg.unorderedList },
};

const createActionStates = (state: ActionState): AllActionStates => {
    return Object.fromEntries(Object.keys(testCases).map((testKey) => [testKey, state])) as AllActionStates;
};

const defaultActionStates = createActionStates("enabled");

const renderComponent = (props = {}) => {
    return render(<FormattingButtons composer={mockWysiwyg} actionStates={defaultActionStates} {...props} />);
};

const classes = {
    active: "mx_FormattingButtons_active",
    hover: "mx_FormattingButtons_Button_hover",
};

describe("FormattingButtons", () => {
    afterEach(() => {
        jest.resetAllMocks();
    });

    it("Each button should not have active class when enabled", () => {
        renderComponent();

        Object.values(testCases).forEach(({ label }) => {
            expect(screen.getByLabelText(label)).not.toHaveClass(classes.active);
        });
    });

    it("Each button should have active class when reversed", () => {
        const reversedActionStates = createActionStates("reversed");
        renderComponent({ actionStates: reversedActionStates });

        Object.values(testCases).forEach((testCase) => {
            const { label } = testCase;
            expect(screen.getByLabelText(label)).toHaveClass(classes.active);
        });
    });

    it("Should call wysiwyg function on button click", async () => {
        renderComponent();

        for (const testCase of Object.values(testCases)) {
            const { label, mockFormatFn } = testCase;

            screen.getByLabelText(label).click();
            expect(mockFormatFn).toHaveBeenCalledTimes(1);
        }
    });

    it("Each button should display the tooltip on mouse over", async () => {
        renderComponent();

        for (const testCase of Object.values(testCases)) {
            const { label } = testCase;

            await userEvent.hover(screen.getByLabelText(label));
            expect(await screen.findByText(label)).toBeTruthy();
        }
    });

    it("Each button should have hover style when hovered and enabled", async () => {
        renderComponent();

        for (const testCase of Object.values(testCases)) {
            const { label } = testCase;

            await userEvent.hover(screen.getByLabelText(label));
            expect(screen.getByLabelText(label)).toHaveClass("mx_FormattingButtons_Button_hover");
        }
    });

    it("Each button should not have hover style when hovered and reversed", async () => {
        const reversedActionStates = createActionStates("reversed");
        renderComponent({ actionStates: reversedActionStates });

        for (const testCase of Object.values(testCases)) {
            const { label } = testCase;

            await userEvent.hover(screen.getByLabelText(label));
            expect(screen.getByLabelText(label)).not.toHaveClass("mx_FormattingButtons_Button_hover");
        }
    });
});
