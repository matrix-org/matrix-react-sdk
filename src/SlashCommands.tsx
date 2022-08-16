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

import * as React from 'react';
import { User } from "matrix-js-sdk/src/models/user";
import { Direction } from 'matrix-js-sdk/src/models/event-timeline';
import { EventType } from "matrix-js-sdk/src/@types/event";
import * as ContentHelpers from 'matrix-js-sdk/src/content-helpers';
import { Element as ChildElement, parseFragment as parseHtml } from "parse5";
import { logger } from "matrix-js-sdk/src/logger";
import { IContent } from 'matrix-js-sdk/src/models/event';
import { MRoomTopicEventContent } from 'matrix-js-sdk/src/@types/topic';
import { SlashCommand as SlashCommandEvent } from "@matrix-org/analytics-events/types/typescript/SlashCommand";

import { MatrixClientPeg } from './MatrixClientPeg';
import dis from './dispatcher/dispatcher';
import { _t, _td, ITranslatableError, newTranslatableError } from './languageHandler';
import Modal from './Modal';
import MultiInviter from './utils/MultiInviter';
import { linkifyElement, topicToHtml } from './HtmlUtils';
import QuestionDialog from "./components/views/dialogs/QuestionDialog";
import WidgetUtils from "./utils/WidgetUtils";
import { textToHtmlRainbow } from "./utils/colour";
import { AddressType, getAddressType } from './UserAddress';
import { abbreviateUrl } from './utils/UrlUtils';
import { getDefaultIdentityServerUrl, setToDefaultIdentityServer } from './utils/IdentityServerUtils';
import { isPermalinkHost, parsePermalink } from "./utils/permalinks/Permalinks";
import { WidgetType } from "./widgets/WidgetType";
import { Jitsi } from "./widgets/Jitsi";
import BugReportDialog from "./components/views/dialogs/BugReportDialog";
import { ensureDMExists } from "./createRoom";
import { ViewUserPayload } from "./dispatcher/payloads/ViewUserPayload";
import { Action } from "./dispatcher/actions";
import { EffectiveMembership, getEffectiveMembership } from "./utils/membership";
import SdkConfig from "./SdkConfig";
import SettingsStore from "./settings/SettingsStore";
import { UIComponent, UIFeature } from "./settings/UIFeature";
import { CHAT_EFFECTS } from "./effects";
import CallHandler from "./CallHandler";
import { guessAndSetDMRoom } from "./Rooms";
import { upgradeRoom } from './utils/RoomUpgrade';
import UploadConfirmDialog from './components/views/dialogs/UploadConfirmDialog';
import DevtoolsDialog from './components/views/dialogs/DevtoolsDialog';
import RoomUpgradeWarningDialog from "./components/views/dialogs/RoomUpgradeWarningDialog";
import InfoDialog from "./components/views/dialogs/InfoDialog";
import SlashCommandHelpDialog from "./components/views/dialogs/SlashCommandHelpDialog";
import { shouldShowComponent } from "./customisations/helpers/UIComponents";
import { TimelineRenderingType } from './contexts/RoomContext';
import { RoomViewStore } from "./stores/RoomViewStore";
import { XOR } from "./@types/common";
import { PosthogAnalytics } from "./PosthogAnalytics";
import { ViewRoomPayload } from "./dispatcher/payloads/ViewRoomPayload";
import VoipUserMapper from './VoipUserMapper';
import { htmlSerializeFromMdIfNeeded } from './editor/serialize';
import { leaveRoomBehaviour } from "./utils/leave-behaviour";
import { isLocalRoom } from './utils/localRoom/isLocalRoom';

// XXX: workaround for https://github.com/microsoft/TypeScript/issues/31816
interface HTMLInputEvent extends Event {
    target: HTMLInputElement & EventTarget;
}

const singleMxcUpload = async (): Promise<any> => {
    return new Promise((resolve) => {
        const fileSelector = document.createElement('input');
        fileSelector.setAttribute('type', 'file');
        fileSelector.onchange = (ev: HTMLInputEvent) => {
            const file = ev.target.files[0];

            Modal.createDialog(UploadConfirmDialog, {
                file,
                onFinished: (shouldContinue) => {
                    resolve(shouldContinue ? MatrixClientPeg.get().uploadContent(file) : null);
                },
            });
        };

        fileSelector.click();
    });
};

export const CommandCategories = {
    "messages": _td("Messages"),
    "actions": _td("Actions"),
    "admin": _td("Admin"),
    "advanced": _td("Advanced"),
    "effects": _td("Effects"),
    "other": _td("Other"),
};

export type RunResult = XOR<{ error: Error | ITranslatableError }, { promise: Promise<IContent | undefined> }>;

type RunFn = ((roomId: string, args: string, cmd: string) => RunResult);

interface ICommandOpts {
    command: string;
    aliases?: string[];
    args?: string;
    description: string;
    analyticsName?: SlashCommandEvent["command"];
    runFn?: RunFn;
    category: string;
    hideCompletionAfterSpace?: boolean;
    isEnabled?(): boolean;
    renderingTypes?: TimelineRenderingType[];
}

export class Command {
    public readonly command: string;
    public readonly aliases: string[];
    public readonly args: undefined | string;
    public readonly description: string;
    public readonly runFn: undefined | RunFn;
    public readonly category: string;
    public readonly hideCompletionAfterSpace: boolean;
    public readonly renderingTypes?: TimelineRenderingType[];
    public readonly analyticsName?: SlashCommandEvent["command"];
    private readonly _isEnabled?: () => boolean;

