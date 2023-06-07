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

import { KeyboardEvent, RefObject, SyntheticEvent, ClipboardEvent, useCallback, useRef, useState } from "react";
import { Attributes, MappedSuggestion } from "@matrix-org/matrix-wysiwyg";
import { IEventRelation } from "matrix-js-sdk/src/matrix";

import { useSettingValue } from "../../../../../hooks/useSettings";
import { IS_MAC, Key } from "../../../../../Keyboard";
import Autocomplete from "../../Autocomplete";
import { handleEventWithAutocomplete } from "./utils";
import { useSuggestion } from "./useSuggestion";
import { isNotNull, isNotUndefined } from "../../../../../Typeguards";
import { handleClipboardEvent } from "./useInputEventProcessor";
import { useRoomContext } from "../../../../../contexts/RoomContext";
import { useMatrixClientContext } from "../../../../../contexts/MatrixClientContext";

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

/**
 * React hook which generates all of the listeners and the ref to be attached to the editor.
 *
 * Also returns pieces of state and utility functions that are required for use in other hooks
 * and by the autocomplete component.
 *
 * @param initialContent - the content of the editor when it is first mounted
 * @param onChange - called whenever there is change in the editor content
 * @param onSend - called whenever the user sends the message
 * @returns
 * - `ref`: a ref object which the caller must attach to the HTML `div` node for the editor
 * * `autocompleteRef`: a ref object which the caller must attach to the autocomplete component
 * - `content`: state representing the editor's current text content
 * - `setContent`: the setter function for `content`
 * - `onInput`, `onPaste`, `onKeyDown`: handlers for input, paste and keyDown events
 * - the output from the {@link useSuggestion} hook
 */
export function usePlainTextListeners(
    initialContent?: string,
    onChange?: (content: string) => void,
    onSend?: () => void,
    eventRelation?: IEventRelation,
): {
    ref: RefObject<HTMLDivElement>;
    autocompleteRef: React.RefObject<Autocomplete>;
    content?: string;
    onInput(event: SyntheticEvent<HTMLDivElement, InputEvent> | ClipboardEvent): void;
    onPaste(event: ClipboardEvent): void;
    onKeyDown(event: KeyboardEvent<HTMLDivElement>): void;
    setContent(text?: string): void;
    handleMention: (link: string, text: string, attributes: Attributes) => void;
    handleCommand: (text: string) => void;
    onSelect: (event: SyntheticEvent<HTMLDivElement>) => void;
    suggestion: MappedSuggestion | null;
} {
    const roomContext = useRoomContext();
    const mxClient = useMatrixClientContext();

    const ref = useRef<HTMLDivElement | null>(null);
    const autocompleteRef = useRef<Autocomplete | null>(null);
    const [content, setContent] = useState<string | undefined>(initialContent);

    const send = useCallback(() => {
        if (ref.current) {
            ref.current.innerHTML = "";
        }
        onSend?.();
    }, [ref, onSend]);

    const setText = useCallback(
        (text?: string) => {
            if (isNotUndefined(text)) {
                setContent(text);
                onChange?.(text);
            } else if (isNotNull(ref) && isNotNull(ref.current)) {
                // if called with no argument, read the current innerHTML from the ref
                const currentRefContent = ref.current.innerHTML;
                setContent(currentRefContent);
                onChange?.(currentRefContent);
            }
        },
        [onChange, ref],
    );

    // For separation of concerns, the suggestion handling is kept in a separate hook but is
    // nested here because we do need to be able to update the `content` state in this hook
    // when a user selects a suggestion from the autocomplete menu
    const { suggestion, onSelect, handleCommand, handleMention } = useSuggestion(ref, setText);

    const enterShouldSend = !useSettingValue<boolean>("MessageComposerInput.ctrlEnterToSend");
    const onInput = useCallback(
        (event: SyntheticEvent<HTMLDivElement, InputEvent> | ClipboardEvent) => {
            console.log("<<< handling ", event);
            if (isDivElement(event.target)) {
                console.log("<<< setting ", event.target.innerHTML);

                // if enterShouldSend, we do not need to amend the html before setting text
                const newInnerHTML = enterShouldSend ? event.target.innerHTML : amendInnerHtml(event.target.innerHTML);
                setText(newInnerHTML);
            }
        },
        [setText, enterShouldSend],
    );

    const onPaste = useCallback(
        (event: ClipboardEvent) => {
            const handled = handleClipboardEvent(event, roomContext, mxClient, eventRelation);
            if (handled) {
                event.preventDefault(); // we only handle image pasting manually
            } else {
                onInput(event);
            }
        },
        [eventRelation, mxClient, onInput, roomContext],
    );

    const onKeyDown = useCallback(
        (event: KeyboardEvent<HTMLDivElement>) => {
            // we need autocomplete to take priority when it is open for using enter to select
            const isHandledByAutocomplete = handleEventWithAutocomplete(autocompleteRef, event);
            if (isHandledByAutocomplete) {
                return;
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

    return {
        ref,
        autocompleteRef,
        onInput,
        onPaste,
        onKeyDown,
        content,
        setContent: setText,
        suggestion,
        onSelect,
        handleCommand,
        handleMention,
    };
}
