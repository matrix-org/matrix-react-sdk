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
import { isCurrentLocalRoom, reject, singleMxcUpload, success } from "./utils";
import { TimelineRenderingType } from "../contexts/RoomContext";
import { Command } from "./command";
import { CommandCategories } from "./interface";

export const nick = new Command({
    command: "nick",
    args: "<display_name>",
    description: _td("Changes your display nickname"),
    runFn: function (cli, roomId, threadId, args) {
        if (args) {
            return success(cli.setDisplayName(args));
        }
        return reject(this.getUsage());
    },
    category: CommandCategories.actions,
    renderingTypes: [TimelineRenderingType.Room],
});

export const myroomnick = new Command({
    command: "myroomnick",
    aliases: ["roomnick"],
    args: "<display_name>",
    description: _td("Changes your display nickname in the current room only"),
    isEnabled: (cli) => !isCurrentLocalRoom(cli),
    runFn: function (cli, roomId, threadId, args) {
        if (args) {
            const ev = cli.getRoom(roomId)?.currentState.getStateEvents("m.room.member", cli.getSafeUserId());
            const content = {
                ...(ev ? ev.getContent() : { membership: "join" }),
                displayname: args,
            };
            return success(cli.sendStateEvent(roomId, "m.room.member", content, cli.getSafeUserId()));
        }
        return reject(this.getUsage());
    },
    category: CommandCategories.actions,
    renderingTypes: [TimelineRenderingType.Room],
});

export const myroomavatar = new Command({
    command: "myroomavatar",
    args: "[<mxc_url>]",
    description: _td("Changes your profile picture in this current room only"),
    isEnabled: (cli) => !isCurrentLocalRoom(cli),
    runFn: function (cli, roomId, threadId, args) {
        const room = cli.getRoom(roomId);
        const userId = cli.getSafeUserId();

        let promise = Promise.resolve(args ?? null);
        if (!args) {
            promise = singleMxcUpload(cli);
        }

        return success(
            promise.then((url) => {
                if (!url) return;
                const ev = room?.currentState.getStateEvents("m.room.member", userId);
                const content = {
                    ...(ev ? ev.getContent() : { membership: "join" }),
                    avatar_url: url,
                };
                return cli.sendStateEvent(roomId, "m.room.member", content, userId);
            }),
        );
    },
    category: CommandCategories.actions,
    renderingTypes: [TimelineRenderingType.Room],
});

export const myavatar = new Command({
    command: "myavatar",
    args: "[<mxc_url>]",
    description: _td("Changes your profile picture in all rooms"),
    runFn: function (cli, roomId, threadId, args) {
        let promise = Promise.resolve(args ?? null);
        if (!args) {
            promise = singleMxcUpload(cli);
        }

        return success(
            promise.then((url) => {
                if (!url) return;
                return cli.setAvatarUrl(url);
            }),
        );
    },
    category: CommandCategories.actions,
    renderingTypes: [TimelineRenderingType.Room],
});
