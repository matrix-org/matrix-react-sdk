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

import { logger } from "matrix-js-sdk/src/logger";
import { Direction } from "matrix-js-sdk/src/matrix";

import { _td, UserFriendlyError } from "../languageHandler";
import SettingsStore from "../settings/SettingsStore";
import { reject, success } from "./utils";
import dis from "../dispatcher/dispatcher";
import { ViewRoomPayload } from "../dispatcher/payloads/ViewRoomPayload";
import { Action } from "../dispatcher/actions";
import { Command } from "./command";
import { CommandCategories } from "./interface";

export const jumptodate = new Command({
    command: "jumptodate",
    args: "<YYYY-MM-DD>",
    description: _td("Jump to the given date in the timeline"),
    isEnabled: () => SettingsStore.getValue("feature_jump_to_date"),
    runFn: function (cli, roomId, threadId, args) {
        if (args) {
            return success(
                (async (): Promise<void> => {
                    const unixTimestamp = Date.parse(args);
                    if (!unixTimestamp) {
                        throw new UserFriendlyError(
                            "We were unable to understand the given date (%(inputDate)s). " +
                                "Try using the format YYYY-MM-DD.",
                            { inputDate: args, cause: undefined },
                        );
                    }

                    const { event_id: eventId, origin_server_ts: originServerTs } = await cli.timestampToEvent(
                        roomId,
                        unixTimestamp,
                        Direction.Forward,
                    );
                    logger.log(
                        `/timestamp_to_event: found ${eventId} (${originServerTs}) for timestamp=${unixTimestamp}`,
                    );
                    dis.dispatch<ViewRoomPayload>({
                        action: Action.ViewRoom,
                        event_id: eventId,
                        highlighted: true,
                        room_id: roomId,
                        metricsTrigger: "SlashCommand",
                        metricsViaKeyboard: true,
                    });
                })(),
            );
        }

        return reject(this.getUsage());
    },
    category: CommandCategories.actions,
});
