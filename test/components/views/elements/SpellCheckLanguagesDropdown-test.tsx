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
import { render, screen, waitForElementToBeRemoved } from "@testing-library/react";

import SpellCheckLanguagesDropdown from "../../../../src/components/views/elements/SpellCheckLanguagesDropdown";
import PlatformPeg from "../../../../src/PlatformPeg";

describe("<SpellCheckLanguagesDropdown />", () => {
    it("renders as expected", async () => {
        const platform: any = { getAvailableSpellCheckLanguages: jest.fn().mockResolvedValue(["en", "de", "qq"]) };
        PlatformPeg.set(platform);

        const { asFragment } = render(
            <SpellCheckLanguagesDropdown
                className="mx_GeneralUserSettingsTab_spellCheckLanguageInput"
                value="en"
                onOptionChange={jest.fn()}
            />,
        );
        await waitForElementToBeRemoved(() => screen.queryAllByLabelText("Loading…"));
        expect(asFragment()).toMatchSnapshot();
    });
});
