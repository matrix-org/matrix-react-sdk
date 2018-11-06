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
import SettingsStore, {SettingLevel} from "./settings/SettingsStore";

const i18nFolder = 'i18n/';

// Control whether to also return original, untranslated strings
// Useful for debugging and testing
const ANNOTATE_STRINGS = false;

// We use english strings as keys, some of which contain full stops
counterpart.setSeparator('|');
// Fall back to English
counterpart.setFallbackLocale('en');

// Function which only purpose is to mark that a string is translatable
// Does not actually do anything. It's helpful for automatic extraction of translatable strings
export function _td(s) {
    return s;
}

// Wrapper for counterpart's translation function so that it handles nulls and undefineds properly
// Takes the same arguments as counterpart.translate()
function safeCounterpartTranslate(text, options) {
    // Horrible hack to avoid https://github.com/vector-im/riot-web/issues/4191
    // The interpolation library that counterpart uses does not support undefined/null
    // values and instead will throw an error. This is a problem since everywhere else
    // in JS land passing undefined/null will simply stringify instead, and when converting
    // valid ES6 template strings to i18n strings it's extremely easy to pass undefined/null
    // if there are no existing null guards. To avoid this making the app completely inoperable,
    // we'll check all the values for undefined/null and stringify them here.
    let count;

    if (options && typeof options === 'object') {
        count = options['count'];
        Object.keys(options).forEach((k) => {
            if (options[k] === undefined) {
                console.warn("safeCounterpartTranslate called with undefined interpolation name: " + k);
                options[k] = 'undefined';
            }
            if (options[k] === null) {
                console.warn("safeCounterpartTranslate called with null interpolation name: " + k);
                options[k] = 'null';
            }
        });
    }
    let translated = counterpart.translate(text, options);
    if (translated === undefined && count !== undefined) {
        // counterpart does not do fallback if no pluralisation exists
        // in the preferred language, so do it here
        translated = counterpart.translate(text, Object.assign({}, options, {locale: 'en'}));
    }
    return translated;
}

/*
 * Translates text and optionally also replaces XML-ish elements in the text with e.g. React components
 * @param {string} text The untranslated text, e.g "click <a>here</a> now to %(foo)s".
 * @param {object} variables Variable substitutions, e.g { foo: 'bar' }
 * @param {object} tags Tag substitutions e.g. { 'a': (sub) => <a>{sub}</a> }
 *
 * In both variables and tags, the values to substitute with can be either simple strings, React components,
 * or functions that return the value to use in the substitution (e.g. return a React component). In case of
 * a tag replacement, the function receives as the argument the text inside the element corresponding to the tag.
 *
 * Use tag substitutions if you need to translate text between tags (e.g. "<a>Click here!</a>"), otherwise
 * you will end up with literal "<a>" in your output, rather than HTML. Note that you can also use variable
 * substitution to insert React components, but you can't use it to translate text between tags.
 *
 * @return a React <span> component if any non-strings were used in substitutions, otherwise a string
 */
export function _t(text, variables, tags) {
    // Don't do subsitutions in counterpart. We handle it ourselves so we can replace with React components
    // However, still pass the variables to counterpart so that it can choose the correct plural if count is given
    // It is enough to pass the count variable, but in the future counterpart might make use of other information too
    const args = Object.assign({ interpolate: false }, variables);

    // The translation returns text so there's no XSS vector here (no unsafe HTML, no code execution)
    const translated = safeCounterpartTranslate(text, args);

    const substituted = substitute(translated, variables, tags);

    // For development/testing purposes it is useful to also output the original string
    // Don't do that for release versions
    if (ANNOTATE_STRINGS) {
        if (typeof substituted === 'string') {
            return `@@${text}##${substituted}@@`;
        } else {
            return <span className='translated-string' data-orig-string={text}>{substituted}</span>;
        }
    } else {
        return substituted;
    }
}

/*
 * Similar to _t(), except only does substitutions, and no translation
 * @param {string} text The text, e.g "click <a>here</a> now to %(foo)s".
 * @param {object} variables Variable substitutions, e.g { foo: 'bar' }
 * @param {object} tags Tag substitutions e.g. { 'a': (sub) => <a>{sub}</a> }
 *
 * The values to substitute with can be either simple strings, or functions that return the value to use in
 * the substitution (e.g. return a React component). In case of a tag replacement, the function receives as
 * the argument the text inside the element corresponding to the tag.
 *
 * @return a React <span> component if any non-strings were used in substitutions, otherwise a string
 */
