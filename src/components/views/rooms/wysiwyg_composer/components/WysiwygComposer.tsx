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
import { useWysiwyg, FormattingFunctions } from "@matrix-org/matrix-wysiwyg";
import classNames from "classnames";

import { useRoomContext } from "../../../../../contexts/RoomContext";
import Autocomplete from "../../Autocomplete";
import AutocompleteWrapperModel from "../../../../../editor/autocomplete";
import { getKeyBindingsManager } from "../../../KeyBindingsManager";
import { FormattingButtons } from "./FormattingButtons";
import { Editor } from "./Editor";
import { useInputEventProcessor } from "../hooks/useInputEventProcessor";
import { useSetCursorPosition } from "../hooks/useSetCursorPosition";
import { useIsFocused } from "../hooks/useIsFocused";

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
    const inputEventProcessor = useInputEventProcessor(onSend, initialContent);

    const { ref, isWysiwygReady, content, actionStates, wysiwyg } = useWysiwyg({ initialContent, inputEventProcessor });

    const autocompleteRef = useRef<Autocomplete>(null);

    const onKeyDown = (event: React.KeyboardEvent): void => {
        console.log(`<<< key down!`);
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
    const autocomplete =
        Number(content?.length) > 0 && room ? (
            <div className="mx_WysiwygComposer_AutoCompleteWrapper">
                <Autocomplete
                    ref={autocompleteRef}
                    query="@a"
                    onConfirm={() => {}}
                    // onSelectionChange={this.onAutoCompleteSelectionChange}
                    selection={{ beginning: true, end: 1, start: 0 }}
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
