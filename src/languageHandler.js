/*
Copyright 2017 MTRNord and Cooperative EITA
Copyright 2017 Vector Creations Ltd.

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

import request from 'browser-request';
import counterpart from 'counterpart';
import Promise from 'bluebird';
import React from 'react';

import UserSettingsStore from './UserSettingsStore';

const i18nFolder = 'i18n/';

// We use english strings as keys, some of which contain full stops
counterpart.setSeparator('|');
// Fall back to English
counterpart.setFallbackLocale('en');

// Function which only purpose is to mark that a string is translatable
// Does not actually do anything. It's helpful for automatic extraction of translatable strings
export function _td(s) {
    return s;
}

// The translation function. This is just a simple wrapper to counterpart,
// but exists mostly because we must use the same counterpart instance
// between modules (ie. here (react-sdk) and the app (riot-web), and if we
// just import counterpart and use it directly, we end up using a different
// instance.
export function _t(...args) {
    // Horrible hack to avoid https://github.com/vector-im/riot-web/issues/4191
    // The interpolation library that counterpart uses does not support undefined/null
    // values and instead will throw an error. This is a problem since everywhere else
    // in JS land passing undefined/null will simply stringify instead, and when converting
    // valid ES6 template strings to i18n strings it's extremely easy to pass undefined/null
    // if there are no existing null guards. To avoid this making the app completely inoperable,
    // we'll check all the values for undefined/null and stringify them here.
    if (args[1] && typeof args[1] === 'object') {
        Object.keys(args[1]).forEach((k) => {
            if (args[1][k] === undefined) {
                console.warn("_t called with undefined interpolation name: " + k);
                args[1][k] = 'undefined';
            }
            if (args[1][k] === null) {
                console.warn("_t called with null interpolation name: " + k);
                args[1][k] = 'null';
            }
        });
    }
    return counterpart.translate(...args);
}

/*
 * Translates stringified JSX into translated JSX. E.g
 *    _tJsx(
 *        "click <a href=''>here</a> now",
 *        /<a href=''>(.*?)<\/a>/,
 *        (sub) => { return <a href=''>{ sub }</a>; }
 *    );
 *
 * @param {string} jsxText The untranslated stringified JSX e.g "click <a href=''>here</a> now".
 * This will be translated by passing the string through to _t(...)
 *
 * @param {RegExp|RegExp[]} patterns A regexp to match against the translated text.
 * The captured groups from the regexp will be fed to 'sub'.
 * Only the captured groups will be included in the output, the match itself is discarded.
 * If multiple RegExps are provided, the function at the same position will be called. The
 * match will always be done from left to right, so the 2nd RegExp will be matched against the
 * remaining text from the first RegExp.
 *
 * @param {Function|Function[]} subs A function which will be called
 * with multiple args, each arg representing a captured group of the matching regexp.
 * This function must return a JSX node.
 *
 * @return a React <span> component containing the generated text
 */
export function _tJsx(jsxText, patterns, subs) {
    // convert everything to arrays
    if (patterns instanceof RegExp) {
        patterns = [patterns];
    }
    if (subs instanceof Function) {
        subs = [subs];
    }
    // sanity checks
    if (subs.length !== patterns.length || subs.length < 1) {
        throw new Error(`_tJsx: programmer error. expected number of RegExps == number of Functions: ${subs.length} != ${patterns.length}`);
    }
    for (let i = 0; i < subs.length; i++) {
        if (!(patterns[i] instanceof RegExp)) {
            throw new Error(`_tJsx: programmer error. expected RegExp for text: ${jsxText}`);
        }
        if (!(subs[i] instanceof Function)) {
            throw new Error(`_tJsx: programmer error. expected Function for text: ${jsxText}`);
        }
    }

    // The translation returns text so there's no XSS vector here (no unsafe HTML, no code execution)
    const tJsxText = _t(jsxText, {interpolate: false});
    const output = [tJsxText];

    for (let i = 0; i < patterns.length; i++) {
        // convert the last element in 'output' into 3 elements (pre-text, sub function, post-text).
        // Rinse and repeat for other patterns (using post-text).
        const inputText = output.pop();
        const match = inputText.match(patterns[i]);
        if (!match) {
            throw new Error(`_tJsx: translator error. expected translation to match regexp: ${patterns[i]}`);
        }
        const capturedGroups = match.slice(1);

        // Return the raw translation before the *match* followed by the return value of sub() followed
        // by the raw translation after the *match* (not captured group).
        output.push(inputText.substr(0, match.index));
        output.push(subs[i].apply(null, capturedGroups));
        output.push(inputText.substr(match.index + match[0].length));
    }

    // this is a bit of a fudge to avoid the 'Each child in an array or iterator
    // should have a unique "key" prop' error: we explicitly pass the generated
    // nodes into React.createElement as children of a <span>.
    return React.createElement('span', null, ...output);
}