    constructor(opts: ICommandOpts) {
        this.command = opts.command;
        this.aliases = opts.aliases || [];
        this.args = opts.args || "";
        this.description = opts.description;
        this.runFn = opts.runFn;
        this.category = opts.category || CommandCategories.other;
        this.hideCompletionAfterSpace = opts.hideCompletionAfterSpace || false;
        this._isEnabled = opts.isEnabled;
        this.renderingTypes = opts.renderingTypes;
        this.analyticsName = opts.analyticsName;
    }

    public getCommand() {
        return `/${this.command}`;
    }

    public getCommandWithArgs() {
        return this.getCommand() + " " + this.args;
    }

    public run(roomId: string, threadId: string, args: string): RunResult {
        // if it has no runFn then its an ignored/nop command (autocomplete only) e.g `/me`
        if (!this.runFn) {
            return reject(
                newTranslatableError(
                    "Command error: Unable to handle slash command.",
                ),
            );
        }

        const renderingType = threadId
            ? TimelineRenderingType.Thread
            : TimelineRenderingType.Room;
        if (this.renderingTypes && !this.renderingTypes?.includes(renderingType)) {
            return reject(
                newTranslatableError(
                    "Command error: Unable to find rendering type (%(renderingType)s)",
                    { renderingType },
                ),
            );
        }

        if (this.analyticsName) {
            PosthogAnalytics.instance.trackEvent<SlashCommandEvent>({
                eventName: "SlashCommand",
                command: this.analyticsName,
            });
        }

        return this.runFn.bind(this)(roomId, args);
    }

    public getUsage() {
        return _t('Usage') + ': ' + this.getCommandWithArgs();
    }

    public isEnabled(): boolean {
        return this._isEnabled ? this._isEnabled() : true;
    }
}

function reject(error) {
    return { error };
}

function success(promise?: Promise<any>) {
    return { promise };
}

function successSync(value: any) {
    return success(Promise.resolve(value));
}

const isCurrentLocalRoom = (): boolean => {
    const cli = MatrixClientPeg.get();
    const room = cli.getRoom(RoomViewStore.instance.getRoomId());
    return isLocalRoom(room);
};

/* Disable the "unexpected this" error for these commands - all of the run
 * functions are called with `this` bound to the Command instance.
 */

