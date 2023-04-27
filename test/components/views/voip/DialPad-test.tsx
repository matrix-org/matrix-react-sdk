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

import React from "react";
import { render, screen } from "@testing-library/react";

import DialPad, { BUTTONS, BUTTON_LETTERS } from "../../../../src/components/views/voip/DialPad";

it("displays all of the buttons and the associated letters", () => {
    render(<DialPad onDigitPress={jest.fn()} hasDial={false} />);

    // check that we have the expected number of buttons
    expect(screen.getAllByRole("button")).toHaveLength(BUTTONS.length);

    // BUTTONS represents the numbers and symbols
    BUTTONS.forEach((button) => {
        expect(screen.getByText(button)).toBeInTheDocument();
    });

    // BUTTON_LETTERS represents the `ABC` type strings you see on the keypad, but also contains
    // some empty strings, so we filter them out prior to tests
    BUTTON_LETTERS.filter(Boolean).forEach((letterSet) => {
        expect(screen.getByText(letterSet)).toBeInTheDocument();
    });
});
