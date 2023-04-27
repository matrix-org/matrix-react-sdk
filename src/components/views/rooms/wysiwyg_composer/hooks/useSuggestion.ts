/*
Copyright 2023 The Matrix.org Foundation C.I.C.

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

import { Attributes, MappedSuggestion } from "@matrix-org/matrix-wysiwyg";
import { SyntheticEvent, useMemo, useState } from "react";

/**
 * Information about the current state of the `useSuggestion` hook.
 */
export type Suggestion = MappedSuggestion & {
    /**
     * The information in a `MappedSuggestion` is sufficient to generate a query for the autocomplete
     * component but more information is required to allow manipulation of the correct part of the DOM
     * when selecting an option from the autocomplete. These three pieces of information allow us to
     * do that.
     */
    node: Node;
    startOffset: number;
    endOffset: number;
};
type SuggestionState = Suggestion | null;

/**
 * React hook to allow tracking and replacing of mentions and commands in a div element
 *
 * @param editorRef - a ref to the div that is the composer textbox
 * @param setText - setter function to set the content of the composer
 * @returns
 * - `handleMention`: TODO a function that will insert @ or # mentions which are selected from
 * the autocomplete into the composer
 * - `handleCommand`: a function that will replace the content of the composer with the given replacement text.
 * Can be used to process autocomplete of slash commands
 * - `onSelect`: a selection change listener to be attached to the plain text composer
 * - `suggestion`: if the cursor is inside something that could be interpreted as a command or a mention,
 * this will be an object representing that command or mention, otherwise it is null
 */
export function useSuggestion(
    editorRef: React.RefObject<HTMLDivElement>,
    setText: (text: string) => void,
): {
    handleMention: (link: string, text: string, attributes: Attributes) => void;
    handleCommand: (text: string) => void;
    onSelect: (event: SyntheticEvent<HTMLDivElement>) => void;
    suggestion: MappedSuggestion | null;
} {
    const [suggestion, setSuggestion] = useState<SuggestionState>(null);

    // We create a `selectionchange` handler here because we need to know when the user has moved the cursor,
    // we can not depend on input events only
    const onSelect = (): void => processSelectionChange(editorRef, setSuggestion);

    const handleMention = (href: string, displayName: string, attributes: Attributes): void =>
        processMention(href, displayName, attributes, suggestion, setSuggestion, setText);

    const handleCommand = (replacementText: string): void =>
        processCommand(replacementText, suggestion, setSuggestion, setText);

    const memoizedMappedSuggestion: MappedSuggestion | null = useMemo(() => {
        return suggestion !== null
            ? { keyChar: suggestion.keyChar, type: suggestion.type, text: suggestion.text }
            : null;
    }, [suggestion]);

    return {
        suggestion: memoizedMappedSuggestion,
        handleCommand,
        handleMention,
        onSelect,
    };
}

/**
 * Replaces the relevant part of the editor text with a link representing a mention after it
 * is selected from the autocomplete.
 *
 * @param href - the href that the inserted link will use
 * @param displayName - the text content of the link
 * @param attributes - additional attributes to add to the link, can include data-* attributes
 * @param suggestion - representation of the part of the DOM that will be replaced
 * @param setSuggestion - setter function to set the suggestion state
 * @param setText - setter function to set the content of the composer
 */
export function processMention(
    href: string,
    displayName: string,
    attributes: Attributes, // these will be used when formatting the link as a pill
    suggestion: SuggestionState,
    setSuggestion: React.Dispatch<React.SetStateAction<SuggestionState>>,
    setText: (text: string) => void,
): void {
    // if we do not have any of the values we need to do the work, do nothing
    if (suggestion === null) {
        return;
    }

    const { node } = suggestion;

    const textBeforeReplacement = node.textContent?.slice(0, suggestion.startOffset) ?? "";
    const textAfterReplacement = node.textContent?.slice(suggestion.endOffset) ?? "";

    // TODO replace this markdown style text insertion with a pill representation
    const newText = `[${displayName}](<${href}>) `;
    const newCursorOffset = textBeforeReplacement.length + newText.length;
    const newContent = textBeforeReplacement + newText + textAfterReplacement;

    // insert the new text, move the cursor, set the text state, clear the suggestion state
    node.textContent = newContent;
    document.getSelection()?.setBaseAndExtent(node, newCursorOffset, node, newCursorOffset);
    setText(newContent);
    setSuggestion(null);
}

/**
 * Replaces the relevant part of the editor text with the replacement text after a command is selected
 * from the autocomplete.
 *
 * @param replacementText - the text that we will insert into the DOM
 * @param suggestion - representation of the part of the DOM that will be replaced
 * @param setSuggestion - setter function to set the suggestion state
 * @param setText - setter function to set the content of the composer
 */
export function processCommand(
    replacementText: string,
    suggestion: SuggestionState,
    setSuggestion: React.Dispatch<React.SetStateAction<SuggestionState>>,
    setText: (text: string) => void,
): void {
    // if we do not have a suggestion, return early
    if (suggestion === null) {
        return;
    }

    const { node } = suggestion;

    // for a command, we know we start at the beginning of the text node, so build the replacement
    // string (note trailing space) and manually adjust the node's textcontent
    const newContent = `${replacementText} `;
    node.textContent = newContent;

    // then set the cursor to the end of the node, update the `content` state in the usePlainTextListeners
    // hook and clear the suggestion from state
    document.getSelection()?.setBaseAndExtent(node, newContent.length, node, newContent.length);
    setText(newContent);
    setSuggestion(null);
}

