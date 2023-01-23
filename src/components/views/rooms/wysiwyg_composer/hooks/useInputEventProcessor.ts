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

import { WysiwygEvent } from "@matrix-org/matrix-wysiwyg";
import { useCallback } from "react";

import { useSettingValue } from "../../../../../hooks/useSettings";
import { getKeyBindingsManager } from "../../../../../KeyBindingsManager";
import { KeyBindingAction } from "../../../../../accessibility/KeyboardShortcuts";

type Send = () => void;

function handleKeyboardEvent(event: KeyboardEvent, send: Send): KeyboardEvent | null {
    const action = getKeyBindingsManager().getMessageComposerAction(event);

    switch (action) {
        case KeyBindingAction.SendMessage:
            send();
            return null;
    }

    return event;
}

type InputEvent = Exclude<WysiwygEvent, KeyboardEvent | ClipboardEvent>;

function handleInputEvent(event: InputEvent, send: Send, isCtrlEnter: boolean): InputEvent | null {
    switch (event.inputType) {
        case "insertParagraph":
            if (!isCtrlEnter) {
                send();
            }
            return null;
        case "sendMessage":
            if (isCtrlEnter) {
                send();
            }
            return null;
    }

    return event;
}

export function useInputEventProcessor(onSend: () => void): (event: WysiwygEvent) => WysiwygEvent | null {
    const isCtrlEnter = useSettingValue<boolean>("MessageComposerInput.ctrlEnterToSend");
    return useCallback(
        (event: WysiwygEvent) => {
            if (event instanceof ClipboardEvent) {
                return event;
            }

            const send = (): void => {
                event.stopPropagation?.();
                event.preventDefault?.();
                onSend();
            };

            const isKeyboardEvent = event instanceof KeyboardEvent;
            if (isKeyboardEvent) {
                return handleKeyboardEvent(event, send);
            } else {
                return handleInputEvent(event, send, isCtrlEnter);
            }
        },
        [isCtrlEnter, onSend],
    );
}
