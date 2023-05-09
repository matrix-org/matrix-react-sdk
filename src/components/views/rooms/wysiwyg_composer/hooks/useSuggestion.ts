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
    setText: (text?: string) => void,
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

    // if we have no text content, return
    if (currentNode.textContent === null) return;

    const foundSuggestion = findSuggestionInText(currentNode.textContent, currentOffset);

    // if we have not found a suggestion, return, clearing the suggestion state
    if (foundSuggestion === null) {
        setSuggestion(null);
        return;
    }

    // else we do have something, so get the constituent parts
    const mappedSuggestionParts = getMappedSuggestion(foundSuggestion.text);

    // if we have a command at the beginning of a node, but that node isn't the first text node, return
    const firstTextNode = document.createNodeIterator(editorRef.current, NodeFilter.SHOW_TEXT).nextNode();
    if (mappedSuggestionParts.type === "command" && currentNode !== firstTextNode) {
        setSuggestion(null);
        return;
    } else {
        // else, we have found a mention or a command
        setSuggestion({
            ...mappedSuggestionParts,
            node: currentNode,
            startOffset: foundSuggestion.startOffset,
            endOffset: foundSuggestion.endOffset,
        });
    }
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
    setText: (text?: string) => void,
): void {
    // if we do not have a suggestion, return early
    if (suggestion === null) {
        return;
    }

    const { node } = suggestion;

    // create an <a> element with the required attributes to allow us to display the mention as a pill
    const link = document.createElement("a");
    link.setAttribute("href", href);
    link.setAttribute("contenteditable", "false");
    Object.entries(attributes).forEach(([attr, value]) => link.setAttribute(attr, value ?? ""));
    link.innerText = displayName;

    // create a text node that will follow the inserted link (we may be inserting into the middle of a node)
    const endNode = document.createTextNode(` ${node.textContent?.slice(suggestion.endOffset) ?? ""}`);

    // take the starting node, truncate the content from start to the startOffset of the suggestion
    // and then append the link element followed by the text node
    node.textContent = node.textContent?.slice(0, suggestion.startOffset) ?? "";
    node.parentNode?.appendChild(link);
    node.parentNode?.appendChild(endNode);

    // move the selection to after the leading space in the text node following the link
    document.getSelection()?.setBaseAndExtent(endNode, 1, endNode, 1);

    // set the text content to be the innerHTML of the current editor ref and clear the suggestion state
    setText();
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
    setText: (text?: string) => void,
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
 * @returns an empty string if no mention or command is found, otherwise the mention/command substring with it's start offset
 */
export function findSuggestionInText(
    text: string,
    offset: number,
): { text: string; startOffset: number; endOffset: number } | null {
    // Return null early if the offset is outside the content
    if (offset < 0 || offset > text.length) {
        return null;
    }

    // A cursor offset lies between two characters, so make a cursor offset correspond to
    // a character index in the text string
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
    if (mappedSuggestion.type === "command" && (startCharIndex !== 0 || endCharIndex !== text.length)) {
        return null;
    }

    return { text: suggestionText, startOffset: startCharIndex, endOffset: startCharIndex + suggestionText.length };
}

/**
 * Associated function for findSuggestionInText. Checks the character at the current location
 * to determine if the current index should be changed.
 *
 * @param text - text content to check for mentions or commands
 * @param index - the current index to check
 * @returns true if check should keep moving left, false otherwise
 */
function shouldDecrementStartIndex(text: string, index: number): boolean {
    // If the index is outside the string, return false
    if (index === -1) return false;

    // We are inside the string so can guarantee that there is a character at the index
    // The preceding character could be undefined if index === 0
    const mentionOrCommandChar = /[@#/]/;
    const mentionChar = /[@#]/;
    const currentChar = text[index];
    const precedingChar = text[index - 1] ?? "";

    const currentCharIsMentionOrCommand = mentionOrCommandChar.test(currentChar);

    // We want to ignore @ or # if they are preceded by anything that is not a whitespace
    // to allow us to handle cases like email addesses
    const shouldIgnoreCurrentMentionChar = mentionChar.test(currentChar) && /\S/.test(precedingChar);

    // Keep moving left if the current character is not a relevant character, or if
    // we have a relevant character preceded by something other than whitespace
    return !currentCharIsMentionOrCommand || shouldIgnoreCurrentMentionChar;
}

/**
 * Associated function for findSuggestionInText. Checks the character at the current location
 * to determine if the current index should be changed.
 *
 * @param text - text content to check for mentions or commands
 * @param index - the current index to check
 * @returns true if check should keep moving right, false otherwise
 */
function shouldIncrementEndIndex(text: string, index: number): boolean {
    // If the index is outside the string, return false
    if (index === text.length) return false;

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
