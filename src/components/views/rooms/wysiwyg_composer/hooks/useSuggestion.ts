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
import { SyntheticEvent, useState } from "react";

/**
 * Information about the current state of the `useSuggestion` hook.
 */
export type Suggestion = {
    /**
     * The information in a `MappedSuggestion` is sufficient to generate a query for the autocomplete
     * component but more information is required to allow manipulation of the correct part of the DOM
     * when selecting an option from the autocomplete. These three pieces of information allow us to
     * do that.
     */
    mappedSuggestion: MappedSuggestion;
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
 * - `handleMention`: a function that will insert @ or # mentions which are selected from
 * the autocomplete into the composer, given an href, the text to display, and any additional attributes
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
    handleMention: (href: string, displayName: string, attributes: Attributes) => void;
    handleCommand: (text: string) => void;
    onSelect: (event: SyntheticEvent<HTMLDivElement>) => void;
    suggestion: MappedSuggestion | null;
} {
    const [suggestionData, setSuggestionData] = useState<SuggestionState>(null);

    // We create a `selectionchange` handler here because we need to know when the user has moved the cursor,
    // we can not depend on input events only
    const onSelect = (): void => processSelectionChange(editorRef, setSuggestionData);

    const handleMention = (href: string, displayName: string, attributes: Attributes): void =>
        processMention(href, displayName, attributes, suggestionData, setSuggestionData, setText);

    const handleCommand = (replacementText: string): void =>
        processCommand(replacementText, suggestionData, setSuggestionData, setText);

    return {
        suggestion: suggestionData?.mappedSuggestion ?? null,
        handleCommand,
        handleMention,
        onSelect,
    };
}

/**
 * When the selection changes inside the current editor, check to see if the cursor is inside
 * something that could be a command or a mention and update the suggestion state if so
 *
 * @param editorRef - ref to the composer
 * @param setSuggestionData - the setter for the suggestion state
 */
export function processSelectionChange(
    editorRef: React.RefObject<HTMLDivElement>,
    setSuggestionData: React.Dispatch<React.SetStateAction<SuggestionState>>,
): void {
    const selection = document.getSelection();

    // return early if we do not have a current editor ref with a cursor selection inside a text node
    if (
        editorRef.current === null ||
        selection === null ||
        !selection.isCollapsed ||
        selection.anchorNode?.nodeName !== "#text"
    ) {
        setSuggestionData(null);
        return;
    }

    // from here onwards we have a cursor inside a text node
    const { anchorNode: currentNode, anchorOffset: currentOffset } = selection;

    // if we have no text content, return, clearing the suggestion state
    if (currentNode.textContent === null) {
        setSuggestionData(null);
        return;
    }

    const firstTextNode = document.createNodeIterator(editorRef.current, NodeFilter.SHOW_TEXT).nextNode();
    const isFirstTextNode = currentNode === firstTextNode;
    const foundSuggestion = findSuggestionInText(currentNode.textContent, currentOffset, isFirstTextNode);

    // if we have not found a suggestion, return, clearing the suggestion state
    if (foundSuggestion === null) {
        setSuggestionData(null);
        return;
    }

    setSuggestionData({
        mappedSuggestion: foundSuggestion.mappedSuggestion,
        node: currentNode,
        startOffset: foundSuggestion.startOffset,
        endOffset: foundSuggestion.endOffset,
    });
}

/**
 * Replaces the relevant part of the editor text with a link representing a mention after it
 * is selected from the autocomplete.
 *
 * @param href - the href that the inserted link will use
 * @param displayName - the text content of the link
 * @param attributes - additional attributes to add to the link, can include data-* attributes
 * @param suggestionData - representation of the part of the DOM that will be replaced
 * @param setSuggestionData - setter function to set the suggestion state
 * @param setText - setter function to set the content of the composer
 */
export function processMention(
    href: string,
    displayName: string,
    attributes: Attributes, // these will be used when formatting the link as a pill
    suggestionData: SuggestionState,
    setSuggestionData: React.Dispatch<React.SetStateAction<SuggestionState>>,
    setText: (text: string) => void,
): void {
    // if we do not have a suggestion, return early
    if (suggestionData === null) {
        return;
    }

    const { node } = suggestionData;

    const textBeforeReplacement = node.textContent?.slice(0, suggestionData.startOffset) ?? "";
    const textAfterReplacement = node.textContent?.slice(suggestionData.endOffset) ?? "";

    // TODO replace this markdown style text insertion with a pill representation
    const newText = `[${displayName}](<${href}>) `;
    const newCursorOffset = textBeforeReplacement.length + newText.length;
    const newContent = textBeforeReplacement + newText + textAfterReplacement;

    // insert the new text, move the cursor, set the text state, clear the suggestion state
    node.textContent = newContent;
    document.getSelection()?.setBaseAndExtent(node, newCursorOffset, node, newCursorOffset);
    setText(newContent);
    setSuggestionData(null);
}

