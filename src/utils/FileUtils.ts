/*
Copyright 2015 - 2021 The Matrix.org Foundation C.I.C.
Copyright 2021 Šimon Brandner <simon.bra.ag@gmail.com>

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

import filesize from 'filesize';
import DOMPurify from 'dompurify';
import { IMediaEventContent } from '../customisations/models/IMediaEventContent';
import { _t } from '../languageHandler';

/**
 * Extracts a human readable label for the file attachment to use as
 * link text.
 *
 * @param {IMediaEventContent} content The "content" key of the matrix event.
 * @param {string} fallbackText The fallback text
 * @param {boolean} withSize Whether to include size information. Default true.
 * @param {boolean} shortened Ensure the extension of the file name is visible. Default false.
 * @return {string} the human readable link text for the attachment.
 */
export function presentableTextForFile(
    content: IMediaEventContent,
    fallbackText = _t("Attachment"),
    withSize = true,
    shortened = false,
): string {
    let text = fallbackText;
    if (content.body && content.body.length > 0) {
        // The content body should be the name of the file including a
        // file extension.
        text = content.body;
    }

    // We shorten to 15 characters somewhat arbitrarily, and assume most files
    // will have a 3 character (plus full stop) extension. The goal is to knock
    // the label down to 15-25 characters, not perfect accuracy.
    if (shortened && text.length > 19) {
        const parts = text.split('.');
        let fileName = parts.slice(0, parts.length - 1).join('.').substring(0, 15);
        const extension = parts[parts.length - 1];

        // Trim off any full stops from the file name to avoid a case where we
        // add an ellipsis that looks really funky.
        fileName = fileName.replace(/\.*$/g, '');

        text = `${fileName}...${extension}`;
    }

    if (content.info && content.info.size && withSize) {
        // If we know the size of the file then add it as human readable
        // string to the end of the link text so that the user knows how
        // big a file they are downloading.
        // The content.info also contains a MIME-type but we don't display
        // it since it is "ugly", users generally aren't aware what it
        // means and the type of the attachment can usually be inferrered
        // from the file extension.
        text += ' (' + filesize(content.info.size) + ')';
    }
    return text;
}

/**
 * Sanitizes a svg file with DOMPurify in order to prevent XSS attacks 
 * when viewing svg blobs in the browser
 *
 * @param {string} svgFile The original svg file.
 * @param {boolean} allowUseTags Whether use tags will be filtered out. Default true.
 * @return {string} The sanitized svg file.
 */
export function sanitizeSvg(
    svgFile: string,
    allowUseTags: boolean = true
): string {
    let allowedTags = [];

    if (allowUseTags) {
        // Adapted from https://github.com/cure53/DOMPurify/issues/574 which prevents
        // this exploit: https://insert-script.blogspot.com/2014/02/svg-fun-time-firefox-svg-vector.html
        // and enables us to safely allow the popular <use> tag.
        allowedTags = ['use'];

        DOMPurify.addHook('afterSanitizeAttributes', function (node: Element) {
            const href = node.getAttribute('xlink:href') || node.getAttribute('href')
            if (href && !href.startsWith('#')) {
                node.removeAttribute('xlink:href')
                node.removeAttribute('href')
            }
        });
    }

    return DOMPurify.sanitize(svgFile, {
        USE_PROFILES: {
            svg: true,
            html: false,
            MathML: false,
        },
        ADD_TAGS: allowedTags
    });
}
