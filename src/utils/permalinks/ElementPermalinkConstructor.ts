/*
Copyright 2019, 2021 The Matrix.org Foundation C.I.C.

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

import PermalinkConstructor, {PermalinkParts} from "./PermalinkConstructor";

/**
 * Generates permalinks that self-reference the running webapp
 */
export default class ElementPermalinkConstructor extends PermalinkConstructor {
    private elementUrl: string;

    constructor(elementUrl: string) {
        super();
        this.elementUrl = elementUrl;

        if (!this.elementUrl.startsWith("http:") && !this.elementUrl.startsWith("https:")) {
            throw new Error("Element prefix URL does not appear to be an HTTP(S) URL");
        }
    }

    forEvent(roomId: string, eventId: string, serverCandidates: string[]): string {
        return `${this.elementUrl}/#/room/${roomId}/${eventId}${this.encodeServerCandidates(serverCandidates)}`;
    }

    forRoom(roomIdOrAlias: string, serverCandidates?: string[]): string {
        return `${this.elementUrl}/#/room/${roomIdOrAlias}${this.encodeServerCandidates(serverCandidates)}`;
    }

    forUser(userId: string): string {
        return `${this.elementUrl}/#/user/${userId}`;
    }

    forGroup(groupId: string): string {
        return `${this.elementUrl}/#/group/${groupId}`;
    }

    forEntity(entityId: string): string {
        if (entityId[0] === '!' || entityId[0] === '#') {
            return this.forRoom(entityId);
        } else if (entityId[0] === '@') {
            return this.forUser(entityId);
        } else if (entityId[0] === '+') {
            return this.forGroup(entityId);
        } else throw new Error("Unrecognized entity");
    }

    isPermalinkHost(testHost: string): boolean {
        const parsedUrl = new URL(this.elementUrl);
        return testHost === (parsedUrl.host || parsedUrl.hostname); // one of the hosts should match
    }

    encodeServerCandidates(candidates?: string[]) {
        if (!candidates || candidates.length === 0) return '';
        return `?via=${candidates.map(c => encodeURIComponent(c)).join("&via=")}`;
    }

    // Heavily inspired by/borrowed from the matrix-bot-sdk (with permission):
    // https://github.com/turt2live/matrix-js-bot-sdk/blob/7c4665c9a25c2c8e0fe4e509f2616505b5b66a1c/src/Permalinks.ts#L33-L61
    // Adapted for Element's URL format
    parsePermalink(fullUrl: string): PermalinkParts {
        if (!fullUrl || !fullUrl.startsWith(this.elementUrl)) {
            throw new Error("Does not appear to be a permalink");
        }

        const parts = fullUrl.substring(`${this.elementUrl}/#/`.length);
        return ElementPermalinkConstructor.parseAppRoute(parts);
    }

    /**
     * Parses an app route (`(user|room|group)/identifer`) to a Matrix entity
     * (room, user, group).
     * @param {string} route The app route
     * @returns {PermalinkParts}
     */
    static parseAppRoute(route: string): PermalinkParts {
        const parts = route.split("/");

        if (parts.length < 2) { // we're expecting an entity and an ID of some kind at least
            throw new Error("URL is missing parts");
        }

        // Split optional query out of last part
        const [lastPartMaybeWithQuery] = parts.splice(-1, 1);
        const [lastPart, query = ""] = lastPartMaybeWithQuery.split("?");
        parts.push(lastPart);

        const entityType = parts[0];
        const entity = parts[1];
        if (entityType === 'user') {
            // Probably a user, no further parsing needed.
            return PermalinkParts.forUser(entity);
        } else if (entityType === 'group') {
            // Probably a group, no further parsing needed.
            return PermalinkParts.forGroup(entity);
        } else if (entityType === 'room') {
            // Rejoin the rest because v3 events can have slashes (annoyingly)
            const eventId = parts.length > 2 ? parts.slice(2).join('/') : "";
            const via = query.split(/&?via=/).filter(p => !!p);
            return PermalinkParts.forEvent(entity, eventId, via);
        } else {
            throw new Error("Unknown entity type in permalink");
        }
    }
}
