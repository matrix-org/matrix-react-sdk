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
    getKeyboardShortcutDisplayName,
    getKeyboardShortcutHideEditUI,
    getKeyboardShortcutValue,
} from "../../../../../accessibility/KeyboardShortcutUtils";
import { KeyboardShortcut } from "../../KeyboardShortcut";
import AccessibleButton from "../../../elements/AccessibleButton";
import SettingsStore from "../../../../../settings/SettingsStore";
import { SettingLevel } from "../../../../../settings/SettingLevel";
import Modal from "../../../../../Modal";
import {
    ChangeKeyboardShortcutDialog,
    IProps as IChangeKeyboardShortcutDialogProps,
} from "./ChangeKeyboardShortcutDialog";

interface IKeyboardShortcutRowProps {
    name: string;
    allowCustomization: boolean;
}

// Filter out the labs section if labs aren't enabled.
const visibleCategories = Object.entries(CATEGORIES).filter(([categoryName]) =>
    categoryName !== CategoryName.LABS || SdkConfig.get("show_labs_settings"));

const KeyboardShortcutRow: React.FC<IKeyboardShortcutRowProps> = ({ name, allowCustomization }) => {
    const displayName = getKeyboardShortcutDisplayName(name);
    const hideEditUI = getKeyboardShortcutHideEditUI(name);
    const value = getKeyboardShortcutValue(name);
    if (!displayName || !value) return null;

    const onEditClick = async (): Promise<void> => {
        const { finished } = Modal.createDialog(ChangeKeyboardShortcutDialog, {
            value,
        } as IChangeKeyboardShortcutDialogProps);
        const [newValue] = await finished;
        if (!newValue) return;

        //SettingsStore.setValue(name, null, SettingLevel.DEVICE, newValue);
    };

    const onResetClick = (): void => {
        SettingsStore.setValue(name, null, SettingLevel.DEVICE, SettingsStore.getDefaultValue(name));
    };

    return <div className="mx_KeyboardShortcut_shortcutRow">
        <div className="mx_KeyboardShortcut_shortcutRow_displayName">
            { displayName }
        </div>
        <KeyboardShortcut value={value} />
        { allowCustomization && <React.Fragment>
            <AccessibleButton kind="primary_outline" disabled={hideEditUI} onClick={onEditClick}> { _t("Edit") } </AccessibleButton>
            <AccessibleButton kind="primary_outline" disabled={hideEditUI} onClick={onResetClick}> { _t("Reset") } </AccessibleButton>
        </React.Fragment> }
    </div>;
};

interface IKeyboardShortcutSectionProps {
    categoryName: CategoryName;
    category: ICategory;
    allowCustomization: boolean;
}

const KeyboardShortcutSection: React.FC<IKeyboardShortcutSectionProps> = (
    { categoryName, category, allowCustomization },
) => {
    if (!category.categoryLabel) return null;

    return <div className="mx_SettingsTab_section" key={categoryName}>
        <div className="mx_SettingsTab_subheading">{ _t(category.categoryLabel) }</div>
        <div> { category.settingNames.map((shortcutName) => {
            return <KeyboardShortcutRow
                key={shortcutName}
                name={shortcutName}
                allowCustomization={allowCustomization}
            />;
        }) } </div>
    </div>;
};

const KeyboardUserSettingsTab: React.FC = () => {
    return <div className="mx_SettingsTab mx_KeyboardUserSettingsTab">
        <div className="mx_SettingsTab_heading">{ _t("Keyboard") }</div>
        { visibleCategories.map(([categoryName, category]: [CategoryName, ICategory]) => {
            return <KeyboardShortcutSection
                key={categoryName}
                categoryName={categoryName}
                category={category}
                allowCustomization={SettingsStore.getValue("feature_customizable_keybindings")}
            />;
        }) }
    </div>;
};

export default KeyboardUserSettingsTab;

// For tests
export const mockVisibleCategories = (categories) => {
    visibleCategories.splice(0, visibleCategories.length);
    if (categories) visibleCategories.push(...categories);
};
