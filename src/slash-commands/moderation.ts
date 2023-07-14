/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2018 New Vector Ltd
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2020 The Matrix.org Foundation C.I.C.

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

import { _td } from "../languageHandler";
import { isCurrentLocalRoom, reject, success } from "./utils";
import { TimelineRenderingType } from "../contexts/RoomContext";
import { Command } from "./command";
import { CommandCategories } from "./interface";

export const remove = new Command({
    command: "remove",
    aliases: ["kick"],
    args: "<user-id> [reason]",
    description: _td("Removes user with given id from this room"),
    isEnabled: (cli) => !isCurrentLocalRoom(cli),
    runFn: function (cli, roomId, threadId, args) {
        if (args) {
            const matches = args.match(/^(\S+?)( +(.*))?$/);
            if (matches) {
                return success(cli.kick(roomId, matches[1], matches[3]));
            }
        }
        return reject(this.getUsage());
    },
    category: CommandCategories.admin,
    renderingTypes: [TimelineRenderingType.Room],
});

export const ban = new Command({
    command: "ban",
    args: "<user-id> [reason]",
    description: _td("Bans user with given id"),
    isEnabled: (cli) => !isCurrentLocalRoom(cli),
    runFn: function (cli, roomId, threadId, args) {
        if (args) {
            const matches = args.match(/^(\S+?)( +(.*))?$/);
            if (matches) {
                return success(cli.ban(roomId, matches[1], matches[3]));
            }
        }
        return reject(this.getUsage());
    },
    category: CommandCategories.admin,
    renderingTypes: [TimelineRenderingType.Room],
});

export const unban = new Command({
    command: "unban",
    args: "<user-id>",
    description: _td("Unbans user with given ID"),
    isEnabled: (cli) => !isCurrentLocalRoom(cli),
    runFn: function (cli, roomId, threadId, args) {
        if (args) {
            const matches = args.match(/^(\S+)$/);
            if (matches) {
                // Reset the user membership to "leave" to unban him
                return success(cli.unban(roomId, matches[1]));
            }
        }
        return reject(this.getUsage());
    },
    category: CommandCategories.admin,
    renderingTypes: [TimelineRenderingType.Room],
});
