
/*
Copyright 2022 Šimon Brandner <simon.bra.ag@gmail.com>

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
import { mount, ReactWrapper } from "enzyme";

import { Key } from "../../../../../../src/Keyboard";
import KeyboardUserSettingsTab, {
    mockVisibleCategories,
} from "../../../../../../src/components/views/settings/tabs/user/KeyboardUserSettingsTab";
import PlatformPeg from "../../../../../../src/PlatformPeg";
import SettingsStore from "../../../../../../src/settings/SettingsStore";

const renderKeyboardUserSettingsTab = (): ReactWrapper => {
    return mount(<KeyboardUserSettingsTab />);
};

describe("KeyboardUserSettingsTab", () => {
    it("renders list of keyboard shortcuts", async () => {
        PlatformPeg.get = () => ({ overrideBrowserShortcuts: () => false });
        mockVisibleCategories([
            ["Composer", {
                settingNames: ["keybind1", "keybind2"],
                categoryLabel: "Composer",
            }],
            ["Navigation", {
                settingNames: ["keybind3"],
                categoryLabel: "Navigation",
            }],
        ]);
        SettingsStore.getValue = jest.fn().mockImplementation((name) => {
            switch (name) {
                case "feature_customizable_keybindings":
                    return true;
                case "keybind1":
                    return {
                        key: Key.A,
                        ctrlKey: true,
                    };
                case "keybind2": {
                    return {
                        key: Key.B,
                        ctrlKey: true };
                }
                case "keybind3": {
                    return {
                        key: Key.ENTER,
                    };
                }
            }
        });
        SettingsStore.getDisplayName = jest.fn().mockImplementation((name) => {
            switch (name) {
                case "keybind1":
                    return "Cancel replying to a message";
                case "keybind2":
                    return "Toggle Bold";
                case "keybind3":
                    return "Select room from the room list";
            }
        });
        SettingsStore.isEnabled = jest.fn().mockReturnValue(true);

        const body = await renderKeyboardUserSettingsTab();
        expect(body).toMatchSnapshot();
    });
});
