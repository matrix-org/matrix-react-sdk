/*
Copyright 2016 Aviral Dasgupta
Copyright 2017 Vector Creations Ltd
Copyright 2017 New Vector Ltd
Copyright 2018 Michael Telatynski <7t3chguy@gmail.com>

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
import {_t} from '../languageHandler';
import AutocompleteProvider from './AutocompleteProvider';
import QueryMatcher from './QueryMatcher';
import {BotCommandCompletion} from './Components';
import {ICompletion, ISelectionRange} from "./Autocompleter";
import {Command, CommandCategories} from '../SlashCommands';
import Room from "matrix-js-sdk/src/models/room";

const COMMAND_RE = /(^\/\w*)(@\w*)?(?: .*)?/g;

export default class BotCommandProvider extends AutocompleteProvider {
    matcher: QueryMatcher<Command>;
    bots: string[];
    commandMap: Map<string, Command>;
    commandList: Command[];

    constructor(room: Room) {
        super(COMMAND_RE);

        const interactionsState = room.currentState.getStateEvents("dev.nordgedanken.msc3006.bot.interactions");
        this.createCommandsList(interactionsState);

        this.bots = interactionsState.map(bot => {
            return bot.getStateKey();
        });

        this.matcher = new QueryMatcher(this.commandList, {
            keys: ['command', 'args', 'description'],
            funcs: [({aliases}) => aliases.join(" ")], // aliases
        });


        console.log(this.bots);
    }

    createCommandsList(interactionsState) {
        this.commandList = [];
        this.commandMap = new Map();
        interactionsState.forEach(bot => {
            const content = bot.getContent();
            console.log(content);

            content["interactions"]
                .filter(interaction => interaction["type"] == "dev.nordgedanken.msc3006.interaction.command")
                .forEach(interaction => {
                    this.commandList.push(new Command({
                        command: interaction["name"],
                        namespace: bot.getStateKey(),
                        args: '', //TODO needs MSC change
                        description: interaction["description"],
                        // We can only assume this.
                        category: CommandCategories.other,
                        hideCompletionAfterSpace: true,
                    }))
                });
        });

        this.commandList.forEach(cmd => {
            this.commandMap.set(cmd.command, cmd);
            cmd.aliases.forEach(alias => {
                this.commandMap.set(alias, cmd);
            });
        });
    }

    async getCompletions(query: string, selection: ISelectionRange, force?: boolean): Promise<ICompletion[]> {
        const {command, range} = this.getCurrentCommand(query, selection);
        if (!command) return [];

        let matches = [];
        // check if the full match differs from the first word (i.e. returns false if the command has args)
        if (command[0] !== command[1]) {
            // The input looks like a command with arguments, perform exact match
            const name = command[1].substr(1); // strip leading `/`
            if (this.commandMap.has(name) && this.commandMap.get(name).isEnabled()) {
                // some commands, namely `me` and `ddg` don't suit having the usage shown whilst typing their arguments
                if (this.commandMap.get(name).hideCompletionAfterSpace) return [];
                matches = [this.commandMap.get(name)];
            }
        } else {
            if (query === '/') {
                // If they have just entered `/` show everything
                matches = this.commandList;
            } else {
                // otherwise fuzzy match against all of the fields
                matches = this.matcher.match(command[1]);
            }
        }


        return matches.filter(cmd => cmd.isEnabled()).map((result) => {
            let completion = result.getCommand() + result.getNamespace() || "";
            const usedAlias = result.aliases.find(alias => `/${alias}` === command[1]);
            // If the command (or an alias) is the same as the one they entered, we don't want to discard their arguments
            if (usedAlias || result.getCommand() === command[1]) {
                completion = command[0];
            }

            return {
                completion,
                type: "bot_command",
                component: <BotCommandCompletion
                    title={`/${usedAlias || result.command}`}
                    // FIXME: this should show a pillified version of the display name instead!
                    namespace={result.getNamespace() || ""}
                    subtitle={result.args}
                    description={result.description} />,
                range,
            };
        });
    }

    getName() {
        return '*️⃣ ' + _t('Bot Commands');
    }

    // TODO: group by bot somehow
    renderCompletions(completions: React.ReactNode[]): React.ReactNode {
        return (
            <div
                className="mx_Autocomplete_Completion_container_block"
                role="listbox"
                aria-label={_t("Command Autocomplete")}
            >
                { completions }
            </div>
        );
    }
}
