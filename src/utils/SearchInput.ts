/*
Copyright 2023 Boluwatife Omosowon <boluomosowon@gmail.com>

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

import { parsePermalink } from "./permalinks/Permalinks";

/**
 * Parse a search string and return either a room ID/alias/userId or the original search term if it does
 * not look like a permalink.
 * E.g https://matrix.to/#/#element-dev:matrix.org returns #element-dev:matrix.org
 * @param {string} searchTerm The search term.
 * @returns {string} The room ID or alias, or the original search term if it doesn't look like a permalink.
 */
export function transformSearchTerm(searchTerm: string): string {
    const parseLink = parsePermalink(searchTerm);
    if (parseLink) return parseLink.primaryEntityId ?? searchTerm;
    return searchTerm;
}
