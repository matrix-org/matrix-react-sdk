/*
Copyright 2021 Šimon Brandner <simon.bra.ag@gmail.com>

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

import React from 'react';
import {_t, _td} from "../../../../../languageHandler";
import SettingsStore from '../../../../../settings/SettingsStore';
import Shortcut from "../../../elements/KeyboardShortcut";

interface Category {
    settingNames: Array<string>;
    categoryName: string;
    categoryLabel: string;
}

const COMPOSER_SETTINGS_NAMES = [
    "KeyBinding.toggleBoldInComposer",
    "KeyBinding.toggleItalicsInComposer",
    "KeyBinding.toggleQuoteInComposer",
    "KeyBinding.newLineInComposer",
    "KeyBinding.cancelReplyInComposer",
    "KeyBinding.editNextMessage",
    "KeyBinding.editPreviousMessage",
    "KeyBinding.jumpToStartInComposer",
    "KeyBinding.jumpToEndInComposer",
    "KeyBinding.nextMessageInComposerHistory",
    "KeyBinding.previousMessageInComposerHistory",
];
const CALLS_SETTINGS_NAMES = [
    "KeyBinding.toggleMicInCall",
    "KeyBinding.toggleWebcamInCall",
];
const ROOM_SETTINGS_NAMES = [
    "KeyBinding.dismissReadMarkerAndJumpToBottom",
    "KeyBinding.jumpToOldestUnreadMessage",
    "KeyBinding.uploadFileToRoom",
    "KeyBinding.searchInRoom",
    "KeyBinding.scrollUpInTimeline",
    "KeyBinding.scrollDownInTimeline",
];
const ROOM_LIST_SETTINGS_NAMES = [
    "KeyBinding.filterRooms",
    "KeyBinding.selectRoomInRoomList",
    "KeyBinding.collapseSectionInRoomList",
    "KeyBinding.expandSectionInRoomList",
    "KeyBinding.clearRoomFilter",
    "KeyBinding.upperRoom",
    "KeyBinding.downerRoom",
];
const NAVIGATION_SETTINGS_NAMES = [
    "KeyBinding.toggleTopLeftMenu",
    "KeyBinding.closeDialogOrContextMenu",
    "KeyBinding.activateSelectedButton",
    "KeyBinding.toggleRightPanel",
    "KeyBinding.showKeyBindingsSettings",
    "KeyBinding.goToHomeView",
    "KeyBinding.nextUnreadRoom",
    "KeyBinding.previousUnreadRoom",
    "KeyBinding.nextRoom",
    "KeyBinding.previousRoom",
];
const AUTOCOMPLETE_SETTINGS_NAMES = [
    "KeyBinding.cancelAutoComplete",
    "KeyBinding.nextOptionInAutoComplete",
    "KeyBinding.previousOptionInAutoComplete",
];

const CATEGORIES: Array<Category> = [
    {
        settingNames: COMPOSER_SETTINGS_NAMES,
        categoryName: "composer",
        categoryLabel: _td("Composer"),
    }, {
        settingNames: CALLS_SETTINGS_NAMES,
        categoryName: "calls",
        categoryLabel: _td("Calls"),
    }, {
        settingNames: ROOM_SETTINGS_NAMES,
        categoryName: "room",
        categoryLabel: _td("Room"),
    }, {
        settingNames: ROOM_LIST_SETTINGS_NAMES,
        categoryName: "roomList",
        categoryLabel: _td("Room List"),
    }, {
        settingNames: NAVIGATION_SETTINGS_NAMES,
        categoryName: "navigation",
        categoryLabel: _td("Navigation"),
    }, {
        settingNames: AUTOCOMPLETE_SETTINGS_NAMES,
        categoryName: "autocomplete",
        categoryLabel: _td("Autocomplete"),
    },
];

interface KeybindingIProps {
    settingName: string;
}

export class Keybinding extends React.Component<KeybindingIProps> {
    render() {
        const label = SettingsStore.getDisplayName(this.props.settingName);
        const value = SettingsStore.getValue(this.props.settingName);

        return (
            <div className="mx_KeybindingUserSettingsTab_keybind">
                {label}
                <div className="mx_KeybindingUserSettingsTab_keybind_buttons">
                    <Shortcut keyCombo={value}></Shortcut>
                </div>
            </div>
        );
    }
}

export default class KeybindingsUserSettingsTab extends React.Component {
    getKeybindings(settingsNames: Array<string>) {
        return settingsNames.map((settingName) => {
            return (
                <Keybinding key={settingName} settingName={settingName}></Keybinding>
            );
        });
    }

    getCategories(categories: Array<Category>) {
        return categories.map((category) => {
            return (
                <div key={category.categoryName} className="mx_SettingsTab_section">
                    <span className="mx_SettingsTab_subheading">{category.categoryLabel}</span>
                    {this.getKeybindings(category.settingNames)}
                </div>
            );
        });
    }

    render() {
        return (
            <div className="mx_SettingsTab mx_KeybindingUserSettingsTab">
                <div className="mx_SettingsTab_heading">{_t("Keybindings")}</div>
                {this.getCategories(CATEGORIES)}
            </div>
        );
    }
}
