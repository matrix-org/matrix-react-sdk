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
    room?: Room,
    client?: MatrixClient,
    setContent?: (content?: string) => void,
): void {
    useEffect(() => {
        if (ref.current) {
            const content = formatPlainTextLinks(initialContent, room, client);
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

/**
 * Encodes a string so that characters are replaced with their corresponding html entities
 * eg "<" becomes "&lt;".
 *
 * We need to do this to prevent misinterpreting angle brackets in markdown as badly formed
 * html tags when using that string to set the innerHTML property.
 */
export function encodeHtml(text: string): string {
    const textArea = document.createElement("textarea");
    const textNode = document.createTextNode(text);
    textArea.appendChild(textNode);
    return textArea.innerHTML;
}

/**
 * Takes a plain text string and returns that string with the markdown style links formatted as follows:
 * For a regular markdown link, the input is encoded to ensure that angle
 * brackets are not interpreted as html.
 * For a mention, the markdown link is replaced with an html representation of that mention as
 * a link to allow it to be displayed as a pill in the composer.
 *
 * @param text - the plain text output from the rust model
 * @param room - the current room the composer is being used in
 * @param client - the current client
 * @returns - the original string with links either encoded for display as html or replaced with
 * the html that represents a pill
 */
export function formatPlainTextLinks(text: string, room?: Room, client?: MatrixClient): string {
    return text.replace(mdLinkRegex, (match, linkText, href) => {
        const mentionAttributes = getAttributesForMention(href, linkText, room, client);
        if (mentionAttributes === null) {
            // If we get null back, we either can't find the required attributes or we have a
            // regular link, not a mention.
            // Encode the text (to avoid misinterpreting <> around the link address)
            return encodeHtml(match);
        }

        // We have attributes so we are dealing with a mention. Use the attributes to build
        // the html that we use to represent a mention as per the rich text mode
        const attributesAsString = Object.entries(mentionAttributes)
            .map(([k, v]) => `${k}="${v}"`)
            .join(" ");
        return `<a ${attributesAsString}>${linkText}</a>`;
    });
}

/**
 * Given a url and display text from a link, determine if it is a mention. If it is
 * a mention, return the attributes required to display that mention as per the rich
 * text mode of the rich text editor. If it is not a mention or we can not find those
 * attributes, return null
 *
 * @param url - the url of the link
 * @param displayText - the text being displayed by the link
 * @param room - the current room the composer is used in
 * @param client - the current client
 * @returns - attributes to use to construct a mention if the possible, null otherwise
 */
export function getAttributesForMention(
    url: string,
    displayText: string,
    room?: Room,
    client?: MatrixClient,
): {
    "data-mention-type": string; // TODO these types need to be extracted from ICompletion for use here
    "contenteditable": "false";
    "href": string;
    "style": string;
} | null {
    if (client === undefined || room === undefined) return null;

    const parseResult = parsePermalink(url);
    // expand this to check href later when it's changed to "#"
    if (parseResult === null && displayText === "@room") {
        // at-room special case
        return {
            "data-mention-type": "at-room",
            "contenteditable": "false",
            "href": "#", // TODO should this be https://#
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
