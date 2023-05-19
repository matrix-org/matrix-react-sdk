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

import { RefObject, useEffect } from "react";

export function usePlainTextInitialization(initialContent = "", ref: RefObject<HTMLElement>): void {
    useEffect(() => {
        if (ref.current) {
            ref.current.innerHTML = initialContent;
        }
    }, [ref, initialContent]);
}

/**
 * Decodes a string containing html character entities and returns the string with the entities replaced
 * with regular characters, eg "&lt;" becomes "<"
 */
export function decodeHtmlEntities(html = ""): string {
    const textArea = document.createElement("textarea");
    textArea.innerHTML = html;
    return textArea.value;
}

/**
 * Encodes a string so that characters are replaced with their corresponding html entities
 * eg "<" becomes "&lt;".
 *
 */
export function encodeHtmlEntities(text = ""): string {
    const textArea = document.createElement("textarea");
    const textNode = document.createTextNode(text);
    textArea.appendChild(textNode);
    return textArea.innerHTML;
}

// A markdown link looks like [link text](<href>)
// We need to stop the regex backtracking to avoid super-linear performance. To do this, we use a lookahead
// assertion (?=...), which greedily matches up to the closing "]" and then match the contents of that assertion
// with a backreference \1. Since the backreference matches something that has already matched, it will not backtrack.
const escapedMdLinkRegex = /\[(?=([^\]]*))\1\]\(&lt;(.*)&gt;\)/g;

export function convertLinksForParser(text: string): string {
    return text.replace(escapedMdLinkRegex, (match, linkText, href) => {
        return `[${linkText}](<${href}>)`;
    });
}
