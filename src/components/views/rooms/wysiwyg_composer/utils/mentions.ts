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

// a rich text link looks like <a href="href"...>link text</a>
const richTextLinkRegex = /(<a.*?<\/a>)/g;

// a markdown link looks like [link text](<href>)
const mdLinkRegex = /\[(.*?)\]\(<(.*?)>\)/g;

export function amendLinksInPlainText(richText: string, plainText: string): string {
    // find all of the links in the rich text first as these will contain all the required attributes
    const richTextLinkMatches = richText.match(richTextLinkRegex);
    if (richTextLinkMatches === null) {
        // we have no links, so no processing required
        return plainText;
    }

    // we have found all of the <a> type links in the rich text, now search through the plain text and:
    // - if the href can not be interpreted as a permalink, render it in the markdown style
    // - otherwise, replace the permalink with the html containing all the attributes to display as a pill
    let count = 0;
    const plainTextWithReplacedLinks = plainText.replace(mdLinkRegex, (match, linkText, href) => {
        // special case for @room, as this has a href of "#"
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

    return plainTextWithReplacedLinks;
}
