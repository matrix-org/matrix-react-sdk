/*
Copyright 2019 - 2021 The Matrix.org Foundation C.I.C.

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

import classNames from 'classnames';
import React, { createRef, ClipboardEvent } from 'react';
import { Room } from 'matrix-js-sdk/src/models/room';
import { MatrixEvent } from 'matrix-js-sdk/src/models/event';
import EMOTICON_REGEX from 'emojibase-regex/emoticon';

import EditorModel from '../../../editor/model';
import HistoryManager from '../../../editor/history';
import { Caret, setSelection } from '../../../editor/caret';
import {
    formatRangeAsQuote,
    formatRangeAsCode,
    toggleInlineFormat,
    replaceRangeAndMoveCaret,
} from '../../../editor/operations';
import { getCaretOffsetAndText, getRangeForSelection } from '../../../editor/dom';
import Autocomplete, { generateCompletionDomId } from '../rooms/Autocomplete';
import { getAutoCompleteCreator, Type } from '../../../editor/parts';
import { parseEvent, parsePlainTextMessage } from '../../../editor/deserialize';
import { renderModel } from '../../../editor/render';
import TypingStore from "../../../stores/TypingStore";
import SettingsStore from "../../../settings/SettingsStore";
import { Key } from "../../../Keyboard";
import { EMOTICON_TO_EMOJI } from "../../../emoji";
import { CommandCategories, CommandMap, parseCommandString } from "../../../SlashCommands";
import Range from "../../../editor/range";
import MessageComposerFormatBar, { Formatting } from "./MessageComposerFormatBar";
import DocumentOffset from "../../../editor/offset";
import { IDiff } from "../../../editor/diff";
import AutocompleteWrapperModel from "../../../editor/autocomplete";
import DocumentPosition from "../../../editor/position";
import { ICompletion } from "../../../autocomplete/Autocompleter";
import { AutocompleteAction, getKeyBindingsManager, MessageComposerAction } from '../../../KeyBindingsManager';
import { replaceableComponent } from "../../../utils/replaceableComponent";

import { logger } from "matrix-js-sdk/src/logger";

// matches emoticons which follow the start of a line or whitespace
const REGEX_EMOTICON_WHITESPACE = new RegExp('(?:^|\\s)(' + EMOTICON_REGEX.source + ')\\s|:^$');
export const REGEX_EMOTICON = new RegExp('(?:^|\\s)(' + EMOTICON_REGEX.source + ')$');

const IS_MAC = navigator.platform.indexOf("Mac") !== -1;

const SURROUND_WITH_CHARACTERS = ["\"", "_", "`", "'", "*", "~", "$"];
const SURROUND_WITH_DOUBLE_CHARACTERS = new Map([
    ["(", ")"],
    ["[", "]"],
    ["{", "}"],
    ["<", ">"],
]);

function ctrlShortcutLabel(key: string): string {
    return (IS_MAC ? "⌘" : "Ctrl") + "+" + key;
}

function cloneSelection(selection: Selection): Partial<Selection> {
    return {
        anchorNode: selection.anchorNode,
        anchorOffset: selection.anchorOffset,
        focusNode: selection.focusNode,
        focusOffset: selection.focusOffset,
        isCollapsed: selection.isCollapsed,
        rangeCount: selection.rangeCount,
        type: selection.type,
    };
}

function selectionEquals(a: Partial<Selection>, b: Selection): boolean {
    return a.anchorNode === b.anchorNode &&
        a.anchorOffset === b.anchorOffset &&
        a.focusNode === b.focusNode &&
        a.focusOffset === b.focusOffset &&
        a.isCollapsed === b.isCollapsed &&
        a.rangeCount === b.rangeCount &&
        a.type === b.type;
}

interface IProps {
    model: EditorModel;
    room: Room;
    placeholder?: string;
    label?: string;
    initialCaret?: DocumentOffset;
    disabled?: boolean;

    onChange?();
    onPaste?(event: ClipboardEvent<HTMLDivElement>, model: EditorModel): boolean;
}

interface IState {
    showPillAvatar: boolean;
    query?: string;
    showVisualBell?: boolean;
    autoComplete?: AutocompleteWrapperModel;
    completionIndex?: number;
    surroundWith: boolean;
}

@replaceableComponent("views.rooms.BasicMessageEditor")
export default class BasicMessageEditor extends React.Component<IProps, IState> {
    public readonly editorRef = createRef<HTMLDivElement>();
    private autocompleteRef = createRef<Autocomplete>();
    private formatBarRef = createRef<MessageComposerFormatBar>();

    private modifiedFlag = false;
    private isIMEComposing = false;
    private hasTextSelected = false;

    private _isCaretAtEnd: boolean;
    private lastCaret: DocumentOffset;
    private lastSelection: ReturnType<typeof cloneSelection>;

    private readonly emoticonSettingHandle: string;
    private readonly shouldShowPillAvatarSettingHandle: string;
    private readonly surroundWithHandle: string;
    private readonly historyManager = new HistoryManager();

    constructor(props) {
        super(props);
        this.state = {
            showPillAvatar: SettingsStore.getValue("Pill.shouldShowPillAvatar"),
            surroundWith: SettingsStore.getValue("MessageComposerInput.surroundWith"),
            showVisualBell: false,
        };

        this.emoticonSettingHandle = SettingsStore.watchSetting('MessageComposerInput.autoReplaceEmoji', null,
            this.configureEmoticonAutoReplace);
        this.configureEmoticonAutoReplace();
        this.shouldShowPillAvatarSettingHandle = SettingsStore.watchSetting("Pill.shouldShowPillAvatar", null,
            this.configureShouldShowPillAvatar);
        this.surroundWithHandle = SettingsStore.watchSetting("MessageComposerInput.surroundWith", null,
            this.surroundWithSettingChanged);
    }

    public componentDidUpdate(prevProps: IProps) {
        // We need to re-check the placeholder when the enabled state changes because it causes the
        // placeholder element to remount, which gets rid of the `::before` class. Re-evaluating the
        // placeholder means we get a proper `::before` with the placeholder.
        const enabledChange = this.props.disabled !== prevProps.disabled;
        const placeholderChanged = this.props.placeholder !== prevProps.placeholder;
        if (this.props.placeholder && (placeholderChanged || enabledChange)) {
            const { isEmpty } = this.props.model;
            if (isEmpty) {
                this.showPlaceholder();
            } else {
                this.hidePlaceholder();
            }
        }
    }

    public replaceEmoticon(caretPosition: DocumentPosition, regex: RegExp): number {
        const { model } = this.props;
        const range = model.startRange(caretPosition);
        // expand range max 8 characters backwards from caretPosition,
        // as a space to look for an emoticon
        let n = 8;
        range.expandBackwardsWhile((index, offset) => {
            const part = model.parts[index];
            n -= 1;
            return n >= 0 && [Type.Plain, Type.PillCandidate, Type.Newline].includes(part.type);
        });
        const emoticonMatch = regex.exec(range.text);
        if (emoticonMatch) {
            const query = emoticonMatch[1].replace("-", "");
            // try both exact match and lower-case, this means that xd won't match xD but :P will match :p
            const data = EMOTICON_TO_EMOJI.get(query) || EMOTICON_TO_EMOJI.get(query.toLowerCase());

            if (data) {
                const { partCreator } = model;
                const firstMatch = emoticonMatch[0];
                const moveStart = firstMatch[0] === " " ? 1 : 0;

                // we need the range to only comprise of the emoticon
                // because we'll replace the whole range with an emoji,
                // so move the start forward to the start of the emoticon.
                // Take + 1 because index is reported without the possible preceding space.
                range.moveStartForwards(emoticonMatch.index + moveStart);
                // If the end is a trailing space/newline move end backwards, so that we don't replace it
                if (["\n", " "].includes(firstMatch[firstMatch.length - 1])) {
                    range.moveEndBackwards(1);
                }

                // this returns the amount of added/removed characters during the replace
                // so the caret position can be adjusted.
                return range.replace([partCreator.plain(data.unicode)]);
            }
        }
    }

    private updateEditorState = (selection: Caret, inputType?: string, diff?: IDiff): void => {
        renderModel(this.editorRef.current, this.props.model);
        if (selection) { // set the caret/selection
            try {
                setSelection(this.editorRef.current, this.props.model, selection);
            } catch (err) {
                logger.error(err);
            }
            // if caret selection is a range, take the end position
            const position = selection instanceof Range ? selection.end : selection;
            this.setLastCaretFromPosition(position);
        }
        const { isEmpty } = this.props.model;
        if (this.props.placeholder) {
            if (isEmpty) {
                this.showPlaceholder();
            } else {
                this.hidePlaceholder();
            }
        }
        if (isEmpty) {
            this.formatBarRef.current.hide();
        }
        this.setState({
            autoComplete: this.props.model.autoComplete,
            // if a change is happening then clear the showVisualBell
            showVisualBell: diff ? false : this.state.showVisualBell,
        });
        this.historyManager.tryPush(this.props.model, selection, inputType, diff);

        let isTyping = !this.props.model.isEmpty;
        // If the user is entering a command, only consider them typing if it is one which sends a message into the room
        if (isTyping && this.props.model.parts[0].type === "command") {
            const { cmd } = parseCommandString(this.props.model.parts[0].text);
            const command = CommandMap.get(cmd);
            if (!command || !command.isEnabled() || command.category !== CommandCategories.messages) {
                isTyping = false;
            }
        }
        TypingStore.sharedInstance().setSelfTyping(this.props.room.roomId, isTyping);

        if (this.props.onChange) {
            this.props.onChange();
        }
    };

    private showPlaceholder(): void {
        // escape single quotes
        const placeholder = this.props.placeholder.replace(/'/g, '\\\'');
        this.editorRef.current.style.setProperty("--placeholder", `'${placeholder}'`);
        this.editorRef.current.classList.add("mx_BasicMessageComposer_inputEmpty");
    }

    private hidePlaceholder(): void {
        this.editorRef.current.classList.remove("mx_BasicMessageComposer_inputEmpty");
        this.editorRef.current.style.removeProperty("--placeholder");
    }

    private onCompositionStart = (): void => {
        this.isIMEComposing = true;
        // even if the model is empty, the composition text shouldn't be mixed with the placeholder
        this.hidePlaceholder();
    };

    private onCompositionEnd = (): void => {
        this.isIMEComposing = false;
        // some browsers (Chrome) don't fire an input event after ending a composition,
        // so trigger a model update after the composition is done by calling the input handler.

        // however, modifying the DOM (caused by the editor model update) from the compositionend handler seems
        // to confuse the IME in Chrome, likely causing https://github.com/vector-im/element-web/issues/10913 ,
        // so we do it async

        // however, doing this async seems to break things in Safari for some reason, so browser sniff.

        const ua = navigator.userAgent.toLowerCase();
        const isSafari = ua.includes('safari/') && !ua.includes('chrome/');

        if (isSafari) {
            this.onInput({ inputType: "insertCompositionText" });
        } else {
            Promise.resolve().then(() => {
                this.onInput({ inputType: "insertCompositionText" });
            });
        }
    };

    public isComposing(event: React.KeyboardEvent): boolean {
        // checking the event.isComposing flag just in case any browser out there
        // emits events related to the composition after compositionend
        // has been fired
        return !!(this.isIMEComposing || (event.nativeEvent && event.nativeEvent.isComposing));
    }

    private onCutCopy = (event: ClipboardEvent, type: string): void => {
        const selection = document.getSelection();
        const text = selection.toString();
        if (text) {
            const { model } = this.props;
            const range = getRangeForSelection(this.editorRef.current, model, selection);
            const selectedParts = range.parts.map(p => p.serialize());
            event.clipboardData.setData("application/x-element-composer", JSON.stringify(selectedParts));
            event.clipboardData.setData("text/plain", text); // so plain copy/paste works
            if (type === "cut") {
                // Remove the text, updating the model as appropriate
                this.modifiedFlag = true;
                replaceRangeAndMoveCaret(range, []);
            }
            event.preventDefault();
        }
    };

    private onCopy = (event: ClipboardEvent): void => {
        this.onCutCopy(event, "copy");
    };

    private onCut = (event: ClipboardEvent): void => {
        this.onCutCopy(event, "cut");
    };

    private onPaste = (event: ClipboardEvent<HTMLDivElement>): boolean => {
        event.preventDefault(); // we always handle the paste ourselves
        if (this.props.onPaste && this.props.onPaste(event, this.props.model)) {
            // to prevent double handling, allow props.onPaste to skip internal onPaste
            return true;
        }

        const { model } = this.props;
        const { partCreator } = model;
        const partsText = event.clipboardData.getData("application/x-element-composer");
        let parts;
        if (partsText) {
            const serializedTextParts = JSON.parse(partsText);
            const deserializedParts = serializedTextParts.map(p => partCreator.deserializePart(p));
            parts = deserializedParts;
        } else {
            const text = event.clipboardData.getData("text/plain");
            parts = parsePlainTextMessage(text, partCreator);
        }
        this.modifiedFlag = true;
        const range = getRangeForSelection(this.editorRef.current, model, document.getSelection());
        replaceRangeAndMoveCaret(range, parts);
    };

    private onInput = (event: Partial<InputEvent>): void => {
        // ignore any input while doing IME compositions
        if (this.isIMEComposing) {
            return;
        }
        this.modifiedFlag = true;
        const sel = document.getSelection();
        const { caret, text } = getCaretOffsetAndText(this.editorRef.current, sel);
        this.props.model.update(text, event.inputType, caret);
    };

    private insertText(textToInsert: string, inputType = "insertText"): void {
        const sel = document.getSelection();
        const { caret, text } = getCaretOffsetAndText(this.editorRef.current, sel);
        const newText = text.substr(0, caret.offset) + textToInsert + text.substr(caret.offset);
        caret.offset += textToInsert.length;
        this.modifiedFlag = true;
        this.props.model.update(newText, inputType, caret);
    }

    // this is used later to see if we need to recalculate the caret
    // on selectionchange. If it is just a consequence of typing
    // we don't need to. But if the user is navigating the caret without input
    // we need to recalculate it, to be able to know where to insert content after
    // losing focus
    private setLastCaretFromPosition(position: DocumentPosition): void {
        const { model } = this.props;
        this._isCaretAtEnd = position.isAtEnd(model);
        this.lastCaret = position.asOffset(model);
        this.lastSelection = cloneSelection(document.getSelection());
    }

    private refreshLastCaretIfNeeded(): DocumentOffset {
        // XXX: needed when going up and down in editing messages ... not sure why yet
        // because the editors should stop doing this when when blurred ...
        // maybe it's on focus and the _editorRef isn't available yet or something.
        if (!this.editorRef.current) {
            return;
        }
        const selection = document.getSelection();
        if (!this.lastSelection || !selectionEquals(this.lastSelection, selection)) {
            this.lastSelection = cloneSelection(selection);
            const { caret, text } = getCaretOffsetAndText(this.editorRef.current, selection);
            this.lastCaret = caret;
            this._isCaretAtEnd = caret.offset === text.length;
        }
        return this.lastCaret;
    }

    public clearUndoHistory(): void {
        this.historyManager.clear();
    }

    public getCaret(): DocumentOffset {
        return this.lastCaret;
    }

    public isSelectionCollapsed(): boolean {
        return !this.lastSelection || this.lastSelection.isCollapsed;
    }

    public isCaretAtStart(): boolean {
        return this.getCaret().offset === 0;
    }

    public isCaretAtEnd(): boolean {
        return this._isCaretAtEnd;
    }

    private onBlur = (): void => {
        document.removeEventListener("selectionchange", this.onSelectionChange);
    };

    private onFocus = (): void => {
        document.addEventListener("selectionchange", this.onSelectionChange);
        // force to recalculate
        this.lastSelection = null;
        this.refreshLastCaretIfNeeded();
    };

    private onSelectionChange = (): void => {
        const { isEmpty } = this.props.model;

        this.refreshLastCaretIfNeeded();
        const selection = document.getSelection();
        if (this.hasTextSelected && selection.isCollapsed) {
            this.hasTextSelected = false;
            if (this.formatBarRef.current) {
                this.formatBarRef.current.hide();
            }
        } else if (!selection.isCollapsed && !isEmpty) {
            this.hasTextSelected = true;
            if (this.formatBarRef.current) {
                const selectionRect = selection.getRangeAt(0).getBoundingClientRect();
                this.formatBarRef.current.showAt(selectionRect);
            }
        }
    };

    private onKeyDown = (event: React.KeyboardEvent): void => {
        const model = this.props.model;
        let handled = false;

        if (this.state.surroundWith && document.getSelection().type !== "Caret") {
            // This surrounds the selected text with a character. This is
            // intentionally left out of the keybinding manager as the keybinds
            // here shouldn't be changeable

            const selectionRange = getRangeForSelection(
                this.editorRef.current,
                this.props.model,
                document.getSelection(),
            );
            // trim the range as we want it to exclude leading/trailing spaces
            selectionRange.trim();

            if ([...SURROUND_WITH_DOUBLE_CHARACTERS.keys(), ...SURROUND_WITH_CHARACTERS].includes(event.key)) {
                this.historyManager.ensureLastChangesPushed(this.props.model);
                this.modifiedFlag = true;
                toggleInlineFormat(selectionRange, event.key, SURROUND_WITH_DOUBLE_CHARACTERS.get(event.key));
                handled = true;
            }
        }

        const autocompleteAction = getKeyBindingsManager().getAutocompleteAction(event);
        if (model.autoComplete?.hasCompletions()) {
            const autoComplete = model.autoComplete;
            switch (autocompleteAction) {
                case AutocompleteAction.ForceComplete:
                case AutocompleteAction.Complete:
                    this.historyManager.ensureLastChangesPushed(this.props.model);
                    this.modifiedFlag = true;
                    autoComplete.confirmCompletion();
                    handled = true;
                    break;
                case AutocompleteAction.PrevSelection:
                    autoComplete.selectPreviousSelection();
                    handled = true;
                    break;
                case AutocompleteAction.NextSelection:
                    autoComplete.selectNextSelection();
                    handled = true;
                    break;
                case AutocompleteAction.Cancel:
                    autoComplete.onEscape(event);
                    handled = true;
                    break;
                default:
                    return; // don't preventDefault on anything else
            }
        } else if (autocompleteAction === AutocompleteAction.ForceComplete && !this.state.showVisualBell) {
            // there is no current autocomplete window, try to open it
            this.tabCompleteName();
            handled = true;
        } else if (event.key === Key.BACKSPACE || event.key === Key.DELETE) {
            this.formatBarRef.current.hide();
        }

        if (handled) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        const action = getKeyBindingsManager().getMessageComposerAction(event);
        switch (action) {
            case MessageComposerAction.FormatBold:
                this.onFormatAction(Formatting.Bold);
                handled = true;
                break;
            case MessageComposerAction.FormatItalics:
                this.onFormatAction(Formatting.Italics);
                handled = true;
                break;
            case MessageComposerAction.FormatQuote:
                this.onFormatAction(Formatting.Quote);
                handled = true;
                break;
            case MessageComposerAction.EditRedo:
                if (this.historyManager.canRedo()) {
                    const { parts, caret } = this.historyManager.redo();
                    // pass matching inputType so historyManager doesn't push echo
                    // when invoked from rerender callback.
                    model.reset(parts, caret, "historyRedo");
                }
                handled = true;
                break;
            case MessageComposerAction.EditUndo:
                if (this.historyManager.canUndo()) {
                    const { parts, caret } = this.historyManager.undo(this.props.model);
                    // pass matching inputType so historyManager doesn't push echo
                    // when invoked from rerender callback.
                    model.reset(parts, caret, "historyUndo");
                }
                handled = true;
                break;
            case MessageComposerAction.NewLine:
                this.insertText("\n");
                handled = true;
                break;
            case MessageComposerAction.MoveCursorToStart:
                setSelection(this.editorRef.current, model, {
                    index: 0,
                    offset: 0,
                });
                handled = true;
                break;
            case MessageComposerAction.MoveCursorToEnd:
                setSelection(this.editorRef.current, model, {
                    index: model.parts.length - 1,
                    offset: model.parts[model.parts.length - 1].text.length,
                });
                handled = true;
                break;
        }
        if (handled) {
            event.preventDefault();
            event.stopPropagation();
        }
    };

    private async tabCompleteName(): Promise<void> {
        try {
            await new Promise<void>(resolve => this.setState({ showVisualBell: false }, resolve));
            const { model } = this.props;
            const caret = this.getCaret();
            const position = model.positionForOffset(caret.offset, caret.atNodeEnd);
            const range = model.startRange(position);
            range.expandBackwardsWhile((index, offset, part) => {
                return part.text[offset] !== " " && part.text[offset] !== "+" && (
                    part.type === Type.Plain ||
                    part.type === Type.PillCandidate ||
                    part.type === Type.Command
                );
            });
            const { partCreator } = model;
            // await for auto-complete to be open
            await model.transform(() => {
                const addedLen = range.replace([partCreator.pillCandidate(range.text)]);
                return model.positionForOffset(caret.offset + addedLen, true);
            });

            // Don't try to do things with the autocomplete if there is none shown
            if (model.autoComplete) {
                await model.autoComplete.startSelection();
                if (!model.autoComplete.hasSelection()) {
                    this.setState({ showVisualBell: true });
                    model.autoComplete.close();
                }
            } else {
                this.setState({ showVisualBell: true });
            }
        } catch (err) {
            logger.error(err);
        }
    }

    public isModified(): boolean {
        return this.modifiedFlag;
    }

    private onAutoCompleteConfirm = (completion: ICompletion): void => {
        this.modifiedFlag = true;
        this.props.model.autoComplete.onComponentConfirm(completion);
    };

    private onAutoCompleteSelectionChange = (completionIndex: number): void => {
        this.modifiedFlag = true;
        this.setState({ completionIndex });
    };

    private configureEmoticonAutoReplace = (): void => {
        this.props.model.setTransformCallback(this.transform);
    };

    private configureShouldShowPillAvatar = (): void => {
        const showPillAvatar = SettingsStore.getValue("Pill.shouldShowPillAvatar");
        this.setState({ showPillAvatar });
    };

    private surroundWithSettingChanged = () => {
        const surroundWith = SettingsStore.getValue("MessageComposerInput.surroundWith");
        this.setState({ surroundWith });
    };

    private transform = (documentPosition: DocumentPosition): void => {
        const shouldReplace = SettingsStore.getValue('MessageComposerInput.autoReplaceEmoji');
        if (shouldReplace) this.replaceEmoticon(documentPosition, REGEX_EMOTICON_WHITESPACE);
    };

    componentWillUnmount() {
        document.removeEventListener("selectionchange", this.onSelectionChange);
        this.editorRef.current.removeEventListener("input", this.onInput, true);
        this.editorRef.current.removeEventListener("compositionstart", this.onCompositionStart, true);
        this.editorRef.current.removeEventListener("compositionend", this.onCompositionEnd, true);
        SettingsStore.unwatchSetting(this.emoticonSettingHandle);
        SettingsStore.unwatchSetting(this.shouldShowPillAvatarSettingHandle);
        SettingsStore.unwatchSetting(this.surroundWithHandle);
    }

    componentDidMount() {
        const model = this.props.model;
        model.setUpdateCallback(this.updateEditorState);
        const partCreator = model.partCreator;
        // TODO: does this allow us to get rid of EditorStateTransfer?
        // not really, but we could not serialize the parts, and just change the autoCompleter
        partCreator.setAutoCompleteCreator(getAutoCompleteCreator(
            () => this.autocompleteRef.current,
            query => new Promise(resolve => this.setState({ query }, resolve)),
        ));
        // initial render of model
        this.updateEditorState(this.getInitialCaretPosition());
        // attach input listener by hand so React doesn't proxy the events,
        // as the proxied event doesn't support inputType, which we need.
        this.editorRef.current.addEventListener("input", this.onInput, true);
        this.editorRef.current.addEventListener("compositionstart", this.onCompositionStart, true);
        this.editorRef.current.addEventListener("compositionend", this.onCompositionEnd, true);
        this.editorRef.current.focus();
    }

    private getInitialCaretPosition(): DocumentPosition {
        let caretPosition: DocumentPosition;
        if (this.props.initialCaret) {
            // if restoring state from a previous editor,
            // restore caret position from the state
            const caret = this.props.initialCaret;
            caretPosition = this.props.model.positionForOffset(caret.offset, caret.atNodeEnd);
        } else {
            // otherwise, set it at the end
            caretPosition = this.props.model.getPositionAtEnd();
        }
        return caretPosition;
    }

    private onFormatAction = (action: Formatting): void => {
        const range = getRangeForSelection(this.editorRef.current, this.props.model, document.getSelection());
        // trim the range as we want it to exclude leading/trailing spaces
        range.trim();

        if (range.length === 0) {
            return;
        }

        this.historyManager.ensureLastChangesPushed(this.props.model);
        this.modifiedFlag = true;
        switch (action) {
            case Formatting.Bold:
                toggleInlineFormat(range, "**");
                break;
            case Formatting.Italics:
                toggleInlineFormat(range, "_");
                break;
            case Formatting.Strikethrough:
                toggleInlineFormat(range, "<del>", "</del>");
                break;
            case Formatting.Code:
                formatRangeAsCode(range);
                break;
            case Formatting.Quote:
                formatRangeAsQuote(range);
                break;
        }
    };

    render() {
        let autoComplete;
        if (this.state.autoComplete) {
            const query = this.state.query;
            const queryLen = query.length;
            autoComplete = (<div className="mx_BasicMessageComposer_AutoCompleteWrapper">
                <Autocomplete
                    ref={this.autocompleteRef}
                    query={query}
                    onConfirm={this.onAutoCompleteConfirm}
                    onSelectionChange={this.onAutoCompleteSelectionChange}
                    selection={{ beginning: true, end: queryLen, start: queryLen }}
                    room={this.props.room}
                />
            </div>);
        }
        const wrapperClasses = classNames("mx_BasicMessageComposer", {
            "mx_BasicMessageComposer_input_error": this.state.showVisualBell,
        });
        const classes = classNames("mx_BasicMessageComposer_input", {
            "mx_BasicMessageComposer_input_shouldShowPillAvatar": this.state.showPillAvatar,
            "mx_BasicMessageComposer_input_disabled": this.props.disabled,
        });

        const shortcuts = {
            [Formatting.Bold]: ctrlShortcutLabel("B"),
            [Formatting.Italics]: ctrlShortcutLabel("I"),
            [Formatting.Quote]: ctrlShortcutLabel(">"),
        };

        const { completionIndex } = this.state;
        const hasAutocomplete = Boolean(this.state.autoComplete);
        let activeDescendant;
        if (hasAutocomplete && completionIndex >= 0) {
            activeDescendant = generateCompletionDomId(completionIndex);
        }

        return (<div className={wrapperClasses}>
            { autoComplete }
            <MessageComposerFormatBar ref={this.formatBarRef} onAction={this.onFormatAction} shortcuts={shortcuts} />
            <div
                className={classes}
                contentEditable={this.props.disabled ? null : true}
                tabIndex={0}
                onBlur={this.onBlur}
                onFocus={this.onFocus}
                onCopy={this.onCopy}
                onCut={this.onCut}
                onPaste={this.onPaste}
                onKeyDown={this.onKeyDown}
                ref={this.editorRef}
                aria-label={this.props.label}
                role="textbox"
                aria-multiline="true"
                aria-autocomplete="list"
                aria-haspopup="listbox"
                aria-expanded={hasAutocomplete}
                aria-owns="mx_Autocomplete"
                aria-activedescendant={activeDescendant}
                dir="auto"
                aria-disabled={this.props.disabled}
            />
        </div>);
    }

    public focus(): void {
        this.editorRef.current.focus();
    }

    public insertMention(userId: string): void {
        this.modifiedFlag = true;
        const { model } = this.props;
        const { partCreator } = model;
        const member = this.props.room.getMember(userId);
        const displayName = member ?
            member.rawDisplayName : userId;
        const caret = this.getCaret();
        const position = model.positionForOffset(caret.offset, caret.atNodeEnd);
        // Insert suffix only if the caret is at the start of the composer
        const parts = partCreator.createMentionParts(caret.offset === 0, displayName, userId);
        model.transform(() => {
            const addedLen = model.insert(parts, position);
            return model.positionForOffset(caret.offset + addedLen, true);
        });
        // refocus on composer, as we just clicked "Mention"
        this.focus();
    }

    public insertQuotedMessage(event: MatrixEvent): void {
        this.modifiedFlag = true;
        const { model } = this.props;
        const { partCreator } = model;
        const quoteParts = parseEvent(event, partCreator, { isQuotedMessage: true });
        // add two newlines
        quoteParts.push(partCreator.newline());
        quoteParts.push(partCreator.newline());
        model.transform(() => {
            const addedLen = model.insert(quoteParts, model.positionForOffset(0));
            return model.positionForOffset(addedLen, true);
        });
        // refocus on composer, as we just clicked "Quote"
        this.focus();
    }

    public insertPlaintext(text: string): void {
        this.modifiedFlag = true;
        const { model } = this.props;
        const { partCreator } = model;
        const caret = this.getCaret();
        const position = model.positionForOffset(caret.offset, caret.atNodeEnd);
        model.transform(() => {
            const addedLen = model.insert([partCreator.plain(text)], position);
            return model.positionForOffset(caret.offset + addedLen, true);
        });
    }
}
