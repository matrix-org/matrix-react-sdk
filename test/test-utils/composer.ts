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

// eslint-disable-next-line deprecate/import
import { ReactWrapper } from "enzyme";
import { act } from "react-dom/test-utils";
import { fireEvent } from "@testing-library/react";

export const addTextToComposer = (container: HTMLElement, text: string) =>
    act(() => {
        // couldn't get input event on contenteditable to work
        // paste works without illegal private method access
        const pasteEvent = {
            clipboardData: {
                types: [],
                files: [],
                getData: (type) => (type === "text/plain" ? text : undefined),
            },
        };
        fireEvent.paste(container.querySelector('[role="textbox"]'), pasteEvent);
    });

export const addTextToComposerEnzyme = (wrapper: ReactWrapper, text: string) =>
    act(() => {
        // couldn't get input event on contenteditable to work
        // paste works without illegal private method access
        const pasteEvent = {
            clipboardData: {
                types: [],
                files: [],
                getData: (type) => (type === "text/plain" ? text : undefined),
            },
        };
        wrapper.find('[role="textbox"]').simulate("paste", pasteEvent);
        wrapper.update();
    });
