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

import { _td } from "../languageHandler";
import { successSync } from "./utils";
import { Command } from "./command";
import { CommandCategories } from "./interface";

export const shrug = new Command({
    command: "shrug",
    args: "<message>",
    description: _td("Prepends ¯\\_(ツ)_/¯ to a plain-text message"),
    runFn: function (cli, roomId, threadId, args) {
        let message = "¯\\_(ツ)_/¯";
        if (args) {
            message = message + " " + args;
        }
        return successSync(ContentHelpers.makeTextMessage(message));
    },
    category: CommandCategories.messages,
});

export const tableflip = new Command({
    command: "tableflip",
    args: "<message>",
    description: _td("Prepends (╯°□°）╯︵ ┻━┻ to a plain-text message"),
    runFn: function (cli, roomId, threadId, args) {
        let message = "(╯°□°）╯︵ ┻━┻";
        if (args) {
            message = message + " " + args;
        }
        return successSync(ContentHelpers.makeTextMessage(message));
    },
    category: CommandCategories.messages,
});

export const unflip = new Command({
    command: "unflip",
    args: "<message>",
    description: _td("Prepends ┬──┬ ノ( ゜-゜ノ) to a plain-text message"),
    runFn: function (cli, roomId, threadId, args) {
        let message = "┬──┬ ノ( ゜-゜ノ)";
        if (args) {
            message = message + " " + args;
        }
        return successSync(ContentHelpers.makeTextMessage(message));
    },
    category: CommandCategories.messages,
});

export const lenny = new Command({
    command: "lenny",
    args: "<message>",
    description: _td("Prepends ( ͡° ͜ʖ ͡°) to a plain-text message"),
    runFn: function (cli, roomId, threadId, args) {
        let message = "( ͡° ͜ʖ ͡°)";
        if (args) {
            message = message + " " + args;
        }
        return successSync(ContentHelpers.makeTextMessage(message));
    },
    category: CommandCategories.messages,
});
