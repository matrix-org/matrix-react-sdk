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

import { User } from "matrix-js-sdk/src/matrix";

import { _td } from "../languageHandler";
import { isCurrentLocalRoom, reject, success } from "./utils";
import dis from "../dispatcher/dispatcher";
import { ViewUserPayload } from "../dispatcher/payloads/ViewUserPayload";
import { Action } from "../dispatcher/actions";
import { Command } from "./command";
import { CommandCategories } from "./interface";

export const whois = new Command({
    command: "whois",
    description: _td("Displays information about a user"),
    args: "<user-id>",
    isEnabled: (cli) => !isCurrentLocalRoom(cli),
    runFn: function (cli, roomId, threadId, userId) {
        if (!userId || !userId.startsWith("@") || !userId.includes(":")) {
            return reject(this.getUsage());
        }

        const member = cli.getRoom(roomId)?.getMember(userId);
        dis.dispatch<ViewUserPayload>({
            action: Action.ViewUser,
            // XXX: We should be using a real member object and not assuming what the receiver wants.
            member: member || ({ userId } as User),
        });
        return success();
    },
    category: CommandCategories.advanced,
});
