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
import { MRoomTopicEventContent } from "matrix-js-sdk/src/@types/topic";
import * as ContentHelpers from "matrix-js-sdk/src/content-helpers";

import { _t, _td, UserFriendlyError } from "../languageHandler";
import { isCurrentLocalRoom, reject, singleMxcUpload, success } from "./utils";
import { htmlSerializeFromMdIfNeeded } from "../editor/serialize";
import { Linkify, topicToHtml } from "../HtmlUtils";
import Modal from "../Modal";
import InfoDialog from "../components/views/dialogs/InfoDialog";
import { TimelineRenderingType } from "../contexts/RoomContext";
import { Command } from "./command";
import RoomUpgradeWarningDialog from "../components/views/dialogs/RoomUpgradeWarningDialog";
import { upgradeRoom } from "../utils/RoomUpgrade";
import { CommandCategories } from "./interface";

export const upgraderoom = new Command({
    command: "upgraderoom",
    args: "<new_version>",
    description: _td("Upgrades a room to a new version"),
    isEnabled: (cli) => !isCurrentLocalRoom(cli),
    runFn: function (cli, roomId, threadId, args) {
        if (args) {
            const room = cli.getRoom(roomId);
            if (!room?.currentState.mayClientSendStateEvent("m.room.tombstone", cli)) {
                return reject(new UserFriendlyError("You do not have the required permissions to use this command."));
            }

            const { finished } = Modal.createDialog(
                RoomUpgradeWarningDialog,
                { roomId: roomId, targetVersion: args },
                /*className=*/ undefined,
                /*isPriority=*/ false,
                /*isStatic=*/ true,
            );

            return success(
                finished.then(async ([resp]): Promise<void> => {
                    if (!resp?.continue) return;
                    await upgradeRoom(room, args, resp.invite);
                }),
            );
        }
        return reject(this.getUsage());
    },
    category: CommandCategories.admin,
    renderingTypes: [TimelineRenderingType.Room],
});

export const roomavatar = new Command({
    command: "roomavatar",
    args: "[<mxc_url>]",
    description: _td("Changes the avatar of the current room"),
    isEnabled: (cli) => !isCurrentLocalRoom(cli),
    runFn: function (cli, roomId, threadId, args) {
        let promise = Promise.resolve(args ?? null);
        if (!args) {
            promise = singleMxcUpload(cli);
        }

        return success(
            promise.then((url) => {
                if (!url) return;
                return cli.sendStateEvent(roomId, "m.room.avatar", { url }, "");
            }),
        );
    },
    category: CommandCategories.actions,
    renderingTypes: [TimelineRenderingType.Room],
});

export const topic = new Command({
    command: "topic",
    args: "[<topic>]",
    description: _td("Gets or sets the room topic"),
    isEnabled: (cli) => !isCurrentLocalRoom(cli),
    runFn: function (cli, roomId, threadId, args) {
        if (args) {
            const html = htmlSerializeFromMdIfNeeded(args, { forceHTML: false });
            return success(cli.setRoomTopic(roomId, args, html));
        }
        const room = cli.getRoom(roomId);
        if (!room) {
            return reject(
                new UserFriendlyError("Failed to get room topic: Unable to find room (%(roomId)s", {
                    roomId,
                    cause: undefined,
                }),
            );
        }

        const content = room.currentState.getStateEvents("m.room.topic", "")?.getContent<MRoomTopicEventContent>();
        const topic = !!content ? ContentHelpers.parseTopicContent(content) : { text: _t("This room has no topic.") };

        const body = topicToHtml(topic.text, topic.html, undefined, true);

        Modal.createDialog(InfoDialog, {
            title: room.name,
            description: <Linkify>{body}</Linkify>,
            hasCloseButton: true,
            className: "markdown-body",
        });
        return success();
    },
    category: CommandCategories.admin,
    renderingTypes: [TimelineRenderingType.Room],
});

export const roomname = new Command({
    command: "roomname",
    args: "<name>",
    description: _td("Sets the room name"),
    isEnabled: (cli) => !isCurrentLocalRoom(cli),
    runFn: function (cli, roomId, threadId, args) {
        if (args) {
            return success(cli.setRoomName(roomId, args));
        }
        return reject(this.getUsage());
    },
    category: CommandCategories.admin,
    renderingTypes: [TimelineRenderingType.Room],
});
