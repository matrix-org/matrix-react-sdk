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
import * as ContentHelpers from "matrix-js-sdk/src/content-helpers";
import { IContent } from "matrix-js-sdk/src/models/event";

import dis from "./dispatcher/dispatcher";
import { _t, _td, UserFriendlyError } from "./languageHandler";
import Modal from "./Modal";
import MultiInviter from "./utils/MultiInviter";
import QuestionDialog from "./components/views/dialogs/QuestionDialog";
import { AddressType, getAddressType } from "./UserAddress";
import { abbreviateUrl } from "./utils/UrlUtils";
import { getDefaultIdentityServerUrl, setToDefaultIdentityServer } from "./utils/IdentityServerUtils";
import { isPermalinkHost, parsePermalink } from "./utils/permalinks/Permalinks";
import { Action } from "./dispatcher/actions";
import { UIComponent } from "./settings/UIFeature";
import { CHAT_EFFECTS } from "./effects";
import { shouldShowComponent } from "./customisations/helpers/UIComponents";
import { TimelineRenderingType } from "./contexts/RoomContext";
import { ViewRoomPayload } from "./dispatcher/payloads/ViewRoomPayload";
import { leaveRoomBehaviour } from "./utils/leave-behaviour";
import { MatrixClientPeg } from "./MatrixClientPeg";
import { isCurrentLocalRoom, reject, success, successSync } from "./slash-commands/utils";
import { deop, op } from "./slash-commands/op";
import { CommandCategories } from "./slash-commands/interface";
import { Command } from "./slash-commands/command";
import { lenny, shrug, tableflip, unflip } from "./slash-commands/canned-messages";
import { discardsession, remakeolm, verify } from "./slash-commands/crypto";
import { rainbow, rainbowme } from "./slash-commands/rainbow";
import { ban, remove, unban } from "./slash-commands/moderation";
import { converttodm, converttoroom, msg, query } from "./slash-commands/dm";
import { holdcall, tovirtual, unholdcall } from "./slash-commands/call";
import { addwidget } from "./slash-commands/widget";
import { myavatar, myroomavatar, myroomnick, nick } from "./slash-commands/profile";
import { roomavatar, roomname, topic, upgraderoom } from "./slash-commands/room-settings";
import { html, me, plain, spoiler } from "./slash-commands/messages";
import { jumptodate } from "./slash-commands/jumptodate";
import { ignore, unignore } from "./slash-commands/ignore";
import { devtools } from "./slash-commands/devtools";
import { rageshake } from "./slash-commands/rageshake";
import { whois } from "./slash-commands/whois";
import { help } from "./slash-commands/help";

export { CommandCategories, Command };

