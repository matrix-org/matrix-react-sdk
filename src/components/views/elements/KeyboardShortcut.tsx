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

const keyName: Map<Key, string> = new Map([
    [Key.PAGE_UP, _td("Page Up")],
    [Key.PAGE_DOWN, _td("Page Down")],
    [Key.ESCAPE, _td("Esc")],
    [Key.ENTER, _td("Enter")],
    [Key.SPACE, _td("Space")],
    [Key.HOME, _td("Home")],
    [Key.END, _td("End")],
    [Key.ALT, _td("Alt")],
    [Key.CONTROL, _td("Ctrl")],
    [Key.SHIFT, _td("Shift")],
]);

const keyIcon: Map<Key, string> = new Map([
    [Key.ARROW_UP, "↑"],
    [Key.ARROW_DOWN, "↓"],
    [Key.ARROW_LEFT, "←"],
    [Key.ARROW_RIGHT, "→"],
]);

if (isMac) {
    keyIcon[Key.META] = "⌘";
    keyIcon[Key.SHIFT] = "⌥";
}

interface IProps {
    keyCombo: KeyCombo | KeyboardEvent;
}

function keyDisplayValue(key: string | Key) {
    const newKey = Key[key] || key;
    return keyIcon.get(newKey) || keyName.get(newKey) || newKey;
}

export default class KeyboardShortcut extends React.Component<IProps> {
    renderKey(key: string, text: string) {
        return (
            <React.Fragment key={key}>
                <kbd className="mx_KeyboardShortcut_key">
                    {text}
                </kbd>+
            </React.Fragment>
        );
    }

    render() {
        const key = this.props.keyCombo.key;

        const modifiersElement = [];
        // We have to use hasOwnProperty here, see https://stackoverflow.com/a/43496627/10822785
        if (this.props.keyCombo.hasOwnProperty("ctrlOrCmdKey")) {
            const text = isMac ? keyDisplayValue(Key.META) : keyDisplayValue(Key.CONTROL);
            const key = this.renderKey("ctrlOrCmdKey", text)
            modifiersElement.push(key);
        } else if (this.props.keyCombo.ctrlKey) {
            const text = keyDisplayValue(Key.CONTROL);
            const key = this.renderKey("ctrlKey", text)
            modifiersElement.push(key);
        } else if (this.props.keyCombo.metaKey) {
            const text = keyDisplayValue(Key.META);
            const key = this.renderKey("metaKey", text)
            modifiersElement.push(key);
        }
        if (this.props.keyCombo.altKey) {
            const text = keyDisplayValue(Key.ALT);
            const key = this.renderKey("altKey", text)
            modifiersElement.push(key);
        }
        if (this.props.keyCombo.shiftKey) {
            const text = keyDisplayValue(Key.SHIFT);
            const key = this.renderKey("shiftKey", text)
            modifiersElement.push(key);
        }

        let keyElement;
        if (key && !Modifiers.includes(key)) {
            keyElement = (
                <kbd className="mx_KeyboardShortcut_key">
                    { keyDisplayValue(key) }
                </kbd>
            );
        }

        return (
            <kbd className="mx_KeyboardShortcut">
                {modifiersElement}
                {keyElement}
            </kbd>
        );
    }
}
