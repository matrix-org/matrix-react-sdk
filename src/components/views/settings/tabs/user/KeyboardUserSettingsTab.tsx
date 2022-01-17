/*
Copyright 2020 The Matrix.org Foundation C.I.C.
Copyright 2021 - 2022 Šimon Brandner <simon.bra.ag@gmail.com>

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

import {
    KEYBOARD_SHORTCUTS,
    ALTERNATE_KEY_NAME,
    KEY_ICON,
    ICategory,
    CATEGORIES,
} from "../../../../../accessibility/KeyboardShortcuts";
import { isMac, Key } from "../../../../../Keyboard";
import { _t } from "../../../../../languageHandler";

interface IKeyboardKeyProps {
    name: string;
    last?: boolean;
}

const KeyboardKey: React.FC<IKeyboardKeyProps> = ({ name, last }) => {
    return <React.Fragment key={name}>
        <kbd> { KEY_ICON[name] || ALTERNATE_KEY_NAME[name] || name } </kbd>
        { !last && "+" }
    </React.Fragment>;
};

interface IKeyboardShortcutProps {
    name: string;
}

const KeyboardShortcut: React.FC<IKeyboardShortcutProps> = ({ name }) => {
    const keybind = KEYBOARD_SHORTCUTS[name];
    const value = keybind.default;

    const modifiersElement = [];
    if (value.ctrlOrCmdKey) {
        modifiersElement.push(<KeyboardKey name={isMac ? Key.META : Key.CONTROL} />);
    } else if (value.ctrlKey) {
        modifiersElement.push(<KeyboardKey name={Key.CONTROL} />);
    } else if (value.metaKey) {
        modifiersElement.push(<KeyboardKey name={Key.META} />);
    }
    if (value.altKey) {
        modifiersElement.push(<KeyboardKey name={Key.ALT} />);
    }
    if (value.shiftKey) {
        modifiersElement.push(<KeyboardKey name={Key.SHIFT} />);
    }

    return <div>
        { modifiersElement }
        <KeyboardKey name={value.key} last />
    </div>;
};

interface IKeyboardShortcutRowProps {
    name: string;
}

const KeyboardShortcutRow: React.FC<IKeyboardShortcutRowProps> = ({ name }) => {
    return <div className="mx_KeyboardShortcut_shortcutRow">
        { KEYBOARD_SHORTCUTS[name].displayName }
        <KeyboardShortcut name={name} />
    </div>;
};

interface IKeyboardShortcutSectionProps {
    category: ICategory;
}

const KeyboardShortcutSection: React.FC<IKeyboardShortcutSectionProps> = ({ category: category }) => {
    return <div className="mx_SettingsTab_section" key={category.categoryName}>
        <div className="mx_SettingsTab_subheading">{ _t(category.categoryLabel) }</div>
        <div> { category.settingNames.map((shortcutName) => {
            return <KeyboardShortcutRow key={shortcutName} name={shortcutName} />;
        }) } </div>
    </div>;
};

const KeyboardUserSettingsTab: React.FC = () => {
    return <div className="mx_SettingsTab mx_KeyboardUserSettingsTab">
        <div className="mx_SettingsTab_heading">{ _t("Keyboard") }</div>
        { CATEGORIES.map((category) => <KeyboardShortcutSection key={category.categoryName} category={category} />) }
    </div>;
};

export default KeyboardUserSettingsTab;