/**
 * Replaces the relevant part of the editor text with the replacement text after a command is selected
 * from the autocomplete.
 *
 * @param replacementText - the text that we will insert into the DOM
 * @param suggestionData - representation of the part of the DOM that will be replaced
 * @param setSuggestionData - setter function to set the suggestion state
 * @param setText - setter function to set the content of the composer
 */
export function processCommand(
    replacementText: string,
    suggestionData: SuggestionState,
    setSuggestionData: React.Dispatch<React.SetStateAction<SuggestionState>>,
    setText: (text: string) => void,
): void {
    // if we do not have a suggestion, return early
    if (suggestionData === null) {
        return;
    }

    const { node } = suggestionData;

    // for a command, we know we start at the beginning of the text node, so build the replacement
    // string (note trailing space) and manually adjust the node's textcontent
    const newContent = `${replacementText} `;
    node.textContent = newContent;

    // then set the cursor to the end of the node, update the `content` state in the usePlainTextListeners
    // hook and clear the suggestion from state
    document.getSelection()?.setBaseAndExtent(node, newContent.length, node, newContent.length);
    setText(newContent);
    setSuggestionData(null);
}

/**
 * Given some text content from a node and the cursor position, search through the content
 * to find a mention or a command. If there is one present, return a slice of the content
 * from the special character to the end of the input
 *
 * @param text - the text content of a node
 * @param offset - the current cursor offset position within the node
 * @param isFirstTextNode - whether or not the node is the first text node in the editor, used to determine
 * if a command suggestion is found or not
 * @returns null if no mention or command is found, otherwise the `MappedSuggestion` along with it's start and end offsets
 */
export function findSuggestionInText(
    text: string,
    offset: number,
    isFirstTextNode: boolean,
): { mappedSuggestion: MappedSuggestion; startOffset: number; endOffset: number } | null {
    // Return null early if the offset is outside the content
    if (offset < 0 || offset > text.length) {
        return null;
    }

    // As we will be searching in both directions from the cursor, set the starting indices
    // based on the current cursor offset
    let startCharIndex = offset - 1;
    let endCharIndex = offset;

    while (shouldDecrementStartIndex(text, startCharIndex)) {
        // Special case - if we hit some whitespace, return null. This is to catch cases
        // where user types a special character then whitespace
        if (/\s/.test(text[startCharIndex])) {
            return null;
        }
        startCharIndex--;
    }

    while (shouldIncrementEndIndex(text, endCharIndex)) {
        endCharIndex++;
    }

    // We have looped throught the text in both directions from the current cursor position
    // whilst looking for special characters.
    // We do not have a command or mention if:
    // - the start or ending indices are outside the string
    if (startCharIndex < 0 || endCharIndex > text.length) return null;

    const suggestionText = text.slice(startCharIndex, endCharIndex);
    const mappedSuggestion = getMappedSuggestion(suggestionText);

    // We do not have a command if:
    // - the starting index is anything other than 0 (they can only appear at the start of a message)
    // - there is more text following the command (eg `/spo asdf|` should not be interpreted as
    //   something requiring autocomplete)
    if (
        mappedSuggestion.type === "command" &&
        (!isFirstTextNode || startCharIndex !== 0 || endCharIndex !== text.length)
    ) {
        return null;
    }

    return { mappedSuggestion, startOffset: startCharIndex, endOffset: startCharIndex + suggestionText.length };
}

/**
 * Associated function for findSuggestionInText. Checks the character at the current location
 * to determine if the search loop should continue.
 *
 * @param text - text content to check for mentions or commands
 * @param index - the current index to check
 * @returns true if check should keep moving left, false otherwise
 */
function shouldDecrementStartIndex(text: string, index: number): boolean {
    // If the index is outside the string, return false
    if (index < 0) return false;

    // We are inside the string so can guarantee that there is a character at the index
    // The preceding character could be undefined if index === 0
    const mentionOrCommandChar = /[@#/]/;
    const currentChar = text[index];
    const precedingChar = text[index - 1] ?? "";

    const currentCharIsMentionOrCommand = mentionOrCommandChar.test(currentChar);

    // If we have not found a special character, continue searching
    if (!currentCharIsMentionOrCommand) return true;

    // If we have found a special character, continue searching if the preceding character is not whitespace
    // This enables us to handle any strings containing the special characters, such as email addresses
    return /\S/.test(precedingChar);
}

/**
 * Associated function for findSuggestionInText. Checks the character at the current location
 * to determine if the search loop should continue.
 *
 * @param text - text content to check for mentions or commands
 * @param index - the current index to check
 * @returns true if check should keep moving right, false otherwise
 */
function shouldIncrementEndIndex(text: string, index: number): boolean {
    // If the index is outside the string, return false
    if (index >= text.length) return false;

    // We are inside the string so can guarantee that there is a character at the index
    // Keep moving right if the current character is not a space
    return /\S/.test(text[index]);
}

/**
 * Given a string that represents a suggestion in the composer, return an object that represents
 * that text as a `MappedSuggestion`.
 *
 * @param suggestionText - string that could be a mention of a command type suggestion
 * @returns an object representing the `MappedSuggestion` from that string
 */
export function getMappedSuggestion(suggestionText: string): MappedSuggestion {
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
