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

import * as React from "react";
import { _td } from "../../../languageHandler";
import {isMac, Key, Modifiers} from "../../../Keyboard";
import {KeyCombo} from "../../../KeyBindingsManager";

const keyName: Record<string, string> = {
    [Key.PAGE_UP]: _td("Page Up"),
    [Key.PAGE_DOWN]: _td("Page Down"),
    [Key.ESCAPE]: _td("Esc"),
    [Key.ENTER]: _td("Enter"),
    [Key.SPACE]: _td("Space"),
    [Key.HOME]: _td("Home"),
    [Key.END]: _td("End"),
    [Key.ALT]: _td("Alt"),
    [Key.CONTROL]: _td("Ctrl"),
    [Key.SHIFT]: _td("Shift"),
};

const keyIcon: Record<string, string> = {
    [Key.ARROW_UP]: "↑",
    [Key.ARROW_DOWN]: "↓",
    [Key.ARROW_LEFT]: "←",
    [Key.ARROW_RIGHT]: "→",

};

if (isMac) {
    keyIcon[Key.META] = "⌘";
    keyIcon[Key.SHIFT] = "⌥";
}

interface IProps {
    keyCombo: KeyCombo | KeyboardEvent;
}

function keyDisplayValue(key: Key | string) {
    return keyIcon[key] || keyName[key] || key;
}

export default class KeyboardShortcut extends React.Component<IProps> {
    render() {
        const key = this.props.keyCombo.key;

        const modifiersElement = [];
        // We have to use hasOwnProperty here, see https://stackoverflow.com/a/43496627/10822785
        if (this.props.keyCombo.hasOwnProperty("ctrlOrCmdKey")) {
            modifiersElement.push(
                <React.Fragment key="ctrlOrCmdKey">
                    <kbd>{ isMac ? keyDisplayValue(Key.META) : keyDisplayValue(Key.CONTROL) }</kbd>+
                </React.Fragment>,
            );
        } else if (this.props.keyCombo.ctrlKey) {
            modifiersElement.push(
                <React.Fragment key="ctrlKey">
                    <kbd>{ keyDisplayValue(Key.CONTROL) }</kbd>+
                </React.Fragment>,
            );
        } else if (this.props.keyCombo.metaKey) {
            modifiersElement.push(
                <React.Fragment key="metaKey">
                    <kbd>{ keyDisplayValue(Key.META) }</kbd>+
                </React.Fragment>,
            );
        }
        if (this.props.keyCombo.altKey) {
            modifiersElement.push(
                <React.Fragment key="altKey">
                    <kbd>{ keyDisplayValue(Key.ALT) }</kbd>+
                </React.Fragment>,
            );
        }
        if (this.props.keyCombo.shiftKey) {
            modifiersElement.push(
                <React.Fragment key="shiftKey">
                    <kbd>{ keyDisplayValue(Key.SHIFT) }</kbd>+
                </React.Fragment>,
            );
        }

        let keyElement;
        if (key && !Modifiers.includes(key)) {
            keyElement = <kbd>{ keyDisplayValue(key) }</kbd>;
        }

        return (
            <div className="mx_KeyboardShortcut">
                {modifiersElement}
                {keyElement}
            </div>
        );
    }
}