export function substitute(text, variables, tags) {
    const regexpMapping = {};

    if (variables !== undefined) {
        for (const variable in variables) {
            regexpMapping[`%\\(${variable}\\)s`] = variables[variable];
        }
    }

    if (tags !== undefined) {
        for (const tag in tags) {
            regexpMapping[`(<${tag}>(.*?)<\\/${tag}>|<${tag}>|<${tag}\\s*\\/>)`] = tags[tag];
        }
    }
    return replaceByRegexes(text, regexpMapping);
}

/*
 * Replace parts of a text using regular expressions
 * @param {string} text The text on which to perform substitutions
 * @param {object} mapping A mapping from regular expressions in string form to replacement string or a
 * function which will receive as the argument the capture groups defined in the regexp. E.g.
 * { 'Hello (.?) World': (sub) => sub.toUpperCase() }
 *
 * @return a React <span> component if any non-strings were used in substitutions, otherwise a string
 */
export function replaceByRegexes(text, mapping) {
    // We initially store our output as an array of strings and objects (e.g. React components).
    // This will then be converted to a string or a <span> at the end
    const output = [text];

    // If we insert any components we need to wrap the output in a span. React doesn't like just an array of components.
    let shouldWrapInSpan = false;

    for (const regexpString in mapping) {
        // TODO: Cache regexps
        const regexp = new RegExp(regexpString);

        // Loop over what output we have so far and perform replacements
        // We look for matches: if we find one, we get three parts: everything before the match, the replaced part,
        // and everything after the match. Insert all three into the output. We need to do this because we can insert objects.
        // Otherwise there would be no need for the splitting and we could do simple replcement.
        let matchFoundSomewhere = false; // If we don't find a match anywhere we want to log it
        for (const outputIndex in output) {
            const inputText = output[outputIndex];
            if (typeof inputText !== 'string') { // We might have inserted objects earlier, don't try to replace them
                continue;
            }

            const match = inputText.match(regexp);
            if (!match) {
                continue;
            }
            matchFoundSomewhere = true;

            const capturedGroups = match.slice(2);

            // The textual part before the match
            const head = inputText.substr(0, match.index);

            // The textual part after the match
            const tail = inputText.substr(match.index + match[0].length);

            let replaced;
            // If substitution is a function, call it
            if (mapping[regexpString] instanceof Function) {
                replaced = mapping[regexpString].apply(null, capturedGroups);
            } else {
                replaced = mapping[regexpString];
            }

            if (typeof replaced === 'object') {
                shouldWrapInSpan = true;
            }

            output.splice(outputIndex, 1); // Remove old element

            // Insert in reverse order as splice does insert-before and this way we get the final order correct
            if (tail !== '') {
                output.splice(outputIndex, 0, tail);
            }

            // Here we also need to check that it actually is a string before comparing against one
            // The head and tail are always strings
            if (typeof replaced !== 'string' || replaced !== '') {
                output.splice(outputIndex, 0, replaced);
            }

            if (head !== '') { // Don't push empty nodes, they are of no use
                output.splice(outputIndex, 0, head);
            }
        }
        if (!matchFoundSomewhere) { // The current regexp did not match anything in the input
            // Missing matches is entirely possible because you might choose to show some variables only in the case
            // of e.g. plurals. It's still a bit suspicious, and could be due to an error, so log it.
            // However, not showing count is so common that it's not worth logging. And other commonly unused variables
            // here, if there are any.
            if (regexpString !== '%\\(count\\)s') {
                console.log(`Could not find ${regexp} in ${text}`);
            }
        }
    }

    if (shouldWrapInSpan) {
        return React.createElement('span', null, ...output);
    } else {
        return output.join('');
    }
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
        SettingsStore.setValue("language", null, SettingLevel.DEVICE, langToUse);
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

function weblateToCounterpart(inTrs) {
    const outTrs = {};

    for (const key of Object.keys(inTrs)) {
        const keyParts = key.split('|', 2);
        if (keyParts.length === 2) {
            let obj = outTrs[keyParts[0]];
            if (obj === undefined) {
                obj = {};
                outTrs[keyParts[0]] = obj;
            }
            obj[keyParts[1]] = inTrs[key];
        } else {
            outTrs[key] = inTrs[key];
        }
    }

    return outTrs;
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
                resolve(weblateToCounterpart(JSON.parse(body)));
            },
        );
    });
}
