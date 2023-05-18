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
import { MatrixClient, Room } from "matrix-js-sdk/src/matrix";

import { parsePermalink } from "../../../../../utils/permalinks/Permalinks";
import { getMentionAttributes } from "../utils/autocomplete";
import { isNotUndefined } from "../../../../../Typeguards";
import { ICompletion } from "../../../../../autocomplete/Autocompleter";

export function usePlainTextInitialization(
    initialContent = "",
    ref: RefObject<HTMLElement>,
    room: Room,
    client?: MatrixClient,
    setContent?: (content?: string) => void,
): void {
    useEffect(() => {
        if (ref.current) {
            const content = wipFormatter(initialContent, room, client);
            ref.current.innerHTML = content;
            setContent?.();
        }
    }, [ref, initialContent, room, setContent, client]);
}

// A markdown link looks like [link text](<href>)
// We need to stop the regex backtracking to avoid super-linear performance. To do this, we use a lookahead
// assertion (?=...), which greedily matches up to the closing "]" and then match the contents of that assertion
// with a backreference \1. Since the backreference matches something that has already matched, it will not backtrack.
const mdLinkRegex = /\[(?=([^\]]*))\1\]\(<(?=([^>]*))\2>\)/g;

export function encodeHtml(text: string): string {
    const textArea = document.createElement("textarea");
    textArea.innerText = text;
    return textArea.innerHTML;
}

export function wipFormatter(text: string, room: Room, client?: MatrixClient): string {
    return text.replace(mdLinkRegex, (match, linkText, href) => {
        const mentionAttributes = getMentionAttributesFromMarkdown(href, linkText, room, client);
        if (mentionAttributes === null) {
            // if we get null back, we either can't handle getting the attributes or we have a
            // regular link, not a mention - encode the text (to avoid misinterpreting <>) and
            // replace with the encoded text
            return encodeHtml(match);
        }

        // we have attributes so we are dealing with a mention - insert it as a link
        const attributeString = Object.entries(mentionAttributes)
            .map(([k, v]) => `${k}="${v}"`)
            .join(" ");
        return `<a ${attributeString}>${linkText}</a>`;
    });
}

export function getMentionAttributesFromMarkdown(
    url: string,
    displayText: string,
    room: Room,
    client?: MatrixClient,
): {
    "data-mention-type": string; // TODO these types need to be extracted from ICompletion for use here
    "contenteditable": "false";
    "href": string;
    "style": string;
} | null {
    if (client === undefined) return null;

    const parseResult = parsePermalink(url);
    // expand this to check href later when it's changed to "#"
    if (parseResult === null && displayText === "@room") {
        // at-room special case
        return {
            "data-mention-type": "at-room",
            "contenteditable": "false",
            "href": "#",
            "style": "",
        };
    }

    if (parseResult === null || parseResult.primaryEntityId === null) return null;

    const resourceId = parseResult.primaryEntityId;
    if (resourceId.startsWith("@")) {
        const customAttributes = getMentionAttributes(
            { type: "user", completionId: resourceId, completion: displayText } as ICompletion,
            client,
            room,
        );

        if (isNotUndefined(customAttributes["data-mention-type"]) && isNotUndefined(customAttributes.style)) {
            return {
                "contenteditable": "false",
                "href": url,
                "data-mention-type": customAttributes["data-mention-type"],
                "style": customAttributes.style,
            };
        }

        // if we can't find the required attributes, return null
        return null;
    }
    if (resourceId.startsWith("#")) {
        const displayRoom = client.getVisibleRooms().find((r) => r.name === displayText);

        const customAttributes = getMentionAttributes(
            { type: "room", completionId: displayRoom?.roomId ?? resourceId, completion: resourceId } as ICompletion,
            client,
            room,
        );

        if (isNotUndefined(customAttributes["data-mention-type"]) && isNotUndefined(customAttributes.style)) {
            return {
                "contenteditable": "false",
                "href": url,
                "data-mention-type": customAttributes["data-mention-type"],
                "style": customAttributes.style,
            };
        }

        // if we can't find the required attributes, return null
        return null;
    }

    return null;
}