export const Commands = [
    spoiler,
    shrug,
    tableflip,
    unflip,
    lenny,
    plain,
    html,
    upgraderoom,
    jumptodate,
    nick,
    myroomnick,
    roomavatar,
    myroomavatar,
    myavatar,
    topic,
    roomname,
    new Command({
        command: "invite",
        args: "<user-id> [<reason>]",
        description: _td("Invites user with given id to current room"),
        analyticsName: "Invite",
        isEnabled: (cli) => !isCurrentLocalRoom(cli) && shouldShowComponent(UIComponent.InviteUsers),
        runFn: function (cli, roomId, threadId, args) {
            if (args) {
                const [address, reason] = args.split(/\s+(.+)/);
                if (address) {
                    // We use a MultiInviter to re-use the invite logic, even though
                    // we're only inviting one user.
                    // If we need an identity server but don't have one, things
                    // get a bit more complex here, but we try to show something
                    // meaningful.
                    let prom = Promise.resolve();
                    if (getAddressType(address) === AddressType.Email && !cli.getIdentityServerUrl()) {
                        const defaultIdentityServerUrl = getDefaultIdentityServerUrl();
                        if (defaultIdentityServerUrl) {
                            const { finished } = Modal.createDialog(QuestionDialog, {
                                title: _t("Use an identity server"),
                                description: (
                                    <p>
                                        {_t(
                                            "Use an identity server to invite by email. " +
                                                "Click continue to use the default identity server " +
                                                "(%(defaultIdentityServerName)s) or manage in Settings.",
                                            {
                                                defaultIdentityServerName: abbreviateUrl(defaultIdentityServerUrl),
                                            },
                                        )}
                                    </p>
                                ),
                                button: _t("Continue"),
                            });

                            prom = finished.then(([useDefault]) => {
                                if (useDefault) {
                                    setToDefaultIdentityServer(cli);
                                    return;
                                }
                                throw new UserFriendlyError(
                                    "Use an identity server to invite by email. Manage in Settings.",
                                );
                            });
                        } else {
                            return reject(
                                new UserFriendlyError("Use an identity server to invite by email. Manage in Settings."),
                            );
                        }
                    }
                    const inviter = new MultiInviter(cli, roomId);
                    return success(
                        prom
                            .then(() => {
                                return inviter.invite([address], reason, true);
                            })
                            .then(() => {
                                if (inviter.getCompletionState(address) !== "invited") {
                                    const errorStringFromInviterUtility = inviter.getErrorText(address);
                                    if (errorStringFromInviterUtility) {
                                        throw new Error(errorStringFromInviterUtility);
                                    } else {
                                        throw new UserFriendlyError(
                                            "User (%(user)s) did not end up as invited to %(roomId)s but no error was given from the inviter utility",
                                            { user: address, roomId, cause: undefined },
                                        );
                                    }
                                }
                            }),
                    );
                }
            }
            return reject(this.getUsage());
        },
        category: CommandCategories.actions,
        renderingTypes: [TimelineRenderingType.Room],
    }),
    new Command({
        command: "join",
        aliases: ["j", "goto"],
        args: "<room-address>",
        description: _td("Joins room with given address"),
        runFn: function (cli, roomId, threadId, args) {
            if (args) {
                // Note: we support 2 versions of this command. The first is
                // the public-facing one for most users and the other is a
                // power-user edition where someone may join via permalink or
                // room ID with optional servers. Practically, this results
                // in the following variations:
                //   /join #example:example.org
                //   /join !example:example.org
                //   /join !example:example.org altserver.com elsewhere.ca
                //   /join https://matrix.to/#/!example:example.org?via=altserver.com
                // The command also supports event permalinks transparently:
                //   /join https://matrix.to/#/!example:example.org/$something:example.org
                //   /join https://matrix.to/#/!example:example.org/$something:example.org?via=altserver.com
                const params = args.split(" ");
                if (params.length < 1) return reject(this.getUsage());

                let isPermalink = false;
                if (params[0].startsWith("http:") || params[0].startsWith("https:")) {
                    // It's at least a URL - try and pull out a hostname to check against the
                    // permalink handler
                    const parsedUrl = new URL(params[0]);
                    const hostname = parsedUrl.host || parsedUrl.hostname; // takes first non-falsey value

                    // if we're using a Element permalink handler, this will catch it before we get much further.
                    // see below where we make assumptions about parsing the URL.
                    if (isPermalinkHost(hostname)) {
                        isPermalink = true;
                    }
                }
                if (params[0][0] === "#") {
                    let roomAlias = params[0];
                    if (!roomAlias.includes(":")) {
                        roomAlias += ":" + cli.getDomain();
                    }

                    dis.dispatch<ViewRoomPayload>({
                        action: Action.ViewRoom,
                        room_alias: roomAlias,
                        auto_join: true,
                        metricsTrigger: "SlashCommand",
                        metricsViaKeyboard: true,
                    });
                    return success();
                } else if (params[0][0] === "!") {
                    const [roomId, ...viaServers] = params;

                    dis.dispatch<ViewRoomPayload>({
                        action: Action.ViewRoom,
                        room_id: roomId,
                        via_servers: viaServers, // for the rejoin button
                        auto_join: true,
                        metricsTrigger: "SlashCommand",
                        metricsViaKeyboard: true,
                    });
                    return success();
                } else if (isPermalink) {
                    const permalinkParts = parsePermalink(params[0]);

                    // This check technically isn't needed because we already did our
                    // safety checks up above. However, for good measure, let's be sure.
                    if (!permalinkParts) {
                        return reject(this.getUsage());
                    }

                    // If for some reason someone wanted to join a user, we should
                    // stop them now.
                    if (!permalinkParts.roomIdOrAlias) {
                        return reject(this.getUsage());
                    }

                    const entity = permalinkParts.roomIdOrAlias;
                    const viaServers = permalinkParts.viaServers;
                    const eventId = permalinkParts.eventId;

                    const dispatch: ViewRoomPayload = {
                        action: Action.ViewRoom,
                        auto_join: true,
                        metricsTrigger: "SlashCommand",
                        metricsViaKeyboard: true,
                    };

                    if (entity[0] === "!") dispatch["room_id"] = entity;
                    else dispatch["room_alias"] = entity;

                    if (eventId) {
                        dispatch["event_id"] = eventId;
                        dispatch["highlighted"] = true;
                    }

                    if (viaServers) {
                        // For the join, these are passed down to the js-sdk's /join call
                        dispatch["opts"] = { viaServers };

                        // For if the join fails (rejoin button)
                        dispatch["via_servers"] = viaServers;
                    }

                    dis.dispatch(dispatch);
                    return success();
                }
            }
            return reject(this.getUsage());
        },
        category: CommandCategories.actions,
        renderingTypes: [TimelineRenderingType.Room],
    }),
    new Command({
        command: "part",
        args: "[<room-address>]",
        description: _td("Leave room"),
        analyticsName: "Part",
        isEnabled: (cli) => !isCurrentLocalRoom(cli),
        runFn: function (cli, roomId, threadId, args) {
            let targetRoomId: string | undefined;
            if (args) {
                const matches = args.match(/^(\S+)$/);
                if (matches) {
                    let roomAlias = matches[1];
                    if (roomAlias[0] !== "#") return reject(this.getUsage());

                    if (!roomAlias.includes(":")) {
                        roomAlias += ":" + cli.getDomain();
                    }

                    // Try to find a room with this alias
                    const rooms = cli.getRooms();
                    targetRoomId = rooms.find((room) => {
                        return room.getCanonicalAlias() === roomAlias || room.getAltAliases().includes(roomAlias);
                    })?.roomId;
                    if (!targetRoomId) {
                        return reject(
                            new UserFriendlyError("Unrecognised room address: %(roomAlias)s", {
                                roomAlias,
                                cause: undefined,
                            }),
                        );
                    }
                }
            }

            if (!targetRoomId) targetRoomId = roomId;
            return success(leaveRoomBehaviour(cli, targetRoomId));
        },
        category: CommandCategories.actions,
        renderingTypes: [TimelineRenderingType.Room],
    }),
    remove,
    ban,
    unban,
    ignore,
    unignore,
    op,
    deop,
    devtools,
    addwidget,
    verify,
    discardsession,
    remakeolm,
    rainbow,
    rainbowme,
    help,
    whois,
    rageshake,
    tovirtual,
    query,
    msg,
    holdcall,
    unholdcall,
    converttodm,
    converttoroom,
    me,
    ...CHAT_EFFECTS.map((effect) => {
        return new Command({
            command: effect.command,
            description: effect.description(),
            args: "<message>",
            runFn: function (cli, roomId, threadId, args) {
                let content: IContent;
                if (!args) {
                    content = ContentHelpers.makeEmoteMessage(effect.fallbackMessage());
                } else {
                    content = {
                        msgtype: effect.msgType,
                        body: args,
                    };
                }
                dis.dispatch({ action: `effects.${effect.command}` });
                return successSync(content);
            },
            category: CommandCategories.effects,
            renderingTypes: [TimelineRenderingType.Room],
        });
    }),
];

