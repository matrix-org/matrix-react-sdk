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

import { parsePermalink } from "../../../../../utils/permalinks/Permalinks";

const richTextLinkRegex = /(<a.*?<\/a>)/g;
const mdLinkRegex = /\[(.*?)\]\(<(.*?)>\)/g;

export function fudgeMentions(richText: string, plainText: string): string {
    // to avoid lookup, we use the existing rich text information
    const richTextLinkMatches = richText.match(richTextLinkRegex);
    if (richTextLinkMatches === null) {
        // we have no links, so no processing required
        return plainText;
    }

    // allows us to keep track of which link we're looking at in the replacer
    let count = 0;

    // now go through the plain text and, if the href can be interpreted as a permalink, replace
    // it with the corresponding "rich match"
    const fudgedString = plainText.replace(mdLinkRegex, (match, linkText, href) => {
        // special case for @room
        if (linkText === "@room") {
            const toReturn = richTextLinkMatches[count];
            count++;
            return toReturn;
        }
        // permalink returns null if we can't interpret it that way
        const permalink = parsePermalink(href);
        const toReturn = permalink === null ? `[${linkText}](${href})` : richTextLinkMatches[count];
        count++;
        return toReturn;
    });
    return fudgedString;
}
