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
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActionState, AllActionStates, FormattingFunctions } from "@matrix-org/matrix-wysiwyg";

import { FormattingButtons } from "../../../../../../src/components/views/rooms/wysiwyg_composer/components/FormattingButtons";
import * as LinkModal from "../../../../../../src/components/views/rooms/wysiwyg_composer/components/LinkModal";

const mockWysiwyg = {
    bold: jest.fn(),
    italic: jest.fn(),
    underline: jest.fn(),
    strikeThrough: jest.fn(),
    inlineCode: jest.fn(),
    codeBlock: jest.fn(),
    link: jest.fn(),
    orderedList: jest.fn(),
    unorderedList: jest.fn(),
    quote: jest.fn(),
    indent: jest.fn(),
    unIndent: jest.fn(),
} as unknown as FormattingFunctions;

const createActionStates = (state: ActionState): AllActionStates => {
    return Object.fromEntries(
        [
            "bold",
            "italic",
            "underline",
            "strikeThrough",
            "inlineCode",
            "codeBlock",
            "link",
            "orderedList",
            "unorderedList",
            "quote",
        ].map((testKey) => [testKey, state]),
    ) as AllActionStates;
};

const defaultActionStates = createActionStates("enabled");

const renderComponent = (props = {}) => {
    return render(<FormattingButtons composer={mockWysiwyg} actionStates={defaultActionStates} {...props} />);
};

const classes = {
    active: "mx_FormattingButtons_active",
    hover: "mx_FormattingButtons_Button_hover",
    disabled: "mx_FormattingButtons_disabled",
};

describe("FormattingButtons", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe.each([
        { key: "bold", label: "Bold", mockFormatFn: () => mockWysiwyg.bold },
        { key: "italic", label: "Italic", mockFormatFn: () => mockWysiwyg.italic },
        { key: "underline", label: "Underline", mockFormatFn: () => mockWysiwyg.underline },
        { key: "strikeThrough", label: "Strikethrough", mockFormatFn: () => mockWysiwyg.strikeThrough },
        { key: "inlineCode", label: "Code", mockFormatFn: () => mockWysiwyg.inlineCode },
        { key: "codeBlock", label: "Code block", mockFormatFn: () => mockWysiwyg.inlineCode },
        { key: "link", label: "Link", mockFormatFn: () => jest.spyOn(LinkModal, "openLinkModal") },
        { key: "orderedList", label: "Numbered list", mockFormatFn: () => mockWysiwyg.orderedList },
        { key: "unorderedList", label: "Bulleted list", mockFormatFn: () => mockWysiwyg.unorderedList },
        { key: "quote", label: "Quote", mockFormatFn: () => mockWysiwyg.quote },
    ])("$label", ({ key, label, mockFormatFn }) => {
        afterEach(() => {
            cleanup();
        });

        it("Button should not have active class when enabled", () => {
            renderComponent();
            expect(screen.getByLabelText(label)).not.toHaveClass(classes.active);
        });

        it("Button should have active class when reversed", () => {
            const reversedActionStates = createActionStates("reversed");
            renderComponent({ actionStates: reversedActionStates });

            expect(screen.getByLabelText(label)).toHaveClass(classes.active);
        });

        it("Button should have disabled class when disabled", () => {
            const disabledActionStates = createActionStates("disabled");
            renderComponent({ actionStates: disabledActionStates });

            expect(screen.getByLabelText(label)).toHaveClass(classes.disabled);
        });

        it("Should call wysiwyg function on button click", async () => {
            const { getByLabelText } = renderComponent();

            const fn = mockFormatFn();
            getByLabelText(label).click();
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it("Button should display the tooltip on mouse over when not disabled", async () => {
            const { getByLabelText, getByText } = renderComponent();

            await userEvent.hover(getByLabelText(label));
            expect(getByText(label)).toBeInTheDocument();
        });

        it("Button should not display the tooltip on mouse over when disabled", async () => {
            const disabledActionStates = createActionStates("disabled");
            const { getByLabelText, queryByText } = renderComponent({ actionStates: disabledActionStates });

            await userEvent.hover(getByLabelText(label));
            expect(queryByText(label)).not.toBeInTheDocument();
        });

        it("Button should have hover style when hovered and enabled", async () => {
            const { getByLabelText } = renderComponent();

            await userEvent.hover(getByLabelText(label));
            expect(getByLabelText(label)).toHaveClass("mx_FormattingButtons_Button_hover");
        });

        it("Button should not have hover style when hovered and reversed", async () => {
            const reversedActionStates = createActionStates("reversed");
            const { getByLabelText } = renderComponent({ actionStates: reversedActionStates });

            await userEvent.hover(getByLabelText(label));
            expect(getByLabelText(label)).not.toHaveClass("mx_FormattingButtons_Button_hover");
        });

        it("Does not show indent or unindent button when outside a list", () => {
            renderComponent();

            expect(screen.queryByLabelText("Indent increase")).not.toBeInTheDocument();
            expect(screen.queryByLabelText("Indent decrease")).not.toBeInTheDocument();
        });

        it("Shows indent and unindent buttons when either a single list type is 'reversed'", () => {
            const orderedListActive = { ...defaultActionStates, orderedList: "reversed" };
            renderComponent({ actionStates: orderedListActive });

            expect(screen.getByLabelText("Indent increase")).toBeInTheDocument();
            expect(screen.getByLabelText("Indent decrease")).toBeInTheDocument();

            cleanup();

            const unorderedListActive = { ...defaultActionStates, unorderedList: "reversed" };

            renderComponent({ actionStates: unorderedListActive });

            expect(screen.getByLabelText("Indent increase")).toBeInTheDocument();
            expect(screen.getByLabelText("Indent decrease")).toBeInTheDocument();
        });
    });
});