// build a map from names and aliases to the Command objects.
export const CommandMap = new Map<string, Command>();
Commands.forEach((cmd) => {
    CommandMap.set(cmd.command, cmd);
    cmd.aliases.forEach((alias) => {
        CommandMap.set(alias, cmd);
    });
});

export function parseCommandString(input: string): { cmd?: string; args?: string } {
    // trim any trailing whitespace, as it can confuse the parser for IRC-style commands
    input = input.trimEnd();
    if (input[0] !== "/") return {}; // not a command

    const bits = input.match(/^(\S+?)(?:[ \n]+((.|\n)*))?$/);
    let cmd: string;
    let args: string | undefined;
    if (bits) {
        cmd = bits[1].substring(1).toLowerCase();
        args = bits[2];
    } else {
        cmd = input;
    }

    return { cmd, args };
}

interface ICmd {
    cmd?: Command;
    args?: string;
}

/**
 * Process the given text for /commands and returns a parsed command that can be used for running the operation.
 * @param {string} input The raw text input by the user.
 * @return {ICmd} The parsed command object.
 * Returns an empty object if the input didn't match a command.
 */
export function getCommand(input: string): ICmd {
    const { cmd, args } = parseCommandString(input);

    if (cmd && CommandMap.has(cmd) && CommandMap.get(cmd)!.isEnabled(MatrixClientPeg.get())) {
        return {
            cmd: CommandMap.get(cmd),
            args,
        };
    }
    return {};
}
