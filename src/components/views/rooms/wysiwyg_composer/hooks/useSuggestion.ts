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

import { Attributes, MappedSuggestion /* SuggestionChar */ } from "@matrix-org/matrix-wysiwyg";
import { SyntheticEvent, useState } from "react";

// WIP suggestion stuff, this needs tidying to be a single piece of state
// try to make this like the rust model for consistency, in Rust:
/**
 * pub struct SuggestionPattern {
 * pub key: PatternKey, // translate to keyChar so we're not using an enum
 * pub text: String,
 * pub start: usize, // use startOffset as we'll track the node
 * pub end: usize, // use endOffset as we'll track the node
 * }
 */
// but we also need to know which node we're looking at
// TODO shift over to using this type and the refactoring it will require, but get tests written first to
// give a safety net for the refactoring

// type PlainTextSuggestionPattern = {
//     keyChar: SuggestionChar;
//     text: string;
//     node: Node;
//     startOffset: number;
//     endOffset: number;
// } | null;
const emptySuggestion: MappedSuggestion = { keyChar: "", text: "", type: "unknown" };
type SuggestionCandidate = { node: Node | null; startOffset: number; endOffset: number };
const emptySuggestionCandidate: SuggestionCandidate = { node: null, startOffset: NaN, endOffset: NaN };

export function useSuggestion(editorRef: React.RefObject<HTMLDivElement>): {
    suggestion: MappedSuggestion;
    handleMention: (link: string, text: string, attributes: Attributes) => void;
    handleCommand: (text: string) => void;
    onSelect: (event: SyntheticEvent<HTMLDivElement>) => void;
} {
    // WIP - may become a custom hook in keeping with the rest of the design
    const [suggestion, setSuggestion] = useState<MappedSuggestion>(emptySuggestion);
    const [suggestionNodeInfo, setSuggestionNodeInfo] = useState<SuggestionCandidate>(emptySuggestionCandidate);
    const clearSuggestions = (): void => {
        setSuggestion(emptySuggestion);
        setSuggestionNodeInfo(emptySuggestionCandidate);
    };
    // TODO handle the mentions (@user, #room etc)
    const handleMention = (): void => {};

    const handleCommand = (replacementText: string): void => {
        // if this gets triggered, then we have a command on the page, so what we want to do is
        // manually amend the html text content with the stored state
        const { node /* startOffset, endOffset */ } = suggestionNodeInfo;
        if (editorRef.current === null || node === null || node.textContent === null) return;

        // for a command we know we're starting at the beginning, so it's a bit easier
        const newContent = `${replacementText} `; // note the trailing space
        node.textContent = newContent;

        // then set the cursor to the end of the node, fire an inputEvent (updates
        // the hook state), clear the suggestions from state
        document.getSelection()?.setBaseAndExtent(node, newContent.length, node, newContent.length);
        const event = new Event("inputEvent");
        editorRef.current.dispatchEvent(event);
        clearSuggestions();
    };
    // do for slash commands first, should probably use the event somehow
    const onSelect = (): void => {
        // whenever there's a change in selection, we're going to have to do some magic
        const s = document.getSelection();

        // if we have a cursor inside a text node, then we're potentially interested in the text content
        if (s && s.isCollapsed && s.anchorNode?.nodeName === "#text" && editorRef.current) {
            // first check is that the text node is the first text node of the editor as we can also have
            // <p> tags in the markup
            const firstTextNode = document.createNodeIterator(editorRef.current, NodeFilter.SHOW_TEXT).nextNode();
            const isFirstTextNode = s.anchorNode === firstTextNode;
            const textContent = s.anchorNode.textContent;

            // if we're not in the first text node or we have no text content, return
            if (!isFirstTextNode || textContent === null) {
                return;
            }

            // it's a command if: it is the first textnode, it starts with /, not //, then has letters all the way up to
            // the end of the textcontent - nb think this last assumption may give us some behavioural inconsistency
            // between the rust model and this, but it's a decent starting point
            const commandRegex = /^\/{1}(\w*)$/;
            const commandMatches = textContent.match(commandRegex);

            // if we don't have a command, clear the suggestion state and return
            if (commandMatches === null) {
                if (suggestionNodeInfo.node !== null) {
                    clearSuggestions();
                }
                return;
            }

            // but if we do have some matches, use that to populate the suggestion state
            setSuggestionNodeInfo({ node: s.anchorNode, startOffset: 0, endOffset: textContent.length });
            setSuggestion({ keyChar: "/", type: "command", text: commandMatches[1] });
        }
    };

    return { suggestion, handleCommand, handleMention, onSelect };
}
