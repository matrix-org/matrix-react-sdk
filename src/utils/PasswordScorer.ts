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
    translations: {
        warnings: {
            straightRow: _t("Straight rows of keys are easy to guess"),
            keyPattern: _t("Short keyboard patterns are easy to guess"),
            simpleRepeat: _t('Repeats like "aaa" are easy to guess'),
            extendedRepeat: _t('Repeats like "abcabcabc" are only slightly harder to guess than "abc"'),
            sequences: _t("Sequences like abc or 6543 are easy to guess"),
            recentYears: _t("Recent years are easy to guess"),
            dates: _t("Dates are often easy to guess"),
            topTen: _t("This is a top-10 common password"),
            topHundred: _t("This is a top-100 common password"),
            common: _t("This is a very common password"),
            similarToCommon: _t("This is similar to a commonly used password"),
            wordByItself: _t("A word by itself is easy to guess"),
            namesByThemselves: _t("Names and surnames by themselves are easy to guess"),
            commonNames: _t("Common names and surnames are easy to guess"),
            userInputs: _t("There should not be any personal or page related data."),
            pwned: _t("Your password was exposed by a data breach on the Internet."),
        },
        suggestions: {
            l33t: _t("Predictable substitutions like '@' instead of 'a' don't help very much"),
            reverseWords: _t("Reversed words aren't much harder to guess"),
            allUppercase: _t("All-uppercase is almost as easy to guess as all-lowercase"),
            capitalization: _t("Capitalization doesn't help very much"),
            dates: _t("Avoid dates and years that are associated with you"),
            recentYears: _t("Avoid recent years"),
            associatedYears: _t("Avoid years that are associated with you"),
            sequences: _t("Avoid sequences"),
            repeated: _t("Avoid repeated words and characters"),
            longerKeyboardPattern: _t("Use a longer keyboard pattern with more turns"),
            anotherWord: _t("Add another word or two. Uncommon words are better."),
            useWords: _t("Use a few words, avoid common phrases"),
            noNeed: _t("No need for symbols, digits, or uppercase letters"),
            pwned: _t("If you use this password elsewhere, you should change it."),
        },
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
 * @param matrixClient the client of the logged in user, if any
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
