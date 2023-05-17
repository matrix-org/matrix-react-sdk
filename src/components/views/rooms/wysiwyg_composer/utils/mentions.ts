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

import { MatrixClient, Room } from "matrix-js-sdk/src/matrix";

import { parsePermalink } from "../../../../../utils/permalinks/Permalinks";
import { getMentionAttributes } from "./autocomplete";
import { ICompletion } from "../../../../../autocomplete/Autocompleter";

// A rich text link looks like <a href="href"...>link text</a>
const richTextLinkRegex = /(<a.*?<\/a>)/g;

// A markdown link looks like [link text](<href>)
// We need to stop the regex backtracking to avoid super-linear performance. To do this, we use a lookahead
// assertion (?=...), which greedily matches up to the closing "]" and then match the contents of that assertion
// with a backreference \1. Since the backreference matches something that has already matched, it will not backtrack.
const mdLinkRegex = /\[(?=([^\]]*))\1\]\(<(?=([^>]*))\2>\)/g;

export function wipFormatter(text: string, room: Room, client: MatrixClient): string {
    return text.replace(mdLinkRegex, (match, linkText, href) => {
        const stuff = getMentionStuff(href, linkText, room, client);
        if (stuff === null) {
            return `[${linkText}](${href})`;
        }
        return stuff;
    });
}

function getMentionStuff(url: string, displayText: string, room: Room, client: MatrixClient): string | null {
    const parseResult = parsePermalink(url);
    // expand this to check href later when it's changed to "#"
    if (parseResult === null && displayText === "@room") {
        // at-room special case
        return `<a data-mention-type="at-room" contenteditable="false" href="#">${displayText}</a>`;
    }
    console.log("<<< parseResult", parseResult);

    if (parseResult === null || parseResult.primaryEntityId === null) return null;
    const resourceId = parseResult.primaryEntityId;
    if (resourceId.startsWith("@")) {
        const attributes = getMentionAttributes(
            { type: "user", completionId: resourceId, completion: displayText } as ICompletion,
            client,
            room,
        );
        const attributeString = Object.entries(attributes)
            .map(([k, v]) => `${k}="${v}"`)
            .join(" ");
        console.log("<<< attrstring", attributeString);
        return `<a ${attributeString} contenteditable="false" href="${url}">${displayText}</a>`;
    }
    if (resourceId.startsWith("#")) {
        const displayRoom = client.getVisibleRooms().find((r) => r.name === displayText);

        console.log("<<< room", displayRoom);
        const attributes = getMentionAttributes(
            { type: "room", completionId: displayRoom?.roomId ?? resourceId, completion: resourceId } as ICompletion,
            client,
            room,
        );
        const attributeString = Object.entries(attributes)
            .map(([k, v]) => `${k}="${v}"`)
            .join(" ");
        console.log("<<< attrstring", attributeString);

        return `<a ${attributeString} contenteditable="false" href="${url}">${displayText}</a>`;
    }

    console.log("<<< resourceId", resourceId);

    return `missed all cases for ${displayText}`;
}
