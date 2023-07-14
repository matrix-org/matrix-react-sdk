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

import * as ContentHelpers from "matrix-js-sdk/src/content-helpers";
import { IContent } from "matrix-js-sdk/src/models/event";

import dis from "./dispatcher/dispatcher";
import { CHAT_EFFECTS } from "./effects";
import { TimelineRenderingType } from "./contexts/RoomContext";
import { MatrixClientPeg } from "./MatrixClientPeg";
import { successSync } from "./slash-commands/utils";
import { deop, op } from "./slash-commands/op";
import { CommandCategories } from "./slash-commands/interface";
import { Command, ICommandOpts } from "./slash-commands/command";
import { lenny, shrug, tableflip, unflip } from "./slash-commands/canned-messages";
import { discardsession, remakeolm, verify } from "./slash-commands/crypto";
import { rainbow, rainbowme } from "./slash-commands/rainbow";
import { ban, remove, unban } from "./slash-commands/moderation";
import { converttodm, converttoroom, msg, query } from "./slash-commands/dm";
import { holdcall, tovirtual, unholdcall } from "./slash-commands/call";
import { addwidget } from "./slash-commands/widget";
import { myavatar, myroomavatar, myroomnick, nick } from "./slash-commands/profile";
import { roomavatar, roomname, topic, upgraderoom } from "./slash-commands/room-settings";
import { html, me, plain, spoiler } from "./slash-commands/messages";
import { jumptodate } from "./slash-commands/jumptodate";
import { ignore, unignore } from "./slash-commands/ignore";
import { rageshake } from "./slash-commands/rageshake";
import { whois } from "./slash-commands/whois";
import { help } from "./slash-commands/help";
import { invite, join, part } from "./slash-commands/membership";

export const Commands = [
    spoiler,
    shrug,
    tableflip,
    unflip,
    lenny,
    plain,
    html,
    upgraderoom,
    jumptodate,
    nick,
    myroomnick,
    roomavatar,
    myroomavatar,
    myavatar,
    topic,
    roomname,
    invite,
    join,
    part,
    remove,
    ban,
    unban,
    ignore,
    unignore,
    op,
    deop,
    addwidget,
    verify,
    discardsession,
    remakeolm,
    rainbow,
    rainbowme,
    help,
    whois,
    rageshake,
    tovirtual,
    query,
    msg,
    holdcall,
    unholdcall,
    converttodm,
    converttoroom,
    me,
    ...CHAT_EFFECTS.map((effect) => {
        return new Command({
            command: effect.command,
            description: effect.description(),
            args: "<message>",
            runFn: function (cli, roomId, threadId, args) {
                let content: IContent;
                if (!args) {
                    content = ContentHelpers.makeEmoteMessage(effect.fallbackMessage());
                } else {
                    content = {
                        msgtype: effect.msgType,
                        body: args,
                    };
                }
                dis.dispatch({ action: `effects.${effect.command}` });
                return successSync(content);
            },
            category: CommandCategories.effects,
            renderingTypes: [TimelineRenderingType.Room],
        });
    }),
];

// build a map from names and aliases to the Command objects.
export const CommandMap = new Map<string, Command>();
Commands.forEach(addCommandToMap);

function addCommandToMap(cmd: Command): void {
    CommandMap.set(cmd.command, cmd);
    cmd.aliases.forEach((alias) => {
        CommandMap.set(alias, cmd);
    });
}

export function registerSlashCommand(cmd: ICommandOpts): void {
    if (CommandMap.has(cmd.command)) {
        throw new Error("Command has already been registered");
    }
    const command = new Command(cmd);
    Commands.push(command);
    addCommandToMap(command);
}

export function parseCommandString(input: string): { cmd?: string; args?: string } {
    // trim any trailing whitespace, as it can confuse the parser for IRC-style commands
    input = input.trimEnd();
    if (input[0] !== "/") return {}; // not a command

    const bits = input.match(/^(\S+?)(?:[ \n]+((.|\n)*))?$/);
    let cmd: string;
    let args: string | undefined;
    if (bits) {
        cmd = bits[1].substring(1).toLowerCase();
        args = bits[2];
    } else {
        cmd = input;
    }

    return { cmd, args };
}

interface ICmd {
    cmd?: Command;
    args?: string;
}

/**
 * Process the given text for /commands and returns a parsed command that can be used for running the operation.
 * @param {string} input The raw text input by the user.
 * @return {ICmd} The parsed command object.
 * Returns an empty object if the input didn't match a command.
 */
export function getCommand(input: string): ICmd {
    const { cmd, args } = parseCommandString(input);

    if (cmd && CommandMap.has(cmd) && CommandMap.get(cmd)!.isEnabled(MatrixClientPeg.get())) {
        return {
            cmd: CommandMap.get(cmd),
            args,
        };
    }
    return {};
}
