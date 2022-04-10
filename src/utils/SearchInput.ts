/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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


/**
 * Strips a string of https://matrix.to/#/
 * eg https://matrix.to/#/#element-dev:matrix.org returns #element-dev:matrix.org
 *
 * @param {string} term The searchterm .
 * @returns {string} Modifies string if it contains with https://matrix.to/#/ .
 */

export function transformSearchTerm(term: string): string {
    if (/https:\/\/matrix.to\/#\//.test(term)) {
        term = term.replace("https://matrix.to/#/", "");
    }
    return term;
}
