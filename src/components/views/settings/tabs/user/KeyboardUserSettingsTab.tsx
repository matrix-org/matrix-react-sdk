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
    ICategory,
    CATEGORIES,
    CategoryName,
} from "../../../../../accessibility/KeyboardShortcuts";
import SdkConfig from "../../../../../SdkConfig";
import { _t } from "../../../../../languageHandler";
import {
    getKeyboardShortcutDisplayName, getKeyboardShortcutValue,
} from "../../../../../accessibility/KeyboardShortcutUtils";
import { KeyboardShortcut } from "../../KeyboardShortcut";

interface IKeyboardShortcutRowProps {
    name: string;
}

// Filter out the labs section if labs aren't enabled.
const visibleCategories = Object.entries(CATEGORIES).filter(([categoryName]) =>
    categoryName !== CategoryName.LABS || SdkConfig.get("show_labs_settings"));

const KeyboardShortcutRow: React.FC<IKeyboardShortcutRowProps> = ({ name }) => {
    const displayName = getKeyboardShortcutDisplayName(name);
    const value = getKeyboardShortcutValue(name);
    if (!displayName || !value) return null;

    return <div className="mx_KeyboardShortcut_shortcutRow">
        { displayName }
        <KeyboardShortcut value={value} />
    </div>;
};

interface IKeyboardShortcutSectionProps {
    categoryName: CategoryName;
    category: ICategory;
}

const KeyboardShortcutSection: React.FC<IKeyboardShortcutSectionProps> = ({ categoryName, category }) => {
    if (!category.categoryLabel) return null;

    return <div className="mx_SettingsTab_section" key={categoryName}>
        <div className="mx_SettingsTab_subheading">{ _t(category.categoryLabel) }</div>
        <div> { category.settingNames.map((shortcutName) => {
            return <KeyboardShortcutRow key={shortcutName} name={shortcutName} />;
        }) } </div>
    </div>;
};

const KeyboardUserSettingsTab: React.FC = () => {
    return <div className="mx_SettingsTab mx_KeyboardUserSettingsTab">
        <div className="mx_SettingsTab_heading">{ _t("Keyboard") }</div>
        { visibleCategories.map(([categoryName, category]: [CategoryName, ICategory]) => {
            return <KeyboardShortcutSection key={categoryName} categoryName={categoryName} category={category} />;
        }) }
    </div>;
};

export default KeyboardUserSettingsTab;
