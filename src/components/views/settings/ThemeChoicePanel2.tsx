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
import { findHighContrastTheme, getOrderedThemes } from "../../../theme";

/**
 * Interface for the theme state
 */
interface ThemeState {
    /* The theme */
    theme: string;
    /* The apparent selected theme */
    apparentSelectedTheme?: string;
    /* Whether the system theme is activated */
    systemThemeActivated: boolean;
}

/**
 * Hook to fetch the value of the theme and dynamically update when it changes
 */
function useThemeState(): [ThemeState, Dispatch<React.SetStateAction<ThemeState>>] {
    const theme = useTheme();
    const [themeState, setThemeState] = useState<ThemeState>(theme);

    return [themeState, setThemeState];
}

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
            <ThemeSelectors
                theme={themeState.theme}
                onChange={(theme) => setThemeState((_themeState) => ({ ..._themeState, theme }))}
            />
        </SettingsSubsection>
    );
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
                const checked = new FormData(evt.currentTarget).get("systemTheme") === "on";
                onChange(checked);
                await SettingsStore.setValue("use_system_theme", null, SettingLevel.DEVICE, checked);
                dis.dispatch<RecheckThemePayload>({ action: Action.RecheckTheme });
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
    /* Callback when the theme is changed */
    onChange: (theme: string) => void;
}

/**
 * Component to select the theme
 */
function ThemeSelectors({ theme, onChange }: ThemeSelectorProps): JSX.Element {
    const orderedThemes = useRef(getThemes());

    return (
        <Root
            className="mx_ThemeChoicePanel_ThemeSelectors"
            onChange={async (evt) => {
                // We don't have any file in the form, we can cast it as string safely
                const newTheme = new FormData(evt.currentTarget).get("themeSelector") as string | null;

                // Do nothing if the same theme is selected
                if (!newTheme || theme === newTheme) return;

                // doing getValue in the .catch will still return the value we failed to set,
                // so remember what the value was before we tried to set it so we can revert
                const oldTheme = SettingsStore.getValue<string>("theme");
                SettingsStore.setValue("theme", null, SettingLevel.DEVICE, newTheme).catch(() => {
                    dis.dispatch<RecheckThemePayload>({ action: Action.RecheckTheme });
                    onChange(oldTheme);
                });

                onChange(newTheme);
                // The settings watcher doesn't fire until the echo comes back from the
                // server, so to make the theme change immediately we need to manually
                // do the dispatch now
                // XXX: The local echoed value appears to be unreliable, in particular
                // when settings custom themes(!) so adding forceTheme to override
                // the value from settings.
                dis.dispatch<RecheckThemePayload>({ action: Action.RecheckTheme, forceTheme: newTheme });
            }}
        >
            {orderedThemes.current.map((_theme) => (
                <InlineField
                    className={classNames("mx_ThemeChoicePanel_themeSelector", {
                        [`mx_ThemeChoicePanel_themeSelector_enabled`]: theme === _theme.id,
                        // We need to force the compound theme to be light or dark
                        // The theme selection doesn't depend on the current theme
                        // For example when the light theme is used, the dark theme selector should be dark
                        "cpd-theme-light": _theme.id.includes("light"),
                        "cpd-theme-dark": _theme.id.includes("dark"),
                    })}
                    name="themeSelector"
                    key={_theme.id}
                    control={
                        <RadioControl
                            name="themeSelector"
                            defaultChecked={theme === _theme.id}
                            disabled={false}
                            value={_theme.id}
                        />
                    }
                >
                    <Label className="mx_ThemeChoicePanel_themeSelector_Label">{_theme.name}</Label>
                </InlineField>
            ))}
        </Root>
    );
}

/**
 * Get the themes
 * @returns The themes
 */
function getThemes(): ReturnType<typeof getOrderedThemes> {
    const themes = getOrderedThemes();

    // Currently only light theme has a high contrast theme
    const lightHighContrastId = findHighContrastTheme("light");
    if (lightHighContrastId) {
        const lightHighContrast = {
            name: _t("settings|appearance|high_contrast"),
            id: lightHighContrastId,
        };
        themes.push(lightHighContrast);
    }

    return themes;
}
