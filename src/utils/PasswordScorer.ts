/*
Copyright 2018 New Vector Ltd

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

import { zxcvbn, zxcvbnOptions, ZxcvbnResult } from "@zxcvbn-ts/core";
import translationKeys from "@zxcvbn-ts/core/src/data/translationKeys";
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common";
import * as zxcvbnEnPackage from "@zxcvbn-ts/language-en";
import { MatrixClient } from "matrix-js-sdk/src/matrix";

import { _t } from "../languageHandler";
import { MatrixClientPeg } from "../MatrixClientPeg";
import SdkConfig from "../SdkConfig";
import { createTypedObjectFromEntries, typedKeys } from "./objects";

zxcvbnOptions.setOptions({
    dictionary: {
        ...zxcvbnCommonPackage.dictionary,
        ...zxcvbnEnPackage.dictionary,
        userInputs: ["riot", "matrix", "element", SdkConfig.get().brand],
    },
    graphs: zxcvbnCommonPackage.adjacencyGraphs,
    useLevenshteinDistance: true,
    translations: {
        warnings: createTypedObjectFromEntries(
            typedKeys(translationKeys.warnings).map((key) => [key, _t(`zxcvbn|warnings|${key}`)]),
        ),
        suggestions: createTypedObjectFromEntries(
            typedKeys(translationKeys.suggestions).map((key) => [key, _t(`zxcvbn|suggestions|${key}`)]),
        ),
        // We don't utilise the time estimation at this time so just pass through the English translations here
        timeEstimation: zxcvbnEnPackage.translations.timeEstimation,
    },
});

/**
 * Wrapper around zxcvbn password strength estimation
 * Include this only from async components: it pulls in zxcvbn
 * (obviously) which is large.
 *
 * @param {string} password Password to score
 * @param matrixClient the client of the logged-in user, if any
 * @param userInputs additional strings such as the user's name which should be considered a bad password component
 * @returns {object} Score result with `score` and `feedback` properties
 */
export function scorePassword(
    matrixClient: MatrixClient | null,
    password: string,
    userInputs: string[] = [],
): ZxcvbnResult | null {
    if (password.length === 0) return null;

    if (matrixClient) {
        userInputs.push(matrixClient.getUserIdLocalpart()!);
    }

    try {
        const domain = MatrixClientPeg.getHomeserverName();
        userInputs.push(domain);
    } catch {
        // This is fine
    }

    let zxcvbnResult = zxcvbn(password, userInputs);
    // Work around https://github.com/dropbox/zxcvbn/issues/216
    if (password.includes(" ")) {
        const resultNoSpaces = zxcvbn(password.replace(/ /g, ""), userInputs);
        if (resultNoSpaces.score < zxcvbnResult.score) zxcvbnResult = resultNoSpaces;
    }

    return zxcvbnResult;
}
