import React from 'react';
import counterpart from 'counterpart';
import AutocompleteProvider from './AutocompleteProvider';
import Fuse from 'fuse.js';
import {TextualCompletion} from './Components';

const COMMANDS = [
    {
        command: '/me',
        args: '<message>',
        description: counterpart.translate('Displays action'),
    },
    {
        command: '/ban',
        args: '<user-id> [reason]',
        description: counterpart.translate('Bans user with given id'),
    },
    {
        command: '/deop',
        args: '<user-id>',
        description: counterpart.translate('Deops user with given id'),
    },
    {
        command: '/invite',
        args: '<user-id>',
        description: counterpart.translate('Invites user with given id to current room'),
    },
    {
        command: '/join',
        args: '<room-alias>',
        description: counterpart.translate('Joins room with given alias'),
    },
    {
        command: '/kick',
        args: '<user-id> [reason]',
        description: counterpart.translate('Kicks user with given id'),
    },
    {
        command: '/nick',
        args: '<display-name>',
        description: counterpart.translate('Changes your display nickname'),
    },
    {
        command: '/ddg',
        args: '<query>',
        description: counterpart.translate('Searches DuckDuckGo for results'),
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
        return counterpart.translate('*️⃣ Commands');
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
