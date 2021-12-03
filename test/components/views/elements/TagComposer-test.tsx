
// skinned-sdk should be the first import in most tests
import '../../../skinned-sdk';
import React from "react";
import {
    renderIntoDocument,
    findRenderedDOMComponentWithTag,
    Simulate,
    scryRenderedDOMComponentsWithClass,
} from 'react-dom/test-utils';
import { act } from "react-dom/test-utils";

import TagComposer from "../../../../src/components/views/elements/TagComposer";

describe("<TagComposer />", () => {
    const defaultProps = {
        tags: [],
        onAdd: jest.fn(),
        onRemove: jest.fn(),
    };
    const getComponent = (props = {}) => renderIntoDocument<React.Component>(
        <TagComposer {...defaultProps} {...props} />,
    ) as React.Component;

    const getForm = container => findRenderedDOMComponentWithTag(container, 'form');
    const getInput = container => {
        const form = getForm(container);
        return form.querySelector('input');
    };

    const getAddButton = container => {
        const form = getForm(container);
        return form.querySelector('[role=button]');
    };

    const editNewTag = async (container, value: string) => act(async () => {
        const input = getInput(container);
        Simulate.change(input, { target: { value } as unknown as EventTarget });
    });

    const submitForm = async (container) => act(async () => {
        const form = getForm(container);
        Simulate.submit(form);
    });

    // Field component debounces validate on change
    // jest@26 fake timers and lodash debounce are not friends
    // blur input to trigger a validation
    const blurInput = async (container) => act(async () => {
        const input = getInput(container);
        Simulate.blur(input);
    });

    const clickAddNewTag = async (container) => act(async () => {
        Simulate.click(getAddButton(container));
    });

    it('renders tags', () => {
        const tags = ['tag 1', 'tag 2'];
        const container = getComponent({ tags });

        const tagElements = scryRenderedDOMComponentsWithClass(container, 'mx_TagComposer_tag');
        expect(tagElements).toMatchSnapshot();
    });

    it('removes tags on remove button click', () => {
        const tags = ['tag 1', 'tag 2'];
        const onRemove = jest.fn();
        const container = getComponent({ tags, onRemove });

        const [tag1] = scryRenderedDOMComponentsWithClass(container, 'mx_TagComposer_tag');
        act(() => {
            Simulate.click(tag1.querySelector('[role=button]'));
        });
        expect(onRemove).toHaveBeenCalledWith('tag 1');
    });

    describe('form', () => {
        it('renders form', () => {
            const container = getComponent();

            const input = getInput(container);
            const addButton = getAddButton(container);

            expect(input).toBeTruthy();
            expect(addButton).toBeTruthy();
        });

        it('adds new tag when there is no validation', async () => {
            const onAdd = jest.fn();
            const container = getComponent({ onAdd });
            const newKeyword = "new keyword";

            await editNewTag(container, newKeyword);
            const input = getInput(container);
            expect(input.value).toEqual(newKeyword);

            await blurInput(container);

            await clickAddNewTag(container);

            expect(onAdd).toHaveBeenCalledWith(newKeyword);

            // clears input
            expect(input.value).toEqual("");
        });

        it('does not add tag with zero length', async () => {
            const onAdd = jest.fn();
            const container = getComponent({ onAdd });

            await editNewTag(container, "");
            await blurInput(container);

            await clickAddNewTag(container);

            expect(onAdd).not.toHaveBeenCalled();
        });

        describe('with validation', () => {
            it('adds tag on add button click when validation passes', async () => {
                const onAdd = jest.fn();
                const onValidate = jest.fn().mockResolvedValue({ valid: true });
                const container = getComponent({ onAdd, onValidate });
                const newKeyword = "new keyword";

                await editNewTag(container, newKeyword);
                await blurInput(container);

                await clickAddNewTag(container);

                expect(onAdd).toHaveBeenCalledWith(newKeyword);
            });

            it('disables add button when validation fails', async () => {
                const onAdd = jest.fn();
                const onValidate = jest.fn().mockResolvedValue({ valid: false });
                const container = getComponent({ onAdd, onValidate });
                const newKeyword = "new keyword";

                await editNewTag(container, newKeyword);
                await blurInput(container);

                expect(getAddButton(container).className.includes('mx_AccessibleButton_disabled')).toBeTruthy();
            });

            it('disables form submission when validation fails', async () => {
                const onAdd = jest.fn();
                const onValidate = jest.fn().mockResolvedValue({ valid: false });
                const container = getComponent({ onAdd, onValidate });
                const newKeyword = "new keyword";

                await editNewTag(container, newKeyword);
                await blurInput(container);
                await submitForm(container);
                expect(onAdd).not.toHaveBeenCalled();
            });
        });
    });
});
