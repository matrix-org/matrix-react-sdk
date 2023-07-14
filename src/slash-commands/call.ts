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
import LegacyCallHandler from "../LegacyCallHandler";
import { TimelineRenderingType } from "../contexts/RoomContext";
import { Command } from "./command";
import VoipUserMapper from "../VoipUserMapper";
import dis from "../dispatcher/dispatcher";
import { ViewRoomPayload } from "../dispatcher/payloads/ViewRoomPayload";
import { Action } from "../dispatcher/actions";
import { CommandCategories } from "./interface";

export const tovirtual = new Command({
    command: "tovirtual",
    description: _td("Switches to this room's virtual room, if it has one"),
    category: CommandCategories.advanced,
    isEnabled(cli): boolean {
        return !!LegacyCallHandler.instance.getSupportsVirtualRooms() && !isCurrentLocalRoom(cli);
    },
    runFn: (cli, roomId) => {
        return success(
            (async (): Promise<void> => {
                const room = await VoipUserMapper.sharedInstance().getVirtualRoomForRoom(roomId);
                if (!room) throw new UserFriendlyError("No virtual room for this room");
                dis.dispatch<ViewRoomPayload>({
                    action: Action.ViewRoom,
                    room_id: room.roomId,
                    metricsTrigger: "SlashCommand",
                    metricsViaKeyboard: true,
                });
            })(),
        );
    },
});

export const holdcall = new Command({
    command: "holdcall",
    description: _td("Places the call in the current room on hold"),
    category: CommandCategories.other,
    isEnabled: (cli) => !isCurrentLocalRoom(cli),
    runFn: function (cli, roomId, threadId, args) {
        const call = LegacyCallHandler.instance.getCallForRoom(roomId);
        if (!call) {
            return reject(new UserFriendlyError("No active call in this room"));
        }
        call.setRemoteOnHold(true);
        return success();
    },
    renderingTypes: [TimelineRenderingType.Room],
});

export const unholdcall = new Command({
    command: "unholdcall",
    description: _td("Takes the call in the current room off hold"),
    category: CommandCategories.other,
    isEnabled: (cli) => !isCurrentLocalRoom(cli),
    runFn: function (cli, roomId, threadId, args) {
        const call = LegacyCallHandler.instance.getCallForRoom(roomId);
        if (!call) {
            return reject(new UserFriendlyError("No active call in this room"));
        }
        call.setRemoteOnHold(false);
        return success();
    },
    renderingTypes: [TimelineRenderingType.Room],
});
