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

import React, { memo, MutableRefObject, ReactNode, useEffect, useRef } from "react";
import { useWysiwyg, FormattingFunctions, SuggestionPattern } from "@matrix-org/matrix-wysiwyg";
import classNames from "classnames";

import { useRoomContext } from "../../../../../contexts/RoomContext";
import Autocomplete from "../../Autocomplete";
import { getKeyBindingsManager } from "../../../../../KeyBindingsManager";
import { FormattingButtons } from "./FormattingButtons";
import { Editor } from "./Editor";
import { useInputEventProcessor } from "../hooks/useInputEventProcessor";
import { useSetCursorPosition } from "../hooks/useSetCursorPosition";
import { useIsFocused } from "../hooks/useIsFocused";
import { KeyBindingAction } from "../../../../../accessibility/KeyboardShortcuts";

interface WysiwygComposerProps {
    disabled?: boolean;
    onChange?: (content: string) => void;
    onSend: () => void;
    placeholder?: string;
    initialContent?: string;
    className?: string;
    leftComponent?: ReactNode;
    rightComponent?: ReactNode;
    children?: (ref: MutableRefObject<HTMLDivElement | null>, wysiwyg: FormattingFunctions) => ReactNode;
}

export const WysiwygComposer = memo(function WysiwygComposer({
    disabled = false,
    onChange,
    onSend,
    placeholder,
    initialContent,
    className,
    leftComponent,
    rightComponent,
    children,
}: WysiwygComposerProps) {
    const autocompleteRef = useRef<Autocomplete>(null);

    const inputEventProcessor = useInputEventProcessor(onSend, autocompleteRef, initialContent);

    const { ref, isWysiwygReady, content, actionStates, wysiwyg, suggestion } = useWysiwyg({
        initialContent,
        inputEventProcessor,
    });

    const autocompleteIndexRef = useRef<number>(0);

    const onKeyDown = (event: React.KeyboardEvent): void => {
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
                    autocompleteRef.current.onEscape(event);
                    handled = true;
                    break;
                default:
                    return; // don't preventDefault on anything else
            }
        }

        if (handled) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
    };

    useEffect(() => {
        if (!disabled && content !== null) {
            onChange?.(content);
        }
    }, [onChange, content, disabled]);

    const isReady = isWysiwygReady && !disabled;
    useSetCursorPosition(!isReady, ref);

    const { isFocused, onFocus } = useIsFocused();
    const computedPlaceholder = (!content && placeholder) || undefined;

    const { room } = useRoomContext();

    function buildQuery(suggestion: SuggestionPattern | null): string {
        if (suggestion === null) {
            return "";
        }

        // TODO we are not yet supporting / commands, so can't support this key
        if (suggestion.key === 2) {
            return "";
        }

        const keys = ["@", "#", "/"];
        return `${keys[suggestion.key]}${suggestion.text}`;
    }

    const query = buildQuery(suggestion);

    const autocomplete =
        suggestion && room && query ? (
            <div className="mx_WysiwygComposer_AutoCompleteWrapper">
                <Autocomplete
                    ref={autocompleteRef}
                    query={query}
                    onConfirm={(completion) => {
                        switch (completion.type) {
                            case "user":
                            case "room":
                                if (completion.href !== undefined) {
                                    wysiwyg.mention(completion.href, completion.completion);
                                }
                                break;
                            case "command":
                                // TODO - need to build this function into rte first
                                console.log("/command functionality not yet in place");
                                break;
                            default:
                                break;
                        }
                        // TODO figure out why we can only do one mention at the moment
                    }}
                    onSelectionChange={(compIndex) => (autocompleteIndexRef.current = compIndex)}
                    selection={{ beginning: true, start: suggestion.end, end: suggestion.end }}
                    room={room}
                />
            </div>
        ) : null;

    return (
        <div
            data-testid="WysiwygComposer"
            className={classNames(className, { [`${className}-focused`]: isFocused })}
            onFocus={onFocus}
            onBlur={onFocus}
            onKeyDown={onKeyDown}
        >
            {autocomplete}
            <FormattingButtons composer={wysiwyg} actionStates={actionStates} />
            <Editor
                ref={ref}
                disabled={!isReady}
                leftComponent={leftComponent}
                rightComponent={rightComponent}
                placeholder={computedPlaceholder}
            />
            {children?.(ref, wysiwyg)}
        </div>
    );
});
