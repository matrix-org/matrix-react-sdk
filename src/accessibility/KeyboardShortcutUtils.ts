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

import { KeyCombo } from "../KeyBindingsManager";
import { isMac, Key } from "../Keyboard";
import { _t, _td } from "../languageHandler";
import PlatformPeg from "../PlatformPeg";
import SettingsStore from "../settings/SettingsStore";
import {
    DESKTOP_SHORTCUTS,
    DIGITS,
    IKeyboardShortcuts,
    KeyBindingAction,
    MAC_ONLY_SHORTCUTS,
} from "./KeyboardShortcuts";

const isShortcutEnabled = (name): boolean => {
    const overrideBrowserShortcuts = PlatformPeg.get().overrideBrowserShortcuts();

    if (!SettingsStore.isEnabled(name)) return false;
    if (MAC_ONLY_SHORTCUTS.includes(name) && !isMac) return false;
    if (DESKTOP_SHORTCUTS.includes(name) && !overrideBrowserShortcuts) return false;

    return true;
};

/**
 * This function gets the keyboard shortcuts that should be presented in the UI
 * but they shouldn't be consumed by KeyBindingDefaults. That means that these
 * have to be manually mirrored in KeyBindingDefaults.
 */
const getUIOnlyShortcuts = (): IKeyboardShortcuts => {
    const ctrlEnterToSend = SettingsStore.getValue('MessageComposerInput.ctrlEnterToSend');

    const keyboardShortcuts: IKeyboardShortcuts = {
        [KeyBindingAction.SendMessage]: {
            default: {
                key: Key.ENTER,
                ctrlOrCmdKey: ctrlEnterToSend,
            },
            displayName: _td("Send message"),
            hideEditUI: true,
        },
        [KeyBindingAction.NewLine]: {
            default: {
                key: Key.ENTER,
                shiftKey: !ctrlEnterToSend,
            },
            displayName: _td("New line"),
            hideEditUI: true,
        },
        [KeyBindingAction.CompleteAutocomplete]: {
            default: {
                key: Key.ENTER,
            },
            displayName: _td("Complete"),
            hideEditUI: true,
        },
        [KeyBindingAction.ForceCompleteAutocomplete]: {
            default: {
                key: Key.TAB,
            },
            displayName: _td("Force complete"),
            hideEditUI: true,
        },
        [KeyBindingAction.SearchInRoom]: {
            default: {
                ctrlOrCmdKey: true,
                key: Key.F,
            },
            displayName: _td("Search (must be enabled)"),
            hideEditUI: true,
        },
    };

    if (PlatformPeg.get().overrideBrowserShortcuts()) {
        // XXX: This keyboard shortcut isn't manually added to
        // KeyBindingDefaults as it can't be easily handled by the
        // KeyBindingManager
        keyboardShortcuts[KeyBindingAction.SwitchToSpaceByNumber] = {
            default: {
                ctrlOrCmdKey: true,
                key: DIGITS,
            },
            displayName: _td("Switch to space by number"),
            hideEditUI: true,
        };
    }

    return keyboardShortcuts;
};

export const getKeyboardShortcutValue = (name: string, fallbackToUIOnly = true): KeyCombo | null => {
    if (!isShortcutEnabled(name)) return null;

    try {
        return SettingsStore.getValue("feature_customizable_keybindings")
            ? SettingsStore.getValue(name)
            : SettingsStore.getDefaultValue(name);
    } catch (error) {
        if (!fallbackToUIOnly) return null;
        return getUIOnlyShortcuts()[name]?.default;
    }
};

export const getKeyboardShortcutDisplayName = (name: string): string | null => {
    if (!isShortcutEnabled(name)) return null;

    const keyboardShortcutDisplayName = SettingsStore.getDisplayName(name) ?? getUIOnlyShortcuts()[name]?.displayName;
    return keyboardShortcutDisplayName && _t(keyboardShortcutDisplayName);
};

export const getKeyboardShortcutHideEditUI = (name: string): boolean | null => {
    if (!isShortcutEnabled(name)) return null;

    return SettingsStore.getHideEditUI(name) ?? false;
};
