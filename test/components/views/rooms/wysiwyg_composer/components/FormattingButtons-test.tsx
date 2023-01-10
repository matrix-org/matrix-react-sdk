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
import { AllActionStates, FormattingFunctions } from "@matrix-org/matrix-wysiwyg";

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

const testCases = {
    bold: { label: "Bold", formatFunction: mockWysiwyg.bold },
    italic: { label: "Italic", formatFunction: mockWysiwyg.italic },
    underline: { label: "Underline", formatFunction: mockWysiwyg.underline },
    strikeThrough: { label: "Strikethrough", formatFunction: mockWysiwyg.strikeThrough },
    inlineCode: { label: "Code", formatFunction: mockWysiwyg.inlineCode },
    link: { label: "Link", formatFunction: openLinkModalSpy },
    orderedList: { label: "Bulleted list", formatFunction: mockWysiwyg.orderedList },
    unorderedList: { label: "Numbered list", formatFunction: mockWysiwyg.unorderedList },
};

const createActionStates = (state: string): AllActionStates => {
    return Object.fromEntries(Object.keys(testCases).map((testKey) => [testKey, state])) as AllActionStates;
};

const defaultActionStates = createActionStates("enabled");

const actionStates = {
    bold: "reversed",
    italic: "reversed",
    underline: "enabled",
    strikeThrough: "enabled",
    inlineCode: "enabled",
    link: "enabled",
    orderedList: "enabled",
    unorderedList: "enabled",
} as AllActionStates;

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

        Object.values(testCases).forEach(({ label }) => {
            expect(screen.getByLabelText(label)).toHaveClass(classes.active);
        });
    });

    // it("Should call wysiwyg function on button click", () => {
    //     renderComponent();

    //     // Object.values(omit(testCases, ["orderedList", "unorderedList"])).forEach(({ label, formatFunction }) => {
    //     //     screen.getByLabelText(label).click();
    //     //     expect(formatFunction).toHaveBeenCalledTimes(1);
    //     // });
    //     const thing1 = screen.getByLabelText("Bold");
    //     thing1.click();
    //     expect(mockWysiwyg.bold).toHaveBeenCalledTimes(1);
    //     const thing2 = screen.getByLabelText("Numbered list");
    //     thing2.click();
    //     thing2.click();
    //     screen.debug();
    //     expect(mockWysiwyg.unorderedList).toHaveBeenCalledTimes(1);
    // });

    // for some reason the above does not work despite looking identical...
    it("Should call wysiwyg function on button click", () => {
        // When
        const spy = jest.spyOn(LinkModal, "openLinkModal");
        render(<FormattingButtons composer={mockWysiwyg} actionStates={actionStates} />);
        screen.getByLabelText("Bold").click();
        screen.getByLabelText("Italic").click();
        screen.getByLabelText("Underline").click();
        screen.getByLabelText("Strikethrough").click();
        screen.getByLabelText("Code").click();
        screen.getByLabelText("Link").click();
        screen.getByLabelText("Bulleted list").click();
        screen.getByLabelText("Numbered list").click();

        // Then
        expect(mockWysiwyg.bold).toHaveBeenCalledTimes(1);
        expect(mockWysiwyg.italic).toHaveBeenCalledTimes(1);
        expect(mockWysiwyg.underline).toHaveBeenCalledTimes(1);
        expect(mockWysiwyg.strikeThrough).toHaveBeenCalledTimes(1);
        expect(mockWysiwyg.inlineCode).toHaveBeenCalledTimes(1);
        expect(mockWysiwyg.orderedList).toHaveBeenCalledTimes(1);
        expect(mockWysiwyg.unorderedList).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it("Each button should display the tooltip on mouse over", async () => {
        renderComponent();

        for (const testKey in testCases) {
            const { label } = testCases[testKey];

            await userEvent.hover(screen.getByLabelText(label));
            expect(await screen.findByText(label)).toBeTruthy();
        }
    });

    it("Each button should have hover style when hovered and enabled", async () => {
        renderComponent();

        for (const testKey in testCases) {
            const { label } = testCases[testKey];

            await userEvent.hover(screen.getByLabelText(label));
            expect(await screen.findByLabelText(label)).toHaveClass("mx_FormattingButtons_Button_hover");
        }
    });

    it("Each button should not have hover style when hovered and reversed", async () => {
        const reversedActionStates = createActionStates("reversed");
        renderComponent({ actionStates: reversedActionStates });

        for (const testKey in testCases) {
            const { label } = testCases[testKey];

            await userEvent.hover(screen.getByLabelText(label));
            expect(await screen.findByLabelText(label)).not.toHaveClass("mx_FormattingButtons_Button_hover");
        }
    });
});
