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
import { act, render, screen } from "@testing-library/react";
import { mocked, MockedObject } from "jest-mock";

import { ThemeChoicePanel } from "../../../../src/components/views/settings/ThemeChoicePanel";
import SettingsStore from "../../../../src/settings/SettingsStore";
import ThemeWatcher from "../../../../src/settings/watchers/ThemeWatcher";

jest.mock("../../../../src/settings/watchers/ThemeWatcher");

describe("<ThemeChoicePanel />", () => {
    beforeEach(() => {
        mocked(ThemeWatcher).mockImplementation(() => {
            return {
                isSystemThemeSupported: jest.fn().mockReturnValue(true),
            } as unknown as MockedObject<ThemeWatcher>;
        });
    });

    it("renders the theme choice UI", () => {
        const { asFragment } = render(<ThemeChoicePanel />);
        expect(asFragment()).toMatchSnapshot();
    });

    describe("theme selection", () => {
        /**
         * Enable or disable the system theme
         * @param enable
         */
        function enableSystemTheme(enable: boolean) {
            jest.spyOn(SettingsStore, "getValueAt").mockImplementation((level, settingName) => {
                if (settingName === "use_system_theme") return enable;
            });
        }

        beforeEach(() => {
            jest.spyOn(SettingsStore, "getValue").mockRestore();
        });

        describe("system theme", () => {
            it("should disable Match system theme", () => {
                enableSystemTheme(false);

                render(<ThemeChoicePanel />);
                expect(screen.getByRole("checkbox", { name: "Match system theme" })).not.toBeChecked();
            });

            it("should enable Match system theme", () => {
                enableSystemTheme(true);

                render(<ThemeChoicePanel />);
                expect(screen.getByRole("checkbox", { name: "Match system theme" })).toBeChecked();
            });

            it("should change the system theme when clicked", () => {
                jest.spyOn(SettingsStore, "setValue");
                enableSystemTheme(false);

                render(<ThemeChoicePanel />);
                act(() => screen.getByRole("checkbox", { name: "Match system theme" }).click());

                // The system theme should be enabled
                expect(screen.getByRole("checkbox", { name: "Match system theme" })).toBeChecked();
                expect(SettingsStore.setValue).toHaveBeenCalledWith("use_system_theme", null, "device", true);
            });
        });

        describe("theme selection", () => {
            it("should disable theme selection when system theme is enabled", () => {
                enableSystemTheme(true);
                render(<ThemeChoicePanel />);

                // We expect all the themes to be disabled
                const themes = screen.getAllByRole("radio");
                themes.forEach((theme) => {
                    expect(theme).toBeDisabled();
                });
            });

            it("should enable theme selection when system theme is disabled", () => {
                enableSystemTheme(false);
                render(<ThemeChoicePanel />);

                // We expect all the themes to be disabled
                const themes = screen.getAllByRole("radio");
                themes.forEach((theme) => {
                    expect(theme).not.toBeDisabled();
                });
            });

            it("should have light theme selected", () => {
                jest.spyOn(SettingsStore, "getValueAt").mockImplementation((level, settingName) => {
                    if (settingName === "theme") return "light";
                });

                render(<ThemeChoicePanel />);

                // We expect the light theme to be selected
                const lightTheme = screen.getByRole("radio", { name: "Light" });
                expect(lightTheme).toBeChecked();

                // And the dark theme shouldn't be selected
                const darkTheme = screen.getByRole("radio", { name: "Dark" });
                expect(darkTheme).not.toBeChecked();
            });

            it("should switch to dark theme", () => {
                jest.spyOn(SettingsStore, "setValue");
                jest.spyOn(SettingsStore, "getValueAt").mockImplementation((level, settingName) => {
                    if (settingName === "theme") return "light";
                });

                render(<ThemeChoicePanel />);

                const darkTheme = screen.getByRole("radio", { name: "Dark" });
                const lightTheme = screen.getByRole("radio", { name: "Light" });
                expect(darkTheme).not.toBeChecked();

                // Switch to the dark theme
                act(() => darkTheme.click());
                // Dark theme is now selected
                expect(darkTheme).toBeChecked();
                // Light theme is not selected anymore
                expect(lightTheme).not.toBeChecked();
                // The setting should be updated
                expect(SettingsStore.setValue).toHaveBeenCalledWith("theme", null, "device", "dark");
            });
        });
    });

    describe("custom theme", () => {});
});
