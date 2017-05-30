import React from 'react';
import { _t } from '../languageHandler';
import AutocompleteProvider from './AutocompleteProvider';
import Fuse from 'fuse.js';
import {TextualCompletion} from './Components';

// Warning: Since the description string will be translated in _t(result.description), all these strings below must be in i18n/strings/en_EN.json file
const COMMANDS = [
    {
        command: '/me',
        args: '<message>',
        description: 'Displays action',
    },
    {
        command: '/ban',
        args: '<user-id> [reason]',
        description: 'Bans user with given id',
    },
    {
        command: '/deop',
        args: '<user-id>',
        description: 'Deops user with given id',
    },
    {
        command: '/invite',
        args: '<user-id>',
        description: 'Invites user with given id to current room',
    },
    {
        command: '/join',
        args: '<room-alias>',
        description: 'Joins room with given alias',
    },
    {
        command: '/kick',
        args: '<user-id> [reason]',
        description: 'Kicks user with given id',
    },
    {
        command: '/nick',
        args: '<display-name>',
        description: 'Changes your display nickname',
    },
    {
        command: '/ddg',
        args: '<query>',
        description: 'Searches DuckDuckGo for results',
    },
];

const COMMAND_RE = /(^\/\w*)/g;

let instance = null;

export default class CommandProvider extends AutocompleteProvider {
    constructor() {
        super(COMMAND_RE);
        this.fuse = new Fuse(COMMANDS, {
           keys: ['command', 'args', 'description'],
        });
    }

    async getCompletions(query: string, selection: {start: number, end: number}) {
        let completions = [];
        const {command, range} = this.getCurrentCommand(query, selection);
        if (command) {
            completions = this.fuse.search(command[0]).map((result) => {
                return {
                    completion: result.command + ' ',
                    component: (<TextualCompletion
                        title={result.command}
                        subtitle={result.args}
                        description={ _t(result.description) }
                        />),
                    range,
                };
            });
        }
        return completions;
    }

    getName() {
        return '*️⃣ ' + _t('Commands');
    }

    static getInstance(): CommandProvider {
        if (instance === null) instance = new CommandProvider();

        return instance;
    }

    renderCompletions(completions: [React.Component]): ?React.Component {
        return <div className="mx_Autocomplete_Completion_container_block">
            {completions}
        </div>;
    }
}
