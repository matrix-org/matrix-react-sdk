/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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
import { fireEvent, render, screen } from "@testing-library/react";

import * as TestUtils from "../../../test-utils";
import FontScalingPanel from "../../../../src/components/views/settings/FontScalingPanel";
import SettingsStore from "../../../../src/settings/SettingsStore";

describe("FontScalingPanel", () => {
    afterEach(() => {
        jest.resetAllMocks();
    });
    it("renders the font scaling UI", () => {
        TestUtils.stubClient();
        const { asFragment } = render(<FontScalingPanel />);
        expect(asFragment()).toMatchSnapshot();
    });

    it("updates the font size", () => {
        jest.spyOn(SettingsStore, "setValue");
        TestUtils.stubClient();
        render(<FontScalingPanel />);

        const slider = screen.getByLabelText("Font size");

        fireEvent.change(slider, { target: { value: 19 } });

        expect(SettingsStore.setValue).toHaveBeenCalledWith("baseFontSizeV2", null, "device", 19);

        expect(screen.getByLabelText("Font size")).toHaveValue("19");
    });
});
