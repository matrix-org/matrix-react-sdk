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

import * as React from "react";

import { _t, _td } from "../languageHandler";
import { reject, success } from "./utils";
import Modal from "../Modal";
import InfoDialog from "../components/views/dialogs/InfoDialog";
import { Command } from "./command";
import { CommandCategories } from "./interface";

export const ignore = new Command({
    command: "ignore",
    args: "<user-id>",
    description: _td("Ignores a user, hiding their messages from you"),
    runFn: function (cli, roomId, threadId, args) {
        if (args) {
            const matches = args.match(/^(@[^:]+:\S+)$/);
            if (matches) {
                const userId = matches[1];
                const ignoredUsers = cli.getIgnoredUsers();
                ignoredUsers.push(userId); // de-duped internally in the js-sdk
                return success(
                    cli.setIgnoredUsers(ignoredUsers).then(() => {
                        Modal.createDialog(InfoDialog, {
                            title: _t("Ignored user"),
                            description: (
                                <div>
                                    <p>{_t("You are now ignoring %(userId)s", { userId })}</p>
                                </div>
                            ),
                        });
                    }),
                );
            }
        }
        return reject(this.getUsage());
    },
    category: CommandCategories.actions,
});

export const unignore = new Command({
    command: "unignore",
    args: "<user-id>",
    description: _td("Stops ignoring a user, showing their messages going forward"),
    runFn: function (cli, roomId, threadId, args) {
        if (args) {
            const matches = args.match(/(^@[^:]+:\S+$)/);
            if (matches) {
                const userId = matches[1];
                const ignoredUsers = cli.getIgnoredUsers();
                const index = ignoredUsers.indexOf(userId);
                if (index !== -1) ignoredUsers.splice(index, 1);
                return success(
                    cli.setIgnoredUsers(ignoredUsers).then(() => {
                        Modal.createDialog(InfoDialog, {
                            title: _t("Unignored user"),
                            description: (
                                <div>
                                    <p>{_t("You are no longer ignoring %(userId)s", { userId })}</p>
                                </div>
                            ),
                        });
                    }),
                );
            }
        }
        return reject(this.getUsage());
    },
    category: CommandCategories.actions,
});
