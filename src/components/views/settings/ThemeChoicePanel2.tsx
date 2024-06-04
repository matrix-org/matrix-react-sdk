/*
 * Copyright 2024 The Matrix.org Foundation C.I.C.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { Dispatch, JSX, useRef, useState } from "react";
import { InlineField, ToggleControl, Label, Root, RadioControl } from "@vector-im/compound-web";
import classNames from "classnames";

import { _t } from "../../../languageHandler";
import SettingsSubsection from "./shared/SettingsSubsection";
import ThemeWatcher from "../../../settings/watchers/ThemeWatcher";
import SettingsStore from "../../../settings/SettingsStore";
import { SettingLevel } from "../../../settings/SettingLevel";
import dis from "../../../dispatcher/dispatcher";
import { RecheckThemePayload } from "../../../dispatcher/payloads/RecheckThemePayload";
import { Action } from "../../../dispatcher/actions";
import { useTheme } from "../../../hooks/useTheme";
import { getOrderedThemes } from "../../../theme";

export function ThemeChoicePanel(): JSX.Element {
    const [themeState, setThemeState] = useThemeState();
    const themeWatcher = useRef(new ThemeWatcher());

    return (
        <SettingsSubsection heading={_t("common|theme")} newUi={true}>
            {themeWatcher.current.isSystemThemeSupported() && (
                <SystemTheme
                    systemThemeActivated={themeState.systemThemeActivated}
                    onChange={(systemThemeActivated) =>
                        setThemeState((_themeState) => ({ ..._themeState, systemThemeActivated }))
                    }
                />
            )}
            <ThemeSelectors theme={themeState.theme} />
        </SettingsSubsection>
    );
}

/**
 * Interface for the theme state
 */
interface ThemeState {
    /* The theme */
    theme: string;
    /* Whether the system theme is activated */
    systemThemeActivated: boolean;
}

/**
 * Hook to fetch the value of the theme and dynamically update when it changes
 */
function useThemeState(): [ThemeState, Dispatch<React.SetStateAction<ThemeState>>] {
    const theme = useTheme();
    const [themeState, setThemeState] = useState(theme);

    return [themeState, setThemeState];
}

/**
 * Component to toggle the system theme
 */
interface SystemThemeProps {
    /* Whether the system theme is activated */
    systemThemeActivated: boolean;
    /* Callback when the system theme is toggled */
    onChange: (systemThemeActivated: boolean) => void;
}

/**
 * Component to toggle the system theme
 */
function SystemTheme({ systemThemeActivated, onChange }: SystemThemeProps): JSX.Element {
    return (
        <Root
            onChange={async (evt) => {
                // Needed to be able to have access to the `checked` attribute
                if (evt.target instanceof HTMLInputElement) {
                    const { checked } = evt.target;
                    onChange(checked);
                    await SettingsStore.setValue("use_system_theme", null, SettingLevel.DEVICE, checked);
                    dis.dispatch<RecheckThemePayload>({ action: Action.RecheckTheme });
                }
            }}
        >
            <InlineField
                name="systemTheme"
                control={<ToggleControl name="systemTheme" defaultChecked={systemThemeActivated} />}
            >
                <Label>{SettingsStore.getDisplayName("use_system_theme")}</Label>
            </InlineField>
        </Root>
    );
}

/**
 * Component to select the theme
 */
interface ThemeSelectorProps {
    /* The current theme */
    theme: string;
}

/**
 * Component to select the theme
 */
function ThemeSelectors({ theme }: ThemeSelectorProps): JSX.Element {
    const orderedThemes = useRef(getOrderedThemes());

    return (
        <Root className="mx_ThemeChoicePanel_ThemeSelectors">
            {orderedThemes.current.map((_theme) => (
                <InlineField
                    className={classNames(
                        "mx_ThemeChoicePanel_themeSelector",
                        `mx_ThemeChoicePanel_themeSelector_${_theme.id}`,
                    )}
                    name="themeSelector"
                    key={_theme.id}
                    control={<RadioControl defaultChecked={theme === _theme.id} disabled={false} />}
                >
                    <Label className="mx_ThemeChoicePanel_themeSelector_Label">{_theme.name}</Label>
                </InlineField>
            ))}
        </Root>
    );
}
