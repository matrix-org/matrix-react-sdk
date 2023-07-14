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
import { reject, successSync } from "./utils";
import { textToHtmlRainbow } from "../utils/colour";
import { Command } from "./command";
import { CommandCategories } from "./interface";

export const rainbow = new Command({
    command: "rainbow",
    description: _td("Sends the given message coloured as a rainbow"),
    args: "<message>",
    runFn: function (cli, roomId, threadId, args) {
        if (!args) return reject(this.getUsage());
        return successSync(ContentHelpers.makeHtmlMessage(args, textToHtmlRainbow(args)));
    },
    category: CommandCategories.messages,
});

export const rainbowme = new Command({
    command: "rainbowme",
    description: _td("Sends the given emote coloured as a rainbow"),
    args: "<message>",
    runFn: function (cli, roomId, threadId, args) {
        if (!args) return reject(this.getUsage());
        return successSync(ContentHelpers.makeHtmlEmote(args, textToHtmlRainbow(args)));
    },
    category: CommandCategories.messages,
});
