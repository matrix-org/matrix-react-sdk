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

import React, { KeyboardEvent, useState } from "react";

import { KeyCombo } from "../../../../../KeyBindingsManager";
import { Key } from "../../../../../Keyboard";
import { _t } from "../../../../../languageHandler";
import BaseDialog from "../../../dialogs/BaseDialog";
import { IDialogProps } from "../../../dialogs/IDialogProps";
import DialogButtons from "../../../elements/DialogButtons";
import KeyboardShortcut from "../../KeyboardShortcut";

const eventIntoKeyCombo = (event: KeyboardEvent): KeyCombo | null => {
    const hasModifier = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
    const isKeyAModifier = [Key.ALT, Key.CONTROL, Key.META, Key.SHIFT].includes(event.key);
    // Don't allow KeyCombos without modifiers
    if (!hasModifier) return null;
    // Don't allow KeyCombos without a key pressed
    if (isKeyAModifier || !event.key) return null;

    return {
        key: event.key,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
    };
};

export interface IProps extends IDialogProps {
    value: KeyCombo;
}

export const ChangeKeyboardShortcutDialog: React.FC<IProps> = ({ onFinished, value }) => {
    const [currentValue, setValue] = useState<KeyCombo | null>(value);

    const onDialogFinished = () => {
        onFinished(currentValue);
    };

    const onKeyDown = (event: KeyboardEvent): void => {
        event.preventDefault();
        event.stopPropagation();

        const key = event.key;
        if (!key) return;

        setValue(eventIntoKeyCombo(event));
    };

    const onCancel = (): void => {
        onFinished(null);
    };

    const onPrimaryButtonClick = (): void => {
        if (!currentValue) return;
        onFinished(currentValue);
    };

    return <BaseDialog onFinished={onDialogFinished} onKeyDown={onKeyDown}>
        <KeyboardShortcut value={currentValue} />
        <DialogButtons primaryButton={_t("Done")} hasCancel onPrimaryButtonClick={onPrimaryButtonClick} onCancel={onCancel} />
    </BaseDialog>;
};

export default ChangeKeyboardShortcutDialog;
