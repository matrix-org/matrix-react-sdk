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

import { zxcvbn, zxcvbnOptions, ZxcvbnResult, TranslationKeys } from "@zxcvbn-ts/core";
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common";
import * as zxcvbnEnPackage from "@zxcvbn-ts/language-en";
import { MatrixClient } from "matrix-js-sdk/src/matrix";

import { _t } from "../languageHandler";
import { MatrixClientPeg } from "../MatrixClientPeg";
import SdkConfig from "../SdkConfig";

zxcvbnOptions.setOptions({
    dictionary: {
        ...zxcvbnCommonPackage.dictionary,
        ...zxcvbnEnPackage.dictionary,
        userInputs: ["riot", "matrix", "element", SdkConfig.get().brand],
    },
    graphs: zxcvbnCommonPackage.adjacencyGraphs,
    useLevenshteinDistance: true,
});

function getTranslations(): TranslationKeys {
    return {
        warnings: {
            straightRow: _t("zxcvbn|warnings|straightRow"),
            keyPattern: _t("zxcvbn|warnings|keyPattern"),
            simpleRepeat: _t("zxcvbn|warnings|simpleRepeat"),
            extendedRepeat: _t("zxcvbn|warnings|extendedRepeat"),
            sequences: _t("zxcvbn|warnings|sequences"),
            recentYears: _t("zxcvbn|warnings|recentYears"),
            dates: _t("zxcvbn|warnings|dates"),
            topTen: _t("zxcvbn|warnings|topTen"),
            topHundred: _t("zxcvbn|warnings|topHundred"),
            common: _t("zxcvbn|warnings|common"),
            similarToCommon: _t("zxcvbn|warnings|similarToCommon"),
            wordByItself: _t("zxcvbn|warnings|wordByItself"),
            namesByThemselves: _t("zxcvbn|warnings|namesByThemselves"),
            commonNames: _t("zxcvbn|warnings|commonNames"),
            userInputs: _t("zxcvbn|warnings|userInputs"),
            pwned: _t("zxcvbn|warnings|pwned"),
        },
        suggestions: {
            l33t: _t("zxcvbn|suggestions|l33t"),
            reverseWords: _t("zxcvbn|suggestions|reverseWords"),
            allUppercase: _t("zxcvbn|suggestions|allUppercase"),
            capitalization: _t("zxcvbn|suggestions|capitalization"),
            dates: _t("zxcvbn|suggestions|dates"),
            recentYears: _t("zxcvbn|suggestions|recentYears"),
            associatedYears: _t("zxcvbn|suggestions|associatedYears"),
            sequences: _t("zxcvbn|suggestions|sequences"),
            repeated: _t("zxcvbn|suggestions|repeated"),
            longerKeyboardPattern: _t("zxcvbn|suggestions|longerKeyboardPattern"),
            anotherWord: _t("zxcvbn|suggestions|anotherWord"),
            useWords: _t("zxcvbn|suggestions|useWords"),
            noNeed: _t("zxcvbn|suggestions|noNeed"),
            pwned: _t("zxcvbn|suggestions|pwned"),
        },
        // We don't utilise the time estimation at this time so just pass through the English translations here
        timeEstimation: zxcvbnEnPackage.translations.timeEstimation,
    };
}

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

    const inputs = [...userInputs];

    if (matrixClient) {
        inputs.push(matrixClient.getUserIdLocalpart()!);
    }

    try {
        const domain = MatrixClientPeg.getHomeserverName();
        inputs.push(domain);
    } catch {
        // This is fine
    }

    zxcvbnOptions.setTranslations(getTranslations());

    let zxcvbnResult = zxcvbn(password, inputs);
    // Work around https://github.com/dropbox/zxcvbn/issues/216
    if (password.includes(" ")) {
        const resultNoSpaces = zxcvbn(password.replace(/ /g, ""), inputs);
        if (resultNoSpaces.score < zxcvbnResult.score) zxcvbnResult = resultNoSpaces;
    }

    return zxcvbnResult;
}
