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

import { MappedSuggestion } from "@matrix-org/matrix-wysiwyg";
import { KeyboardEvent, RefObject, SyntheticEvent, useCallback, useRef, useEffect, useState } from "react";

import { useSettingValue } from "../../../../../hooks/useSettings";
import { IS_MAC, Key } from "../../../../../Keyboard";
import Autocomplete from "../../Autocomplete";
import { getKeyBindingsManager } from "../../../../../KeyBindingsManager";
import { KeyBindingAction } from "../../../../../accessibility/KeyboardShortcuts";

function isDivElement(target: EventTarget): target is HTMLDivElement {
    return target instanceof HTMLDivElement;
}

// Hitting enter inside the editor inserts an editable div, initially containing a <br />
// For correct display, first replace this pattern with a newline character and then remove divs
// noting that they are used to delimit paragraphs
function amendInnerHtml(text: string): string {
    return text
        .replace(/<div><br><\/div>/g, "\n") // this is pressing enter then not typing
        .replace(/<div>/g, "\n") // this is from pressing enter, then typing inside the div
        .replace(/<\/div>/g, "");
}

const emptySuggestion = { keyChar: "", text: "", type: "unknown" } as const;

export function usePlainTextListeners(
    autocompleteRef: React.RefObject<Autocomplete>,
    initialContent?: string,
    onChange?: (content: string) => void,
    onSend?: () => void,
): {
    ref: RefObject<HTMLDivElement | null>;
    content?: string;
    onInput(event: SyntheticEvent<HTMLDivElement, InputEvent | ClipboardEvent>): void;
    onPaste(event: SyntheticEvent<HTMLDivElement, InputEvent | ClipboardEvent>): void;
    onKeyDown(event: KeyboardEvent<HTMLDivElement>): void;
    setContent(text: string): void;
    suggestion: MappedSuggestion;
} {
    const ref = useRef<HTMLDivElement | null>(null);
    const [content, setContent] = useState<string | undefined>(initialContent);
    const [suggestion, setSuggestion] = useState<MappedSuggestion>(emptySuggestion);

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
                // if enterShouldSend, we do not need to amend the html before setting text
                const newInnerHTML = enterShouldSend ? event.target.innerHTML : amendInnerHtml(event.target.innerHTML);
                setText(newInnerHTML);
            }
        },
        [setText, enterShouldSend],
    );

    const onKeyDown = useCallback(
        (event: KeyboardEvent<HTMLDivElement>) => {
            // WIP drop in the autocomplete handling
            const autocompleteIsOpen = autocompleteRef?.current && !autocompleteRef.current.state.hide;

            // we need autocomplete to take priority when it is open for using enter to select
            if (autocompleteIsOpen) {
                let handled = false;
                const autocompleteAction = getKeyBindingsManager().getAutocompleteAction(event);
                const component = autocompleteRef.current;
                if (component && component.countCompletions() > 0) {
                    switch (autocompleteAction) {
                        case KeyBindingAction.ForceCompleteAutocomplete:
                        case KeyBindingAction.CompleteAutocomplete:
                            autocompleteRef.current.onConfirmCompletion();
                            handled = true;
                            break;
                        case KeyBindingAction.PrevSelectionInAutocomplete:
                            autocompleteRef.current.moveSelection(-1);
                            handled = true;
                            break;
                        case KeyBindingAction.NextSelectionInAutocomplete:
                            autocompleteRef.current.moveSelection(1);
                            handled = true;
                            break;
                        case KeyBindingAction.CancelAutocomplete:
                            autocompleteRef.current.onEscape(event as {} as React.KeyboardEvent);
                            handled = true;
                            break;
                        default:
                            break; // don't return anything, allow event to pass through
                    }
                }

                if (handled) {
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }
            }

            // resume regular flow
            if (event.key === Key.ENTER) {
                // TODO use getKeyBindingsManager().getMessageComposerAction(event) like in useInputEventProcessor
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
        [autocompleteRef, enterShouldSend, send],
    );

    useEffect(() => {
        // do we need to do this onSelect? Initial thought was yes, but perhaps we can actually just
        // do checks on input? onInput would probably be easier to be honest, but then with the initial
        // implementation this wouldn't allow us to
        // when there's a selection change, we need to figure out if we are doing some
        // sort of suggestion

        // lets do slash first, probably more straightforward
        if (content && content.startsWith("/") && !content.startsWith("//")) {
            // then we have a command
            setSuggestion({ keyChar: "/", text: content.slice(1), type: "command" });
        }
    }, [content]);

    return {
        ref,
        onInput,
        onPaste: onInput,
        onKeyDown,
        content,
        setContent: setText,
        suggestion,
    };
}