// Allow overriding the text displayed when no translation exists
// Currently only used in unit tests to avoid having to load
// the translations in riot-web
export function setMissingEntryGenerator(f) {
    counterpart.setMissingEntryGenerator(f);
}

export function setLanguage(preferredLangs) {
    if (!Array.isArray(preferredLangs)) {
        preferredLangs = [preferredLangs];
    }

    let langToUse;
    let availLangs;
    return getLangsJson().then((result) => {
        availLangs = result;

        for (let i = 0; i < preferredLangs.length; ++i) {
            if (availLangs.hasOwnProperty(preferredLangs[i])) {
                langToUse = preferredLangs[i];
                break;
            }
        }
        if (!langToUse) {
            // Fallback to en_EN if none is found
            langToUse = 'en';
            console.error("Unable to find an appropriate language");
        }

        return getLanguage(i18nFolder + availLangs[langToUse].fileName);
    }).then((langData) => {
        counterpart.registerTranslations(langToUse, langData);
        counterpart.setLocale(langToUse);
        UserSettingsStore.setLocalSetting('language', langToUse);
        console.log("set language to " + langToUse);

        // Set 'en' as fallback language:
        if (langToUse != "en") {
            return getLanguage(i18nFolder + availLangs['en'].fileName);
        }
    }).then((langData) => {
        if (langData) counterpart.registerTranslations('en', langData);
    });
}

export function getAllLanguagesFromJson() {
    return getLangsJson().then((langsObject) => {
        const langs = [];
        for (const langKey in langsObject) {
            if (langsObject.hasOwnProperty(langKey)) {
                langs.push({
                    'value': langKey,
                    'label': langsObject[langKey].label,
                });
            }
        }
        return langs;
    });
}

export function getLanguagesFromBrowser() {
    if (navigator.languages && navigator.languages.length) return navigator.languages;
    if (navigator.language) return [navigator.language];
    return [navigator.userLanguage || "en"];
}

/**
 * Turns a language string, normalises it,
 * (see normalizeLanguageKey) into an array of language strings
 * with fallback to generic languages
 * (eg. 'pt-BR' => ['pt-br', 'pt'])
 *
 * @param {string} language The input language string
 * @return {string[]} List of normalised languages
 */
export function getNormalizedLanguageKeys(language) {
    const languageKeys = [];
    const normalizedLanguage = this.normalizeLanguageKey(language);
    const languageParts = normalizedLanguage.split('-');
    if (languageParts.length == 2 && languageParts[0] == languageParts[1]) {
        languageKeys.push(languageParts[0]);
    } else {
        languageKeys.push(normalizedLanguage);
        if (languageParts.length == 2) {
            languageKeys.push(languageParts[0]);
        }
    }
    return languageKeys;
}

/**
 * Returns a language string with underscores replaced with
 * hyphens, and lowercased.
 */
export function normalizeLanguageKey(language) {
    return language.toLowerCase().replace("_", "-");
}

export function getCurrentLanguage() {
    return counterpart.getLocale();
}

function getLangsJson() {
    return new Promise((resolve, reject) => {
        request(
            { method: "GET", url: i18nFolder + 'languages.json' },
            (err, response, body) => {
                if (err || response.status < 200 || response.status >= 300) {
                    reject({err: err, response: response});
                    return;
                }
                resolve(JSON.parse(body));
            },
        );
    });
}

function getLanguage(langPath) {
    return new Promise((resolve, reject) => {
        request(
            { method: "GET", url: langPath },
            (err, response, body) => {
                if (err || response.status < 200 || response.status >= 300) {
                    reject({err: err, response: response});
                    return;
                }
                resolve(JSON.parse(body));
            },
        );
    });
}
