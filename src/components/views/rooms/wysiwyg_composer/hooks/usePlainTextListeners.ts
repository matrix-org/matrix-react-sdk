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

import { KeyboardEvent, SyntheticEvent, useCallback, useRef, useState } from "react";

import { useSettingValue } from "../../../../../hooks/useSettings";
import { IS_MAC, Key } from '../../../../../Keyboard';

function isDivElement(target: EventTarget): target is HTMLDivElement {
    return target instanceof HTMLDivElement;
}

export function usePlainTextListeners(
    initialContent?: string,
    onChange?: (content: string) => void,
    onSend?: () => void,
) {
    const ref = useRef<HTMLDivElement | null>(null);
    const [content, setContent] = useState<string | undefined>(initialContent);
    const send = useCallback(() => {
        if (ref.current) {
            ref.current.innerHTML = "";
        }
        onSend?.();
    }, [ref, onSend]);

    const setText = useCallback(
        (text: string) => {
            setContent(text);
            onChange?.(text);
        },
        [onChange],
    );

    const enterShouldSend = !useSettingValue<boolean>("MessageComposerInput.ctrlEnterToSend");
    const onInput = useCallback(
        (event: SyntheticEvent<HTMLDivElement, InputEvent | ClipboardEvent>) => {
            if (isDivElement(event.target)) {
                if (enterShouldSend) {
                    // if enter should send, can just set text
                    setText(event.target.innerHTML);
                } else {
                    // hitting enter inside an editable div inserts a br tag inside
                    // a div tag as default behaviour, which can then be edited
                    const amendedHtml = event.target.innerHTML
                        .replaceAll(/<div>/g, "")
                        .replaceAll(/<\/div>/g, "")
                        .replaceAll(/<br>/g, "\n");
                    setText(amendedHtml);
                }
            }
        },
        [setText, enterShouldSend],
    );

    const onKeyDown = useCallback(
        (event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key === Key.ENTER) {
                const sendModifierIsPressed = IS_MAC ? event.metaKey : event.ctrlKey;

                // if enter should send, send if the user is not pushing shift
                if (enterShouldSend && !event.shiftKey) {
                    event.preventDefault();
                    event.stopPropagation();
                    send();
                }

                // if enter should not send, send only if the user is pushing ctrl/cmd
                if (!enterShouldSend && sendModifierIsPressed) {
                    event.preventDefault();
                    event.stopPropagation();
                    send();
                }
            }
        },
        [enterShouldSend, send],
    );

    return { ref, onInput, onPaste: onInput, onKeyDown, content, setContent: setText };
}
