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

import React, { useState, ReactNode, ChangeEvent, KeyboardEvent, useRef } from 'react';
import classNames from 'classnames';

import Autocompleter from "../../autocomplete/AutocompleteProvider";
import { Key } from '../../Keyboard';
import { ICompletion } from '../../autocomplete/Autocompleter';
import AccessibleButton from '../../components/views/elements/AccessibleButton';
import { Icon as PillRemoveIcon } from '../../../res/img/icon-pill-remove.svg';
import { Icon as CheckmarkIcon } from '../../../res/img/element-icons/roomlist/checkmark.svg';

interface AutocompleteInputProps {
    provider: Autocompleter;
    placeholder: string;
    selection: ICompletion[];
    onSelectionChange: (selection: ICompletion[]) => void;
    maxSuggestions?: number;
    renderSuggestion?: (s: ICompletion) => ReactNode;
    renderSelection?: (m: ICompletion) => ReactNode;
    additionalFilter?: (suggestion: ICompletion) => boolean;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
    provider,
    renderSuggestion,
    renderSelection,
    maxSuggestions = 5,
    placeholder,
    onSelectionChange,
    selection,
    additionalFilter,
}) => {
    const [query, setQuery] = useState<string>('');
    const [suggestions, setSuggestions] = useState<ICompletion[]>([]);
    const [isFocused, setFocused] = useState<boolean>(false);
    const editorContainerRef = useRef<HTMLDivElement>();
    const editorRef = useRef<HTMLInputElement>();

    const focusEditor = () => {
        editorRef?.current?.focus();
    };

    const onQueryChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.trim();

        setQuery(value);

        let matches = await provider.getCompletions(
            query,
            { start: query.length, end: query.length },
            true,
            maxSuggestions,
        );

        if (additionalFilter) {
            matches = matches.filter(additionalFilter);
        }

        setSuggestions(matches);
    };

    const onClickInputArea = () => {
        focusEditor();
    };

    const onKeyDown = (e: KeyboardEvent) => {
        const hasModifiers = e.ctrlKey || e.shiftKey || e.metaKey;

        // when the field is empty and the user hits backspace remove the right-most target
        if (!query && selection.length > 0 && e.key === Key.BACKSPACE && !hasModifiers) {
            removeSelection(selection[selection.length - 1]);
        }
    };

    const toggleSelection = (completion: ICompletion) => {
        const newSelection = [...selection];
        const index = selection.findIndex(selection => selection.completionId === completion.completionId);

        if (index >= 0) {
            newSelection.splice(index, 1);
        } else {
            newSelection.push(completion);
        }

        onSelectionChange(newSelection);
        focusEditor();
    };

    const removeSelection = (completion: ICompletion) => {
        const newSelection = [...selection];
        const index = selection.findIndex(selection => selection.completionId === completion.completionId);

        if (index >= 0) {
            newSelection.splice(index, 1);
            onSelectionChange(newSelection);
        }
    };

    const _renderSuggestion = (completion: ICompletion): ReactNode => {
        const isSelected = selection.findIndex(selection => selection.completionId === completion.completionId) >= 0;
        const classes = classNames({
            'mx_AutocompleteInput_suggestion': true,
            'mx_AutocompleteInput_suggestion--selected': isSelected,
        });

        const withContainer = (children: ReactNode): ReactNode => (
            <div className={classes}
                onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    toggleSelection(completion);
                }}
                key={completion.completionId}
                data-testid={`autocomplete-suggestion-item-${completion.completionId}`}
            >
                <div>
                    { children }
                </div>
                { isSelected && <CheckmarkIcon height={16} width={16} /> }
            </div>
        );

        if (renderSuggestion) {
            return withContainer(renderSuggestion(completion));
        }

        return withContainer(
            <>
                <span className='mx_AutocompleteInput_suggestion_title'>{ completion.completion }</span>
                <span className='mx_AutocompleteInput_suggestion_description'>{ completion.completionId }</span>
            </>,
        );
    };

    const _renderSelection = (s: ICompletion): ReactNode => {
        const withContainer = (children: ReactNode): ReactNode => (
            <span
                className='mx_AutocompleteInput_editor_selection'
                key={s.completionId}
                data-testid={`autocomplete-selection-item-${s.completionId}`}
            >
                <span className='mx_AutocompleteInput_editor_selection_pill'>
                    { children }
                </span>
                <AccessibleButton
                    className='mx_AutocompleteInput_editor_selection_remove'
                    onClick={() => removeSelection(s)}
                    data-testid={`autocomplete-selection-remove-button-${s.completionId}`}
                >
                    <PillRemoveIcon width={8} height={8} />
                </AccessibleButton>
            </span>
        );

        if (renderSelection) {
            return withContainer(renderSelection(s));
        }

        return withContainer(
            <span className='mx_AutocompleteInput_editor_selection_text'>{ s.completion }</span>,
        );
    };

    const hasPlaceholder = (): boolean => selection.length === 0 && query.length === 0;

    return (
        <div className="mx_AutocompleteInput">
            <div
                ref={editorContainerRef}
                className='mx_AutocompleteInput_editor'
                onClick={onClickInputArea}
                data-testid="autocomplete-editor"
            >
                { selection.map(s => _renderSelection(s)) }
                <input
                    ref={editorRef}
                    type="text"
                    onKeyDown={onKeyDown}
                    onChange={onQueryChange}
                    value={query}
                    autoComplete="off"
                    placeholder={hasPlaceholder() ? placeholder : null}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    data-testid="autocomplete-input"
                />
            </div>
            {
                (isFocused && suggestions.length) ? (
                    <div
                        className="mx_AutocompleteInput_matches"
                        style={{ top: editorContainerRef.current?.clientHeight }}
                        data-testid="autocomplete-matches"
                    >
                        {
                            suggestions.map((s) => _renderSuggestion(s))
                        }
                    </div>
                ) : null
            }
        </div>
    );
};
