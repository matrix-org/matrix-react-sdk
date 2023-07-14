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

import { _td, UserFriendlyError } from "../languageHandler";
import { isCurrentLocalRoom, reject, success } from "./utils";
import { guessAndSetDMRoom } from "../Rooms";
import { TimelineRenderingType } from "../contexts/RoomContext";
import { Command } from "./command";
import { CommandCategories } from "./interface";

export const converttodm = new Command({
    command: "converttodm",
    description: _td("Converts the room to a DM"),
    category: CommandCategories.other,
    isEnabled: (cli) => !isCurrentLocalRoom(cli),
    runFn: function (cli, roomId, threadId, args) {
        const room = cli.getRoom(roomId);
        if (!room) return reject(new UserFriendlyError("Could not find room"));
        return success(guessAndSetDMRoom(room, true));
    },
    renderingTypes: [TimelineRenderingType.Room],
});

export const converttoroom = new Command({
    command: "converttoroom",
    description: _td("Converts the DM to a room"),
    category: CommandCategories.other,
    isEnabled: (cli) => !isCurrentLocalRoom(cli),
    runFn: function (cli, roomId, threadId, args) {
        const room = cli.getRoom(roomId);
        if (!room) return reject(new UserFriendlyError("Could not find room"));
        return success(guessAndSetDMRoom(room, false));
    },
    renderingTypes: [TimelineRenderingType.Room],
});
