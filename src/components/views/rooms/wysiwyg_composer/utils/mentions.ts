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
import { findRoom } from "../../../../../hooks/usePermalinkTargetRoom";
import { ICompletion } from "../../../../../autocomplete/Autocompleter";
import { isNotNull } from "../../../../../Typeguards";

const STYLE = "style";

/**
 * If a mention has been parsed from a message edited in the timeline, the rust model can not determine the style
 * attribute required. This function will determine and return the required style attribute.
 *
 * @param mention - the mention element from the composer
 * @param client - current client
 * @param room - current room
 * @returns - a style string if the mention requires one, null otherwise
 */
export function getStyleAttributeForMention(mention: Element, client: MatrixClient, room: Room): string | null {
    // if we already have a style attribute or are missing required attributes, return early
    const type = mention.getAttribute("data-mention-type");
    const href = mention.getAttribute("href");
    if (mention.hasAttribute(STYLE) || type === null || href === null) return null;

    let style: string | null = null;
    switch (type) {
        case "user": {
            const permalinkParts = parsePermalink(href);
            if (isNotNull(permalinkParts)) {
                const attributes = getMentionAttributes(
                    { type, completionId: permalinkParts.userId } as ICompletion,
                    client,
                    room,
                );
                style = attributes.get(STYLE) ?? null;
            }
            break;
        }
        case "room": {
            const permalinkParts = parsePermalink(href);
            if (isNotNull(permalinkParts) && isNotNull(permalinkParts.roomIdOrAlias)) {
                const foundRoom = findRoom(permalinkParts.roomIdOrAlias);

                if (foundRoom === null) break;

                const attributes = getMentionAttributes(
                    { type, completion: foundRoom.name, completionId: foundRoom.roomId } as ICompletion,
                    client,
                    room,
                );
                style = attributes.get(STYLE) ?? null;
            }
            break;
        }
        case "at-room": {
            const attributes = getMentionAttributes({ type } as ICompletion, client, room);
            style = attributes.get(STYLE) ?? null;
            break;
        }
    }

    return style;
}