/**
 * Given some text content from a node and the cursor position, search through the content
 * to find a mention or a command. If there is one present, return a slice of the content
 * from the special character to the end of the input
 *
 * @param text - the text content of a node
 * @param offset - the current cursor offset position
 * @returns an empty string if no mention or command is found, otherwise the mention/command substring
 */
export function findMentionOrCommand(text: string, offset: number): { text: string; startOffset: number } | null {
    // return early if the offset is outside the content
    if (offset < 0 || offset > text.length) {
        return null;
    }

    let startCharIndex = offset - 1; // due to us searching left from here
    let endCharIndex = offset; // due to us searching right from here

    const keepMovingLeft = (): boolean => {
        const specialStartChars = /[@#/]/;
        const currentChar = text[startCharIndex];
        const precedingChar = text[startCharIndex - 1] ?? "";

        const currentCharIsSpecial = specialStartChars.test(currentChar);

        const shouldIgnoreMentionChar = (currentChar === "@" || currentChar === "#") && /\S/.test(precedingChar);

        return startCharIndex >= 0 && (!currentCharIsSpecial || shouldIgnoreMentionChar);
    };

    const keepMovingRight = (): boolean => {
        const specialEndChars = /\s/;
        return !specialEndChars.test(text[endCharIndex]) && endCharIndex < text.length;
    };

    while (keepMovingLeft()) {
        // special case - if we hit some whitespace, just return null, this is to catch cases
        // where user types a special character then whitespace
        if (/\s/.test(text[startCharIndex])) {
            return null;
        }
        startCharIndex--;
    }

    while (keepMovingRight()) {
        endCharIndex++;
    }

    // we have looped through the first part of the string => if we get a minus one
    // as the index, we haven't found a start point, so return
    // alternatively if we have found command (/) and the startCharIndex isn't 0, return ""
    // or also if we hav found a command and the end index isn't the end of the content
    const startCharIsCommand = text[startCharIndex] === "/";
    if (
        startCharIndex < 0 ||
        (startCharIsCommand && startCharIndex !== 0) ||
        (startCharIsCommand && endCharIndex !== text.length)
    ) {
        return null;
    } else {
        return { text: text.slice(startCharIndex, endCharIndex), startOffset: startCharIndex };
    }
}

/**
 * When the selection changes inside the current editor, check to see if the cursor is inside
 * something that could be a command or a mention and update the suggestion state if so
 *
 * @param editorRef - ref to the composer
 * @param setSuggestion - the setter for the suggestion state
 */
export function processSelectionChange(
    editorRef: React.RefObject<HTMLDivElement>,
    setSuggestion: React.Dispatch<React.SetStateAction<SuggestionState>>,
): void {
    const selection = document.getSelection();

    // return early if we do not have a current editor ref with a cursor selection inside a text node
    if (
        editorRef.current === null ||
        selection === null ||
        !selection.isCollapsed ||
        selection.anchorNode?.nodeName !== "#text"
    ) {
        setSuggestion(null);
        return;
    }

    // here we have established that we have a cursor and both anchor and focus nodes in the selection
    // are the same node, so rename to `currentNode` and `currentOffset` for subsequent use
    const { anchorNode: currentNode, anchorOffset: currentOffset } = selection;

    // first check is that the text node is the first text node of the editor, as adding paragraphs can result
    // in nested <p> tags inside the editor <div>
    const firstTextNode = document.createNodeIterator(editorRef.current, NodeFilter.SHOW_TEXT).nextNode();

    // if we have no text content, return
    if (currentNode.textContent === null) return;

    const mentionOrCommand = findMentionOrCommand(currentNode.textContent, currentOffset);

    // if we don't have any mentionsOrCommands, return, clearing the suggestion state
    if (mentionOrCommand === null) {
        setSuggestion(null);
        return;
    }

    // else we do have something, so get the constituent parts
    const suggestionParts = getMentionOrCommandParts(mentionOrCommand.text);

    // if we have a command at the beginning of a node, but that node isn't the first text node, return
    if (suggestionParts.type === "command" && currentNode !== firstTextNode) {
        setSuggestion(null);
        return;
    } else {
        // else, we have found a mention or a command
        setSuggestion({
            ...suggestionParts,
            node: selection.anchorNode,
            startOffset: mentionOrCommand.startOffset,
            endOffset: mentionOrCommand.startOffset + mentionOrCommand.text.length,
        });
    }
}

/**
 * Given a string that represents a suggestion in the composer, return an object that represents
 * that text as a `MappedSuggestion`.
 *
 * @param suggestionText - string that could be a mention of a command type suggestion
 * @returns an object representing the `MappedSuggestion` from that string
 */
export function getMentionOrCommandParts(suggestionText: string): MappedSuggestion {
    const firstChar = suggestionText.charAt(0);
    const restOfString = suggestionText.slice(1);

    switch (firstChar) {
        case "/":
            return { keyChar: firstChar, text: restOfString, type: "command" };
        case "#":
        case "@":
            return { keyChar: firstChar, text: restOfString, type: "mention" };
        default:
            return { keyChar: "", text: "", type: "unknown" };
    }
}
