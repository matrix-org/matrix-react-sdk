/*
Copyright 2016 Aviral Dasgupta
Copyright 2017 Vector Creations Ltd

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

import React from 'react';
import { _t } from '../languageHandler';
import AutocompleteProvider from './AutocompleteProvider';
import {emojioneList, shortnameToImage, shortnameToUnicode, asciiRegexp} from 'emojione';
import FuzzyMatcher from './FuzzyMatcher';
import sdk from '../index';
import {PillCompletion} from './Components';
import type {SelectionRange, Completion} from './Autocompleter';

import EmojiData from '../stripped-emoji.json';

const LIMIT = 20;
const CATEGORY_ORDER = [
    'people',
    'food',
    'objects',
    'activity',
    'nature',
    'travel',
    'flags',
    'symbols',
    'unicode9',
    'modifier',
];

// Match for ":wink:" or ascii-style ";-)" provided by emojione
const EMOJI_REGEX = new RegExp('(' + asciiRegexp + '|:\\w*:?)', 'g');
const EMOJI_SHORTNAMES = Object.keys(EmojiData).map((key) => EmojiData[key]).sort(
    (a, b) => {
        if (a.category === b.category) {
            return a.emoji_order - b.emoji_order;
        }
        return CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
    },
).map((a) => {
    return {
        name: a.name,
        shortname: a.shortname,
        aliases_ascii: a.aliases_ascii ? a.aliases_ascii.join(' ') : '',
    };
});

let instance = null;

export default class EmojiProvider extends AutocompleteProvider {
    constructor() {
        super(EMOJI_REGEX);
        this.matcher = new FuzzyMatcher(EMOJI_SHORTNAMES, {
            keys: ['aliases_ascii', 'shortname', 'name'],
            // For matching against ascii equivalents
            shouldMatchWordsOnly: false,
        });
    }

    async getCompletions(query: string, selection: SelectionRange) {
        const EmojiText = sdk.getComponent('views.elements.EmojiText');

        let completions = [];
        let {command, range} = this.getCurrentCommand(query, selection);
        if (command) {
            completions = this.matcher.match(command[0]).map(result => {
                const {shortname} = result;
                const unicode = shortnameToUnicode(shortname);
                return {
                    completion: unicode,
                    component: (
                        <PillCompletion title={shortname} initialComponent={<EmojiText style={{maxWidth: '1em'}}>{unicode}</EmojiText>} />
                    ),
                    range,
                };
            }).slice(0, LIMIT);
        }
        return completions;
    }

    getName() {
        return '😃 ' + _t('Emoji');
    }

    static getInstance() {
        if (instance == null)
            {instance = new EmojiProvider();}
        return instance;
    }

    renderCompletions(completions: [React.Component]): ?React.Component {
        return <div className="mx_Autocomplete_Completion_container_pill">
            {completions}
        </div>;
    }
}
