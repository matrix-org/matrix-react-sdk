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

import React, { useState, ReactNode, ChangeEvent, KeyboardEvent, useEffect, useCallback, useRef } from 'react';
import classNames from 'classnames';

import Autocompleter from "../../autocomplete/AutocompleteProvider";
import { Key } from '../../Keyboard';
import { ICompletion } from '../../autocomplete/Autocompleter';
import AccessibleButton from '../../components/views/elements/AccessibleButton';
import { Icon as PillRemoveIcon } from '../../../res/img/icon-pill-remove.svg';

interface AutocompleteInputProps {
    provider: Autocompleter;
    placeholder: string;
    maxSuggestions?: number;
    renderSuggestion?: (s: ICompletion) => ReactNode;
    selection?: ICompletion[];
    onSelectionChange?: (selection: ICompletion[]) => void;
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
    const [_selection, setSelection] = useState<ICompletion[]>([]);
    const [suggestions, setSuggestions] = useState<ICompletion[]>([]);
    const [query, setQuery] = useState<string>('');
    const [focusedElement, setFocusedElement] = useState<HTMLElement>(null);

    const editorContainerRef = useRef<HTMLDivElement>();
    const editorRef = useRef<HTMLInputElement>();

    const getSuggestions = useCallback(async () => {
        if (query) {
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
        }
    }, [query, maxSuggestions, provider, additionalFilter]);

    useEffect(() => {
        getSuggestions();

        if (selection) {
            setSelection(selection);
        }
    }, [getSuggestions, selection]);

    const focusEditor = () => {
        if (editorRef && editorRef.current) {
            editorRef.current.focus();
        }
    };

    const removeSelection = (t: ICompletion) => {
        const newSelection = _selection.map(s => s);
        const idx = _selection.findIndex(s => s.completionId === t.completionId);

        if (idx >= 0) {
            newSelection.splice(idx, 1);
            if (onSelectionChange) {
                onSelectionChange(newSelection);
            }
            setSelection(newSelection);
        }

        setQuery('');
    };

    const onFilterChange = async (e: ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        e.preventDefault();

        setQuery(e.target.value.trim());
    };

    const onClickInputArea = (e) => {
        e.stopPropagation();
        e.preventDefault();

        focusEditor();
    };

    const onKeyDown = (e: KeyboardEvent) => {
        const hasModifiers = e.ctrlKey || e.shiftKey || e.metaKey;
        // when the field is empty and the user hits backspace remove the right-most target
        if (!query && _selection.length > 0 && e.key === Key.BACKSPACE && !hasModifiers) {
            e.preventDefault();
            removeSelection(_selection[_selection.length - 1]);
        }
    };

    const toggleSelection = (e: ICompletion) => {
        const newSelection = _selection.map(t => t);
        const idx = _selection.findIndex(s => s.completionId === e.completionId);
        if (idx >= 0) {
            newSelection.splice(idx, 1);
        } else {
            newSelection.push(e);
        }

        if (onSelectionChange) {
            onSelectionChange(newSelection);
        }
        setSelection(newSelection);
        setQuery('');

        focusEditor();
    };

    const _renderSuggestion = (s: ICompletion): ReactNode => {
        const classes = classNames({
            'mx_AutocompleteInput_suggestion': true,
            'mx_AutocompleteInput_suggestion_selected':
            _selection.findIndex(selection => selection.completionId === s.completionId) >= 0,
        });

        const withContainer = (children: ReactNode): ReactNode => (
            <div className={classes}
                onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    toggleSelection(s);
                }}
                key={s.completionId}
                data-testid={`autocomplete-suggestion-item-${s.completionId}`}
            >
                { children }
            </div>
        );

        if (renderSuggestion) {
            return withContainer(renderSuggestion(s));
        }

        return withContainer(
            <>
                <span className='mx_AutocompleteInput_suggestion_title'>{ s.completion }</span>
                <span className='mx_AutocompleteInput_suggestion_description'>{ s.completionId }</span>
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

    const hasPlaceholder = (): boolean => _selection.length === 0 && query.length === 0;

    return (
        <div className="mx_AutocompleteInput">
            <div
                ref={editorContainerRef}
                className='mx_AutocompleteInput_editor'
                onClick={onClickInputArea}
                data-testid="autocomplete-editor"
            >
                { _selection.map(s => _renderSelection(s)) }
                <input
                    type="text"
                    onKeyDown={onKeyDown}
                    onChange={onFilterChange}
                    value={query}
                    autoComplete="off"
                    placeholder={hasPlaceholder() ? placeholder : null}
                    ref={editorRef}
                    onFocus={(e) => setFocusedElement(e.target)}
                    onBlur={() => setFocusedElement(null)}
                    data-testid="autocomplete-input"
                />
            </div>
            {
                (focusedElement === editorRef.current && suggestions.length) ? (
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
