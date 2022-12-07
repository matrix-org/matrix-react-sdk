/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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

import React, { MouseEventHandler } from "react";
import { FormattingFunctions, AllActionStates } from "@matrix-org/matrix-wysiwyg";
import classNames from "classnames";

import AccessibleTooltipButton from "../../../elements/AccessibleTooltipButton";
import { Alignment } from "../../../elements/Tooltip";
import { KeyboardShortcut } from "../../../settings/KeyboardShortcut";
import { KeyCombo } from "../../../../../KeyBindingsManager";
import { _td } from "../../../../../languageHandler";
import { ButtonEvent } from "../../../elements/AccessibleButton";

interface TooltipProps {
    label: string;
    keyCombo?: KeyCombo;
}

function Tooltip({ label, keyCombo }: TooltipProps) {
    return <div className="mx_FormattingButtons_Tooltip">
        { label }
        { keyCombo && <KeyboardShortcut value={keyCombo} className="mx_FormattingButtons_Tooltip_KeyboardShortcut" /> }
    </div>;
}

interface ButtonProps extends TooltipProps {
    className: string;
    isActive: boolean;
    onClick: MouseEventHandler<HTMLButtonElement>;
}

function Button({ label, keyCombo, onClick, isActive, className }: ButtonProps) {
    return <AccessibleTooltipButton
        element="button"
        onClick={onClick as (e: ButtonEvent) => void}
        title={label}
        className={
            classNames('mx_FormattingButtons_Button', className, { 'mx_FormattingButtons_active': isActive })}
        tooltip={keyCombo && <Tooltip label={label} keyCombo={keyCombo} />}
        alignment={Alignment.Top}
    />;
}

interface FormattingButtonsProps {
    composer: FormattingFunctions;
    actionStates: AllActionStates;
}

export function FormattingButtons({ composer, actionStates }: FormattingButtonsProps) {
    return <div className="mx_FormattingButtons">
        <Button isActive={actionStates.bold === 'reversed'} label={_td("Bold")} keyCombo={{ ctrlOrCmdKey: true, key: 'b' }} onClick={() => composer.bold()} className="mx_FormattingButtons_Button_bold" />
        <Button isActive={actionStates.italic === 'reversed'} label={_td('Italic')} keyCombo={{ ctrlOrCmdKey: true, key: 'i' }} onClick={() => composer.italic()} className="mx_FormattingButtons_Button_italic" />
        <Button isActive={actionStates.underline === 'reversed'} label={_td('Underline')} keyCombo={{ ctrlOrCmdKey: true, key: 'u' }} onClick={() => composer.underline()} className="mx_FormattingButtons_Button_underline" />
        <Button isActive={actionStates.strikeThrough === 'reversed'} label={_td('Strikethrough')} onClick={() => composer.strikeThrough()} className="mx_FormattingButtons_Button_strikethrough" />
        <Button isActive={actionStates.inlineCode === 'reversed'} label={_td('Code')} keyCombo={{ ctrlOrCmdKey: true, key: 'e' }} onClick={() => composer.inlineCode()} className="mx_FormattingButtons_Button_inline_code" />
    </div>;
}
