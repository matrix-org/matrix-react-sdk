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

// A rich text link looks like <a href="href"...>link text</a>
const richTextLinkRegex = /(<a.*?<\/a>)/g;

// A markdown link looks like [link text](<href>)
// We need to stop the regex backtracking to avoid super-linear performance. To do this, we use a lookahead
// assertion (?=...), which greedily matches up to the closing "]" and then match the contents of that assertion
// with a backreference \1. Since the backreference matches something that has already matched, it will not backtrack.
const mdLinkRegex = /\[(?=([^\]]*))\1\]\(<(?=([^>]*))\2>\)/g;

/**
 * Takes the rich text and plain text representations from the rust model and uses them to return a string
 * of HTML that can be used to set the PlainTextComposer when toggling from rich to plain mode.
 * Regular markdown links will be transformed from [text](<href>) to [text](href) to allow us to display
 * them properly without interpreting the <> as html.
 * Mentions will be transformed from [mentionText](<mentionHref>) to their html equivalent ie
 * <a href="mentionHref" ...other attributes>mentionText</a> to allow them to be displayed as pills.
 *
 * @param richText - the rich text output from the rust model
 * @param plainText - the plain text output from the rust model
 * @returns - string of HTML for setting the innerHTML of the PlainTextComposera
 */
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

        // if parsePermalink returns null, return the link in the markdown style [linktext](href), ie this
        // removes the enclosing <> from around the href that we have output from the rust model markdown
        const permalink = parsePermalink(href);
        const toReturn = permalink === null ? `[${linkText}](${href})` : richTextLinkMatches[count];
        count++;
        return toReturn;
    });

    return plainTextWithReplacedLinks;
}
