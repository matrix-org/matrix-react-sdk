import React from 'react';
import { _t } from '../languageHandler';
import AutocompleteProvider from './AutocompleteProvider';
import {emojioneList, shortnameToImage, shortnameToUnicode} from 'emojione';
import Fuse from 'fuse.js';
import sdk from '../index';
import {PillCompletion} from './Components';
import type {SelectionRange, Completion} from './Autocompleter';

const EMOJI_REGEX = /:\w*:?/g;
const EMOJI_SHORTNAMES = Object.keys(emojioneList);

let instance = null;

export default class EmojiProvider extends AutocompleteProvider {
    constructor() {
        super(EMOJI_REGEX);
        this.fuse = new Fuse(EMOJI_SHORTNAMES, {});
    }

    async getCompletions(query: string, selection: SelectionRange) {
        const EmojiText = sdk.getComponent('views.elements.EmojiText');

        let completions = [];
        let {command, range} = this.getCurrentCommand(query, selection);
        if (command) {
            completions = this.fuse.search(command[0]).map(result => {
                const shortname = EMOJI_SHORTNAMES[result];
                const unicode = shortnameToUnicode(shortname);
                return {
                    completion: unicode,
                    component: (
                        <PillCompletion title={shortname} initialComponent={<EmojiText style={{maxWidth: '1em'}}>{unicode}</EmojiText>} />
                    ),
                    range,
                };
            }).slice(0, 8);
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
