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

export const spoiler = new Command({
    command: "spoiler",
    args: "<message>",
    description: _td("Sends the given message as a spoiler"),
    runFn: function (cli, roomId, threadId, message = "") {
        return successSync(ContentHelpers.makeHtmlMessage(message, `<span data-mx-spoiler>${message}</span>`));
    },
    category: CommandCategories.messages,
});

export const plain = new Command({
    command: "plain",
    args: "<message>",
    description: _td("Sends a message as plain text, without interpreting it as markdown"),
    runFn: function (cli, roomId, threadId, messages = "") {
        return successSync(ContentHelpers.makeTextMessage(messages));
    },
    category: CommandCategories.messages,
});

export const html = new Command({
    command: "html",
    args: "<message>",
    description: _td("Sends a message as html, without interpreting it as markdown"),
    runFn: function (cli, roomId, threadId, messages = "") {
        return successSync(ContentHelpers.makeHtmlMessage(messages, messages));
    },
    category: CommandCategories.messages,
});

// Command definitions for autocompletion ONLY:
// /me is special because its not handled by SlashCommands.js and is instead done inside the Composer classes
export const me = new Command({
    command: "me",
    args: "<message>",
    description: _td("Displays action"),
    category: CommandCategories.messages,
    hideCompletionAfterSpace: true,
});