export const Commands = [
    new Command({
        command: 'spoiler',
        args: '<message>',
        description: _td('Sends the given message as a spoiler'),
        runFn: function(roomId, message) {
            return successSync(ContentHelpers.makeHtmlMessage(
                message,
                `<span data-mx-spoiler>${message}</span>`,
            ));
        },
        category: CommandCategories.messages,
    }),
    new Command({
        command: 'shrug',
        args: '<message>',
        description: _td('Prepends ¯\\_(ツ)_/¯ to a plain-text message'),
        runFn: function(roomId, args) {
            let message = '¯\\_(ツ)_/¯';
            if (args) {
                message = message + ' ' + args;
            }
            return successSync(ContentHelpers.makeTextMessage(message));
        },
        category: CommandCategories.messages,
    }),
    new Command({
        command: 'tableflip',
        args: '<message>',
        description: _td('Prepends (╯°□°）╯︵ ┻━┻ to a plain-text message'),
        runFn: function(roomId, args) {
            let message = '(╯°□°）╯︵ ┻━┻';
            if (args) {
                message = message + ' ' + args;
            }
            return successSync(ContentHelpers.makeTextMessage(message));
        },
        category: CommandCategories.messages,
    }),
    new Command({
        command: 'unflip',
        args: '<message>',
        description: _td('Prepends ┬──┬ ノ( ゜-゜ノ) to a plain-text message'),
        runFn: function(roomId, args) {
            let message = '┬──┬ ノ( ゜-゜ノ)';
            if (args) {
                message = message + ' ' + args;
            }
            return successSync(ContentHelpers.makeTextMessage(message));
        },
        category: CommandCategories.messages,
    }),
    new Command({
        command: 'lenny',
        args: '<message>',
        description: _td('Prepends ( ͡° ͜ʖ ͡°) to a plain-text message'),
        runFn: function(roomId, args) {
            let message = '( ͡° ͜ʖ ͡°)';
            if (args) {
                message = message + ' ' + args;
            }
            return successSync(ContentHelpers.makeTextMessage(message));
        },
        category: CommandCategories.messages,
    }),
    new Command({
        command: 'plain',
        args: '<message>',
        description: _td('Sends a message as plain text, without interpreting it as markdown'),
        runFn: function(roomId, messages) {
            return successSync(ContentHelpers.makeTextMessage(messages));
        },
        category: CommandCategories.messages,
    }),
    new Command({
        command: 'html',
        args: '<message>',
        description: _td('Sends a message as html, without interpreting it as markdown'),
        runFn: function(roomId, messages) {
            return successSync(ContentHelpers.makeHtmlMessage(messages, messages));
        },
        category: CommandCategories.messages,
    }),
    new Command({
        command: 'upgraderoom',
        args: '<new_version>',
        description: _td('Upgrades a room to a new version'),
        isEnabled: () => !isCurrentLocalRoom(),
        runFn: function(roomId, args) {
            if (args) {
                const cli = MatrixClientPeg.get();
                const room = cli.getRoom(roomId);
                if (!room.currentState.mayClientSendStateEvent("m.room.tombstone", cli)) {
                    return reject(
                        newTranslatableError("You do not have the required permissions to use this command."),
                    );
                }

                const { finished } = Modal.createDialog(
                    RoomUpgradeWarningDialog, { roomId: roomId, targetVersion: args }, /*className=*/null,
                    /*isPriority=*/false, /*isStatic=*/true);

                return success(finished.then(async ([resp]) => {
                    if (!resp?.continue) return;
                    await upgradeRoom(room, args, resp.invite);
                }));
            }
            return reject(this.getUsage());
        },
        category: CommandCategories.admin,
        renderingTypes: [TimelineRenderingType.Room],
    }),
    new Command({
        command: 'jumptodate',
        args: '<YYYY-MM-DD>',
        description: _td('Jump to the given date in the timeline'),
        isEnabled: () => SettingsStore.getValue("feature_jump_to_date"),
        runFn: function(roomId, args) {
            if (args) {
                return success((async () => {
                    const unixTimestamp = Date.parse(args);
                    if (!unixTimestamp) {
                        throw newTranslatableError(
                            'We were unable to understand the given date (%(inputDate)s). ' +
                                'Try using the format YYYY-MM-DD.',
                            { inputDate: args },
                        );
                    }

                    const cli = MatrixClientPeg.get();
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
                })());
            }

            return reject(this.getUsage());
        },
        category: CommandCategories.actions,
    }),
    new Command({
        command: 'nick',
        args: '<display_name>',
        description: _td('Changes your display nickname'),
        runFn: function(roomId, args) {
            if (args) {
                return success(MatrixClientPeg.get().setDisplayName(args));
            }
            return reject(this.getUsage());
        },
        category: CommandCategories.actions,
        renderingTypes: [TimelineRenderingType.Room],
    }),
    new Command({
        command: 'myroomnick',
        aliases: ['roomnick'],
        args: '<display_name>',
        description: _td('Changes your display nickname in the current room only'),
        isEnabled: () => !isCurrentLocalRoom(),
        runFn: function(roomId, args) {
            if (args) {
                const cli = MatrixClientPeg.get();
                const ev = cli.getRoom(roomId).currentState.getStateEvents('m.room.member', cli.getUserId());
                const content = {
                    ...(ev ? ev.getContent() : { membership: 'join' }),
                    displayname: args,
                };
                return success(cli.sendStateEvent(roomId, 'm.room.member', content, cli.getUserId()));
            }
            return reject(this.getUsage());
        },
        category: CommandCategories.actions,
        renderingTypes: [TimelineRenderingType.Room],
    }),
    new Command({
        command: 'roomavatar',
        args: '[<mxc_url>]',
        description: _td('Changes the avatar of the current room'),
        isEnabled: () => !isCurrentLocalRoom(),
        runFn: function(roomId, args) {
            let promise = Promise.resolve(args);
            if (!args) {
                promise = singleMxcUpload();
            }

            return success(promise.then((url) => {
                if (!url) return;
                return MatrixClientPeg.get().sendStateEvent(roomId, 'm.room.avatar', { url }, '');
            }));
        },
        category: CommandCategories.actions,
        renderingTypes: [TimelineRenderingType.Room],
    }),
    new Command({
        command: 'myroomavatar',
        args: '[<mxc_url>]',
        description: _td('Changes your avatar in this current room only'),
        isEnabled: () => !isCurrentLocalRoom(),
        runFn: function(roomId, args) {
            const cli = MatrixClientPeg.get();
            const room = cli.getRoom(roomId);
            const userId = cli.getUserId();

            let promise = Promise.resolve(args);
            if (!args) {
                promise = singleMxcUpload();
            }

            return success(promise.then((url) => {
                if (!url) return;
                const ev = room.currentState.getStateEvents('m.room.member', userId);
                const content = {
                    ...(ev ? ev.getContent() : { membership: 'join' }),
                    avatar_url: url,
                };
                return cli.sendStateEvent(roomId, 'm.room.member', content, userId);
            }));
        },
        category: CommandCategories.actions,
        renderingTypes: [TimelineRenderingType.Room],
    }),
    new Command({
        command: 'myavatar',
        args: '[<mxc_url>]',
        description: _td('Changes your avatar in all rooms'),
        runFn: function(roomId, args) {
            let promise = Promise.resolve(args);
            if (!args) {
                promise = singleMxcUpload();
            }

            return success(promise.then((url) => {
                if (!url) return;
                return MatrixClientPeg.get().setAvatarUrl(url);
            }));
        },
        category: CommandCategories.actions,
        renderingTypes: [TimelineRenderingType.Room],
    }),
    new Command({
        command: 'topic',
        args: '[<topic>]',
        description: _td('Gets or sets the room topic'),
        isEnabled: () => !isCurrentLocalRoom(),
        runFn: function(roomId, args) {
            const cli = MatrixClientPeg.get();
            if (args) {
                const html = htmlSerializeFromMdIfNeeded(args, { forceHTML: false });
                return success(cli.setRoomTopic(roomId, args, html));
            }
            const room = cli.getRoom(roomId);
            if (!room) {
                return reject(
                    newTranslatableError("Failed to get room topic: Unable to find room (%(roomId)s", { roomId }),
                );
            }

            const content: MRoomTopicEventContent = room.currentState.getStateEvents('m.room.topic', '')?.getContent();
            const topic = !!content
                ? ContentHelpers.parseTopicContent(content)
                : { text: _t('This room has no topic.') };

            const ref = e => e && linkifyElement(e);
            const body = topicToHtml(topic.text, topic.html, ref, true);

            Modal.createDialog(InfoDialog, {
                title: room.name,
                description: <div ref={ref}>{ body }</div>,
                hasCloseButton: true,
                className: "markdown-body",
            });
            return success();
        },
        category: CommandCategories.admin,
        renderingTypes: [TimelineRenderingType.Room],
    }),
    new Command({
        command: 'roomname',
        args: '<name>',
        description: _td('Sets the room name'),
        isEnabled: () => !isCurrentLocalRoom(),
        runFn: function(roomId, args) {
            if (args) {
                return success(MatrixClientPeg.get().setRoomName(roomId, args));
            }
            return reject(this.getUsage());
        },
        category: CommandCategories.admin,
        renderingTypes: [TimelineRenderingType.Room],
    }),
    new Command({
        command: 'invite',
        args: '<user-id> [<reason>]',
        description: _td('Invites user with given id to current room'),
        analyticsName: "Invite",
        isEnabled: () => !isCurrentLocalRoom() && shouldShowComponent(UIComponent.InviteUsers),
        runFn: function(roomId, args) {
            if (args) {
                const [address, reason] = args.split(/\s+(.+)/);
                if (address) {
                    // We use a MultiInviter to re-use the invite logic, even though
                    // we're only inviting one user.
                    // If we need an identity server but don't have one, things
                    // get a bit more complex here, but we try to show something
                    // meaningful.
                    let prom = Promise.resolve();
                    if (
                        getAddressType(address) === AddressType.Email &&
                        !MatrixClientPeg.get().getIdentityServerUrl()
                    ) {
                        const defaultIdentityServerUrl = getDefaultIdentityServerUrl();
                        if (defaultIdentityServerUrl) {
                            const { finished } = Modal.createDialog<[boolean]>(QuestionDialog, {
                                title: _t("Use an identity server"),
                                description: <p>{ _t(
                                    "Use an identity server to invite by email. " +
                                    "Click continue to use the default identity server " +
                                    "(%(defaultIdentityServerName)s) or manage in Settings.",
                                    {
                                        defaultIdentityServerName: abbreviateUrl(defaultIdentityServerUrl),
                                    },
                                ) }</p>,
                                button: _t("Continue"),
                            });

                            prom = finished.then(([useDefault]) => {
                                if (useDefault) {
                                    setToDefaultIdentityServer();
                                    return;
                                }
                                throw newTranslatableError(
                                    "Use an identity server to invite by email. Manage in Settings.",
                                );
                            });
                        } else {
                            return reject(
                                newTranslatableError(
                                    "Use an identity server to invite by email. Manage in Settings.",
                                ),
                            );
                        }
                    }
                    const inviter = new MultiInviter(roomId);
                    return success(prom.then(() => {
                        return inviter.invite([address], reason, true);
                    }).then(() => {
                        if (inviter.getCompletionState(address) !== "invited") {
                            throw new Error(inviter.getErrorText(address));
                        }
                    }));
                }
            }
            return reject(this.getUsage());
        },
        category: CommandCategories.actions,
        renderingTypes: [TimelineRenderingType.Room],
    }),
    new Command({
        command: 'join',
        aliases: ['j', 'goto'],
        args: '<room-address>',
        description: _td('Joins room with given address'),
        runFn: function(roomId, args) {
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
                const params = args.split(' ');
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
                if (params[0][0] === '#') {
                    let roomAlias = params[0];
                    if (!roomAlias.includes(':')) {
                        roomAlias += ':' + MatrixClientPeg.get().getDomain();
                    }

                    dis.dispatch<ViewRoomPayload>({
                        action: Action.ViewRoom,
                        room_alias: roomAlias,
                        auto_join: true,
                        metricsTrigger: "SlashCommand",
                        metricsViaKeyboard: true,
                    });
                    return success();
                } else if (params[0][0] === '!') {
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

                    if (entity[0] === '!') dispatch["room_id"] = entity;
                    else dispatch["room_alias"] = entity;

                    if (eventId) {
                        dispatch["event_id"] = eventId;
                        dispatch["highlighted"] = true;
                    }

                    if (viaServers) {
                        // For the join
                        dispatch["opts"] = {
                            // These are passed down to the js-sdk's /join call
                            viaServers: viaServers,
                        };

                        // For if the join fails (rejoin button)
                        dispatch['via_servers'] = viaServers;
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
        command: 'part',
        args: '[<room-address>]',
        description: _td('Leave room'),
        analyticsName: "Part",
        isEnabled: () => !isCurrentLocalRoom(),
        runFn: function(roomId, args) {
            const cli = MatrixClientPeg.get();

            let targetRoomId;
            if (args) {
                const matches = args.match(/^(\S+)$/);
                if (matches) {
                    let roomAlias = matches[1];
                    if (roomAlias[0] !== '#') return reject(this.getUsage());

                    if (!roomAlias.includes(':')) {
                        roomAlias += ':' + cli.getDomain();
                    }

                    // Try to find a room with this alias
                    const rooms = cli.getRooms();
                    for (let i = 0; i < rooms.length; i++) {
                        const aliasEvents = rooms[i].currentState.getStateEvents('m.room.aliases');
                        for (let j = 0; j < aliasEvents.length; j++) {
                            const aliases = aliasEvents[j].getContent().aliases || [];
                            for (let k = 0; k < aliases.length; k++) {
                                if (aliases[k] === roomAlias) {
                                    targetRoomId = rooms[i].roomId;
                                    break;
                                }
                            }
                            if (targetRoomId) break;
                        }
                        if (targetRoomId) break;
                    }
                    if (!targetRoomId) {
                        return reject(
                            newTranslatableError(
                                'Unrecognised room address: %(roomAlias)s',
                                { roomAlias },
                            ),
                        );
                    }
                }
            }

            if (!targetRoomId) targetRoomId = roomId;
            return success(leaveRoomBehaviour(targetRoomId));
        },
        category: CommandCategories.actions,
        renderingTypes: [TimelineRenderingType.Room],
    }),
    new Command({
        command: 'remove',
        aliases: ["kick"],
        args: '<user-id> [reason]',
        description: _td('Removes user with given id from this room'),
        isEnabled: () => !isCurrentLocalRoom(),
        runFn: function(roomId, args) {
            if (args) {
                const matches = args.match(/^(\S+?)( +(.*))?$/);
                if (matches) {
                    return success(MatrixClientPeg.get().kick(roomId, matches[1], matches[3]));
                }
            }
            return reject(this.getUsage());
        },
        category: CommandCategories.admin,
        renderingTypes: [TimelineRenderingType.Room],
    }),
    new Command({
        command: 'ban',
        args: '<user-id> [reason]',
        description: _td('Bans user with given id'),
        isEnabled: () => !isCurrentLocalRoom(),
        runFn: function(roomId, args) {
            if (args) {
                const matches = args.match(/^(\S+?)( +(.*))?$/);
                if (matches) {
                    return success(MatrixClientPeg.get().ban(roomId, matches[1], matches[3]));
                }
            }
            return reject(this.getUsage());
        },
        category: CommandCategories.admin,
        renderingTypes: [TimelineRenderingType.Room],
    }),
    new Command({
        command: 'unban',
        args: '<user-id>',
        description: _td('Unbans user with given ID'),
        isEnabled: () => !isCurrentLocalRoom(),
        runFn: function(roomId, args) {
            if (args) {
                const matches = args.match(/^(\S+)$/);
                if (matches) {
                    // Reset the user membership to "leave" to unban him
                    return success(MatrixClientPeg.get().unban(roomId, matches[1]));
                }
            }
            return reject(this.getUsage());
        },
        category: CommandCategories.admin,
        renderingTypes: [TimelineRenderingType.Room],
    }),
    new Command({
        command: 'ignore',
        args: '<user-id>',
        description: _td('Ignores a user, hiding their messages from you'),
        runFn: function(roomId, args) {
            if (args) {
                const cli = MatrixClientPeg.get();

                const matches = args.match(/^(@[^:]+:\S+)$/);
                if (matches) {
                    const userId = matches[1];
                    const ignoredUsers = cli.getIgnoredUsers();
                    ignoredUsers.push(userId); // de-duped internally in the js-sdk
                    return success(
                        cli.setIgnoredUsers(ignoredUsers).then(() => {
                            Modal.createDialog(InfoDialog, {
                                title: _t('Ignored user'),
                                description: <div>
                                    <p>{ _t('You are now ignoring %(userId)s', { userId }) }</p>
                                </div>,
                            });
                        }),
                    );
                }
            }
            return reject(this.getUsage());
        },
        category: CommandCategories.actions,
    }),
    new Command({
        command: 'unignore',
        args: '<user-id>',
        description: _td('Stops ignoring a user, showing their messages going forward'),
        runFn: function(roomId, args) {
            if (args) {
                const cli = MatrixClientPeg.get();

                const matches = args.match(/(^@[^:]+:\S+$)/);
                if (matches) {
                    const userId = matches[1];
                    const ignoredUsers = cli.getIgnoredUsers();
                    const index = ignoredUsers.indexOf(userId);
                    if (index !== -1) ignoredUsers.splice(index, 1);
                    return success(
                        cli.setIgnoredUsers(ignoredUsers).then(() => {
                            Modal.createDialog(InfoDialog, {
                                title: _t('Unignored user'),
                                description: <div>
                                    <p>{ _t('You are no longer ignoring %(userId)s', { userId }) }</p>
                                </div>,
                            });
                        }),
                    );
                }
            }
            return reject(this.getUsage());
        },
        category: CommandCategories.actions,
    }),
    new Command({
        command: 'op',
        args: '<user-id> [<power-level>]',
        description: _td('Define the power level of a user'),
        isEnabled(): boolean {
            const cli = MatrixClientPeg.get();
            const room = cli.getRoom(RoomViewStore.instance.getRoomId());
            return room?.currentState.maySendStateEvent(EventType.RoomPowerLevels, cli.getUserId())
                && !isLocalRoom(room);
        },
        runFn: function(roomId, args) {
            if (args) {
                const matches = args.match(/^(\S+?)( +(-?\d+))?$/);
                let powerLevel = 50; // default power level for op
                if (matches) {
                    const userId = matches[1];
                    if (matches.length === 4 && undefined !== matches[3]) {
                        powerLevel = parseInt(matches[3], 10);
                    }
                    if (!isNaN(powerLevel)) {
                        const cli = MatrixClientPeg.get();
                        const room = cli.getRoom(roomId);
                        if (!room) {
                            return reject(
                                newTranslatableError("Command failed: Unable to find room (%(roomId)s", { roomId }),
                            );
                        }
                        const member = room.getMember(userId);
                        if (!member || getEffectiveMembership(member.membership) === EffectiveMembership.Leave) {
                            return reject(newTranslatableError("Could not find user in room"));
                        }
                        const powerLevelEvent = room.currentState.getStateEvents('m.room.power_levels', '');
                        return success(cli.setPowerLevel(roomId, userId, powerLevel, powerLevelEvent));
                    }
                }
            }
            return reject(this.getUsage());
        },
        category: CommandCategories.admin,
        renderingTypes: [TimelineRenderingType.Room],
    }),
    new Command({
        command: 'deop',
        args: '<user-id>',
        description: _td('Deops user with given id'),
        isEnabled(): boolean {
            const cli = MatrixClientPeg.get();
            const room = cli.getRoom(RoomViewStore.instance.getRoomId());
            return room?.currentState.maySendStateEvent(EventType.RoomPowerLevels, cli.getUserId())
                && !isLocalRoom(room);
        },
        runFn: function(roomId, args) {
            if (args) {
                const matches = args.match(/^(\S+)$/);
                if (matches) {
                    const cli = MatrixClientPeg.get();
                    const room = cli.getRoom(roomId);
                    if (!room) {
                        return reject(
                            newTranslatableError("Command failed: Unable to find room (%(roomId)s", { roomId }),
                        );
                    }

                    const powerLevelEvent = room.currentState.getStateEvents('m.room.power_levels', '');
                    if (!powerLevelEvent.getContent().users[args]) {
                        return reject(newTranslatableError("Could not find user in room"));
                    }
                    return success(cli.setPowerLevel(roomId, args, undefined, powerLevelEvent));
                }
            }
            return reject(this.getUsage());
        },
        category: CommandCategories.admin,
        renderingTypes: [TimelineRenderingType.Room],
    }),
    new Command({
        command: 'devtools',
        description: _td('Opens the Developer Tools dialog'),
        runFn: function(roomId) {
            Modal.createDialog(DevtoolsDialog, { roomId }, "mx_DevtoolsDialog_wrapper");
            return success();
        },
        category: CommandCategories.advanced,
    }),
    new Command({
        command: 'addwidget',
        args: '<url | embed code | Jitsi url>',
        description: _td('Adds a custom widget by URL to the room'),
        isEnabled: () => SettingsStore.getValue(UIFeature.Widgets)
            && shouldShowComponent(UIComponent.AddIntegrations)
            && !isCurrentLocalRoom(),
        runFn: function(roomId, widgetUrl) {
            if (!widgetUrl) {
                return reject(newTranslatableError("Please supply a widget URL or embed code"));
            }

            // Try and parse out a widget URL from iframes
            if (widgetUrl.toLowerCase().startsWith("<iframe ")) {
                // We use parse5, which doesn't render/create a DOM node. It instead runs
                // some superfast regex over the text so we don't have to.
                const embed = parseHtml(widgetUrl);
                if (embed && embed.childNodes && embed.childNodes.length === 1) {
                    const iframe = embed.childNodes[0] as ChildElement;
                    if (iframe.tagName.toLowerCase() === 'iframe' && iframe.attrs) {
                        const srcAttr = iframe.attrs.find(a => a.name === 'src');
                        logger.log("Pulling URL out of iframe (embed code)");
                        widgetUrl = srcAttr.value;
                    }
                }
            }

            if (!widgetUrl.startsWith("https://") && !widgetUrl.startsWith("http://")) {
                return reject(newTranslatableError("Please supply a https:// or http:// widget URL"));
            }
            if (WidgetUtils.canUserModifyWidgets(roomId)) {
                const userId = MatrixClientPeg.get().getUserId();
                const nowMs = (new Date()).getTime();
                const widgetId = encodeURIComponent(`${roomId}_${userId}_${nowMs}`);
                let type = WidgetType.CUSTOM;
                let name = "Custom";
                let data = {};

                // Make the widget a Jitsi widget if it looks like a Jitsi widget
                const jitsiData = Jitsi.getInstance().parsePreferredConferenceUrl(widgetUrl);
                if (jitsiData) {
                    logger.log("Making /addwidget widget a Jitsi conference");
                    type = WidgetType.JITSI;
                    name = "Jitsi";
                    data = jitsiData;
                    widgetUrl = WidgetUtils.getLocalJitsiWrapperUrl();
                }

                return success(WidgetUtils.setRoomWidget(roomId, widgetId, type, widgetUrl, name, data));
            } else {
                return reject(newTranslatableError("You cannot modify widgets in this room."));
            }
        },
        category: CommandCategories.admin,
        renderingTypes: [TimelineRenderingType.Room],
    }),
    new Command({
        command: 'verify',
        args: '<user-id> <device-id> <device-signing-key>',
        description: _td('Verifies a user, session, and pubkey tuple'),
        runFn: function(roomId, args) {
            if (args) {
                const matches = args.match(/^(\S+) +(\S+) +(\S+)$/);
                if (matches) {
                    const cli = MatrixClientPeg.get();

                    const userId = matches[1];
                    const deviceId = matches[2];
                    const fingerprint = matches[3];

                    return success((async () => {
                        const device = cli.getStoredDevice(userId, deviceId);
                        if (!device) {
                            throw newTranslatableError(
                                'Unknown (user, session) pair: (%(userId)s, %(deviceId)s)',
                                { userId, deviceId },
                            );
                        }
                        const deviceTrust = await cli.checkDeviceTrust(userId, deviceId);

                        if (deviceTrust.isVerified()) {
                            if (device.getFingerprint() === fingerprint) {
                                throw newTranslatableError('Session already verified!');
                            } else {
                                throw newTranslatableError('WARNING: Session already verified, but keys do NOT MATCH!');
                            }
                        }

                        if (device.getFingerprint() !== fingerprint) {
                            const fprint = device.getFingerprint();
                            throw newTranslatableError(
                                'WARNING: KEY VERIFICATION FAILED! The signing key for %(userId)s and session' +
                                    ' %(deviceId)s is "%(fprint)s" which does not match the provided key ' +
                                    '"%(fingerprint)s". This could mean your communications are being intercepted!',
                                {
                                    fprint,
                                    userId,
                                    deviceId,
                                    fingerprint,
                                },
                            );
                        }

                        await cli.setDeviceVerified(userId, deviceId, true);

                        // Tell the user we verified everything
                        Modal.createDialog(InfoDialog, {
                            title: _t('Verified key'),
                            description: <div>
                                <p>
                                    {
                                        _t('The signing key you provided matches the signing key you received ' +
                                            'from %(userId)s\'s session %(deviceId)s. Session marked as verified.',
                                        { userId, deviceId })
                                    }
                                </p>
                            </div>,
                        });
                    })());
                }
            }
            return reject(this.getUsage());
        },
        category: CommandCategories.advanced,
        renderingTypes: [TimelineRenderingType.Room],
    }),
    new Command({
        command: 'discardsession',
        description: _td('Forces the current outbound group session in an encrypted room to be discarded'),
        isEnabled: () => !isCurrentLocalRoom(),
        runFn: function(roomId) {
            try {
                MatrixClientPeg.get().forceDiscardSession(roomId);
            } catch (e) {
                return reject(e.message);
            }
            return success();
        },
        category: CommandCategories.advanced,
        renderingTypes: [TimelineRenderingType.Room],
    }),
    new Command({
        command: 'remakeolm',
        description: _td('Developer command: Discards the current outbound group session and sets up new Olm sessions'),
        isEnabled: () => {
            return SettingsStore.getValue("developerMode") && !isCurrentLocalRoom();
        },
        runFn: (roomId) => {
            try {
                const room = MatrixClientPeg.get().getRoom(roomId);

                MatrixClientPeg.get().forceDiscardSession(roomId);

                // noinspection JSIgnoredPromiseFromCall
                MatrixClientPeg.get().crypto.ensureOlmSessionsForUsers(room.getMembers().map(m => m.userId), true);
            } catch (e) {
                return reject(e.message);
            }
            return success();
        },
        category: CommandCategories.advanced,
        renderingTypes: [TimelineRenderingType.Room],
    }),
    new Command({
        command: "rainbow",
        description: _td("Sends the given message coloured as a rainbow"),
        args: '<message>',
        runFn: function(roomId, args) {
            if (!args) return reject(this.getUserId());
            return successSync(ContentHelpers.makeHtmlMessage(args, textToHtmlRainbow(args)));
        },
        category: CommandCategories.messages,
    }),
    new Command({
        command: "rainbowme",
        description: _td("Sends the given emote coloured as a rainbow"),
        args: '<message>',
        runFn: function(roomId, args) {
            if (!args) return reject(this.getUserId());
            return successSync(ContentHelpers.makeHtmlEmote(args, textToHtmlRainbow(args)));
        },
        category: CommandCategories.messages,
    }),
    new Command({
        command: "help",
        description: _td("Displays list of commands with usages and descriptions"),
        runFn: function() {
            Modal.createDialog(SlashCommandHelpDialog);
            return success();
        },
        category: CommandCategories.advanced,
    }),
    new Command({
        command: "whois",
        description: _td("Displays information about a user"),
        args: "<user-id>",
        isEnabled: () => !isCurrentLocalRoom(),
        runFn: function(roomId, userId) {
            if (!userId || !userId.startsWith("@") || !userId.includes(":")) {
                return reject(this.getUsage());
            }

            const member = MatrixClientPeg.get().getRoom(roomId).getMember(userId);
            dis.dispatch<ViewUserPayload>({
                action: Action.ViewUser,
                // XXX: We should be using a real member object and not assuming what the receiver wants.
                member: member || { userId } as User,
            });
            return success();
        },
        category: CommandCategories.advanced,
    }),
    new Command({
        command: "rageshake",
        aliases: ["bugreport"],
        description: _td("Send a bug report with logs"),
        isEnabled: () => !!SdkConfig.get().bug_report_endpoint_url,
        args: "<description>",
        runFn: function(roomId, args) {
            return success(
                Modal.createDialog(BugReportDialog, {
                    initialText: args,
                }).finished,
            );
        },
        category: CommandCategories.advanced,
    }),
    new Command({
        command: "tovirtual",
        description: _td("Switches to this room's virtual room, if it has one"),
        category: CommandCategories.advanced,
        isEnabled(): boolean {
            return CallHandler.instance.getSupportsVirtualRooms() && !isCurrentLocalRoom();
        },
        runFn: (roomId) => {
            return success((async () => {
                const room = await VoipUserMapper.sharedInstance().getVirtualRoomForRoom(roomId);
                if (!room) throw newTranslatableError("No virtual room for this room");
                dis.dispatch<ViewRoomPayload>({
                    action: Action.ViewRoom,
                    room_id: room.roomId,
                    metricsTrigger: "SlashCommand",
                    metricsViaKeyboard: true,
                });
            })());
        },
    }),
    new Command({
        command: "query",
        description: _td("Opens chat with the given user"),
        args: "<user-id>",
        runFn: function(roomId, userId) {
            // easter-egg for now: look up phone numbers through the thirdparty API
            // (very dumb phone number detection...)
            const isPhoneNumber = userId && /^\+?[0123456789]+$/.test(userId);
            if (!userId || (!userId.startsWith("@") || !userId.includes(":")) && !isPhoneNumber) {
                return reject(this.getUsage());
            }

            return success((async () => {
                if (isPhoneNumber) {
                    const results = await CallHandler.instance.pstnLookup(this.state.value);
                    if (!results || results.length === 0 || !results[0].userid) {
                        throw newTranslatableError("Unable to find Matrix ID for phone number");
                    }
                    userId = results[0].userid;
                }

                const roomId = await ensureDMExists(MatrixClientPeg.get(), userId);

                dis.dispatch<ViewRoomPayload>({
                    action: Action.ViewRoom,
                    room_id: roomId,
                    metricsTrigger: "SlashCommand",
                    metricsViaKeyboard: true,
                });
            })());
        },
        category: CommandCategories.actions,
    }),
    new Command({
        command: "msg",
        description: _td("Sends a message to the given user"),
        args: "<user-id> [<message>]",
        runFn: function(roomId, args) {
            if (args) {
                // matches the first whitespace delimited group and then the rest of the string
                const matches = args.match(/^(\S+?)(?: +(.*))?$/s);
                if (matches) {
                    const [userId, msg] = matches.slice(1);
                    if (userId && userId.startsWith("@") && userId.includes(":")) {
                        return success((async () => {
                            const cli = MatrixClientPeg.get();
                            const roomId = await ensureDMExists(cli, userId);
                            dis.dispatch<ViewRoomPayload>({
                                action: Action.ViewRoom,
                                room_id: roomId,
                                metricsTrigger: "SlashCommand",
                                metricsViaKeyboard: true,
                            });
                            if (msg) {
                                cli.sendTextMessage(roomId, msg);
                            }
                        })());
                    }
                }
            }

            return reject(this.getUsage());
        },
        category: CommandCategories.actions,
    }),
    new Command({
        command: "holdcall",
        description: _td("Places the call in the current room on hold"),
        category: CommandCategories.other,
        isEnabled: () => !isCurrentLocalRoom(),
        runFn: function(roomId, args) {
            const call = CallHandler.instance.getCallForRoom(roomId);
            if (!call) {
                return reject(newTranslatableError("No active call in this room"));
            }
            call.setRemoteOnHold(true);
            return success();
        },
        renderingTypes: [TimelineRenderingType.Room],
    }),
    new Command({
        command: "unholdcall",
        description: _td("Takes the call in the current room off hold"),
        category: CommandCategories.other,
        isEnabled: () => !isCurrentLocalRoom(),
        runFn: function(roomId, args) {
            const call = CallHandler.instance.getCallForRoom(roomId);
            if (!call) {
                return reject(newTranslatableError("No active call in this room"));
            }
            call.setRemoteOnHold(false);
            return success();
        },
        renderingTypes: [TimelineRenderingType.Room],
    }),
    new Command({
        command: "converttodm",
        description: _td("Converts the room to a DM"),
        category: CommandCategories.other,
        isEnabled: () => !isCurrentLocalRoom(),
        runFn: function(roomId, args) {
            const room = MatrixClientPeg.get().getRoom(roomId);
            return success(guessAndSetDMRoom(room, true));
        },
        renderingTypes: [TimelineRenderingType.Room],
    }),
    new Command({
        command: "converttoroom",
        description: _td("Converts the DM to a room"),
        category: CommandCategories.other,
        isEnabled: () => !isCurrentLocalRoom(),
        runFn: function(roomId, args) {
            const room = MatrixClientPeg.get().getRoom(roomId);
            return success(guessAndSetDMRoom(room, false));
        },
        renderingTypes: [TimelineRenderingType.Room],
    }),

    // Command definitions for autocompletion ONLY:
    // /me is special because its not handled by SlashCommands.js and is instead done inside the Composer classes
    new Command({
        command: "me",
        args: '<message>',
        description: _td('Displays action'),
        category: CommandCategories.messages,
        hideCompletionAfterSpace: true,
    }),

    ...CHAT_EFFECTS.map((effect) => {
        return new Command({
            command: effect.command,
            description: effect.description(),
            args: '<message>',
            runFn: function(roomId, args) {
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
Commands.forEach(cmd => {
    CommandMap.set(cmd.command, cmd);
    cmd.aliases.forEach(alias => {
        CommandMap.set(alias, cmd);
    });
});

export function parseCommandString(input: string): { cmd?: string, args?: string } {
    // trim any trailing whitespace, as it can confuse the parser for
    // IRC-style commands
    input = input.replace(/\s+$/, '');
    if (input[0] !== '/') return {}; // not a command

    const bits = input.match(/^(\S+?)(?:[ \n]+((.|\n)*))?$/);
    let cmd: string;
    let args: string;
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

    if (CommandMap.has(cmd) && CommandMap.get(cmd).isEnabled()) {
        return {
            cmd: CommandMap.get(cmd),
            args,
        };
    }
    return {};
}
