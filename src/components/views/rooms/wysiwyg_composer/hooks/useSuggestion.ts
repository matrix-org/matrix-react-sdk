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

import { Attributes, MappedSuggestion, SuggestionChar, SuggestionType } from "@matrix-org/matrix-wysiwyg";
import { SyntheticEvent, useState } from "react";

/* To allow reuse of the autocomplete component, we need to record similar information as used in 
the Rust model (keyChar, type and text) as well as information required to allow us to do the 
DOM manipulation when replacing the suggestion with a mention or command (node, start and
end offsets). */
export type PlainTextSuggestionPattern = {
    keyChar: SuggestionChar;
    type: SuggestionType;
    text: string;
    node: Node;
    startOffset: number;
    endOffset: number;
};
type Suggestion = PlainTextSuggestionPattern | null;

/**
 * React hook to allow tracking and replacing of mentions and commands in a div element
 *
 * @param editorRef - a ref to the div that is the composer textbox
 * @param setText - setter function to allow the hook to update the content state when replacing
 * text with text selected from the autocomplete
 * @returns
 * - `handleMention`: TODO a function that will allow @ or # mentions to be selected from
 * the autocomplete and inserted into the composer
 * - `handleCommand`: a function that allows slash commands selected from the autocomplete to be inserted
 * into the composer
 * - `onSelect`: a selection change listener to be attached to the plain text composer
 * - `suggestion`: if the cursor is inside something that could be interpreted as a command or a mention,
 * this will be an object representing that command or mention, otherwise it is null
 *
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
    const [suggestion, setSuggestion] = useState<Suggestion>(null);

    // TODO handle the mentions (@user, #room etc)
    const handleMention = (): void => {};

    // We create a `seletionchange` handler here because we need to know when the user has moved the cursor,
    // we can not depend on input events only
    const onSelect = (): void => processSelectionChange(editorRef, suggestion, setSuggestion);

    const handleCommand = (replacementText: string): void =>
        processCommand(replacementText, editorRef, suggestion, setSuggestion, setText);

    return {
        suggestion: mapSuggestion(suggestion),
        handleCommand,
        handleMention,
        onSelect,
    };
}

/**
 * Convert a PlainTextSuggestionPattern (or null) to a MappedSuggestion (or null)
 *
 * @param suggestion - the suggestion that is the JS equivalent of the rust model's representation
 * @returns - null if the input is null, a MappedSuggestion if the input is non-null
 *
 */
export const mapSuggestion = (suggestion: Suggestion): MappedSuggestion | null => {
    if (suggestion === null) {
        return null;
    } else {
        const { node, startOffset, endOffset, ...mappedSuggestion } = suggestion;
        return mappedSuggestion;
    }
};

/**
 * Replaces the relevant part of the editor text with the replacement text after a command is selected
 * from the autocomplete.
 *
 * @param replacementText - the text that we will insert into the DOM
 * @param editorRef - a ref to the editor
 * @param suggestion - representation of the part of the DOM that will be replaced
 * @param setSuggestion - a setter to allow the suggestion state to be updated
 * @param setText - a setter to update the state of the composer content after replacing a mention
 * or a command
 */
export const processCommand = (
    replacementText: string,
    editorRef: React.RefObject<HTMLDivElement>,
    suggestion: Suggestion,
    setSuggestion: React.Dispatch<React.SetStateAction<Suggestion>>,
    setText: (text: string) => void,
): void => {
    // if we do not have any of the values we need to do the work, do nothing
    if (suggestion === null || editorRef.current === null) {
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
};

/**
 * When the selection changes inside the current editor, check to see if the cursor is inside
 * something that could require the autocomplete to be opened and update the suggestion state
 * if so
 * TODO expand this to handle mentions
 *
 * @param editorRef - ref to the composer
 * @param suggestion - the current suggestion state
 * @param setSuggestion - the setter for the suggestion state
 */
export const processSelectionChange = (
    editorRef: React.RefObject<HTMLDivElement>,
    suggestion: Suggestion,
    setSuggestion: React.Dispatch<React.SetStateAction<Suggestion>>,
): void => {
    const selection = document.getSelection();

    // return early if we do not have a current editor ref with a cursor selection inside a text node
    if (
        editorRef.current === null ||
        selection === null ||
        !selection.isCollapsed ||
        selection.anchorNode?.nodeName !== "#text"
    ) {
        return;
    }

    // here we have established that both anchor and focus nodes in the selection are
    // the same node, so rename to `currentNode` for later use
    const { anchorNode: currentNode } = selection;

    // first check is that the text node is the first text node of the editor, as adding paragraphs can result
    // in nested <p> tags inside the editor <div>
    const firstTextNode = document.createNodeIterator(editorRef.current, NodeFilter.SHOW_TEXT).nextNode();

    // if we're not in the first text node or we have no text content, return
    if (currentNode !== firstTextNode || currentNode.textContent === null) {
        return;
    }

    // it's a command if:
    // it is the first textnode AND
    // it starts with /, not // AND
    // then has letters all the way up to the end of the textcontent
    const commandRegex = /^\/(\w*)$/;
    const commandMatches = currentNode.textContent.match(commandRegex);

    // if we don't have any matches, return, clearing the suggeston state if it is non-null
    if (commandMatches === null) {
        if (suggestion !== null) {
            setSuggestion(null);
        }
        return;
    } else {
        setSuggestion({
            keyChar: "/",
            type: "command",
            text: commandMatches[1],
            node: selection.anchorNode,
            startOffset: 0,
            endOffset: currentNode.textContent.length,
        });
    }
};
