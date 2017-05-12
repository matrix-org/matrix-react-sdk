import React from 'react';
import _t from 'counterpart';
import AutocompleteProvider from './AutocompleteProvider';
import Fuse from 'fuse.js';
import {TextualCompletion} from './Components';

const COMMANDS = [
    {
        command: '/me',
        args: '<message>',
        description: _t('Displays action'),
    },
    {
        command: '/ban',
        args: '<user-id> [reason]',
        description: _t('Bans user with given id'),
    },
    {
        command: '/deop',
        args: '<user-id>',
        description: _t('Deops user with given id'),
    },
    {
        command: '/invite',
        args: '<user-id>',
        description: _t('Invites user with given id to current room'),
    },
    {
        command: '/join',
        args: '<room-alias>',
        description: _t('Joins room with given alias'),
    },
    {
        command: '/kick',
        args: '<user-id> [reason]',
        description: _t('Kicks user with given id'),
    },
    {
        command: '/nick',
        args: '<display-name>',
        description: _t('Changes your display nickname'),
    },
    {
        command: '/ddg',
        args: '<query>',
        description: _t('Searches DuckDuckGo for results'),
    }
];

let COMMAND_RE = /(^\/\w*)/g;

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
        let {command, range} = this.getCurrentCommand(query, selection);
        if (command) {
            completions = this.fuse.search(command[0]).map(result => {
                return {
                    completion: result.command + ' ',
                    component: (<TextualCompletion
                        title={result.command}
                        subtitle={result.args}
                        description={result.description}
                        />),
                    range,
                };
            });
        }
        return completions;
    }

    getName() {
        return _t('*️⃣ Commands');
    }

    static getInstance(): CommandProvider {
        if (instance == null)
            {instance = new CommandProvider();}

        return instance;
    }

    renderCompletions(completions: [React.Component]): ?React.Component {
        return <div className="mx_Autocomplete_Completion_container_block">
            {completions}
        </div>;
    }
}
