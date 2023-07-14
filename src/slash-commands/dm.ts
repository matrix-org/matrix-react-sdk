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
import LegacyCallHandler from "../LegacyCallHandler";
import { ensureDMExists } from "../createRoom";
import dis from "../dispatcher/dispatcher";
import { ViewRoomPayload } from "../dispatcher/payloads/ViewRoomPayload";
import { Action } from "../dispatcher/actions";

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

export const query = new Command({
    command: "query",
    description: _td("Opens chat with the given user"),
    args: "<user-id>",
    runFn: function (cli, roomId, threadId, userId) {
        // easter-egg for now: look up phone numbers through the thirdparty API
        // (very dumb phone number detection...)
        const isPhoneNumber = userId && /^\+?[0123456789]+$/.test(userId);
        if (!userId || ((!userId.startsWith("@") || !userId.includes(":")) && !isPhoneNumber)) {
            return reject(this.getUsage());
        }

        return success(
            (async (): Promise<void> => {
                if (isPhoneNumber) {
                    const results = await LegacyCallHandler.instance.pstnLookup(userId);
                    if (!results || results.length === 0 || !results[0].userid) {
                        throw new UserFriendlyError("Unable to find Matrix ID for phone number");
                    }
                    userId = results[0].userid;
                }

                const roomId = await ensureDMExists(cli, userId);
                if (!roomId) throw new Error("Failed to ensure DM exists");

                dis.dispatch<ViewRoomPayload>({
                    action: Action.ViewRoom,
                    room_id: roomId,
                    metricsTrigger: "SlashCommand",
                    metricsViaKeyboard: true,
                });
            })(),
        );
    },
    category: CommandCategories.actions,
});

export const msg = new Command({
    command: "msg",
    description: _td("Sends a message to the given user"),
    args: "<user-id> [<message>]",
    runFn: function (cli, roomId, threadId, args) {
        if (args) {
            // matches the first whitespace delimited group and then the rest of the string
            const matches = args.match(/^(\S+?)(?: +(.*))?$/s);
            if (matches) {
                const [userId, msg] = matches.slice(1);
                if (userId && userId.startsWith("@") && userId.includes(":")) {
                    return success(
                        (async (): Promise<void> => {
                            const roomId = await ensureDMExists(cli, userId);
                            if (!roomId) throw new Error("Failed to ensure DM exists");

                            dis.dispatch<ViewRoomPayload>({
                                action: Action.ViewRoom,
                                room_id: roomId,
                                metricsTrigger: "SlashCommand",
                                metricsViaKeyboard: true,
                            });
                            if (msg) {
                                cli.sendTextMessage(roomId, msg);
                            }
                        })(),
                    );
                }
            }
        }

        return reject(this.getUsage());
    },
    category: CommandCategories.actions,
});
