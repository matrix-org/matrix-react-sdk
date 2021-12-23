/*
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

import { Room } from "matrix-js-sdk/src/models/room";
import { sleep } from "matrix-js-sdk/src/utils";
import { EventStatus } from "matrix-js-sdk/src/models/event";
import React from "react";

import { MatrixClientPeg } from "../MatrixClientPeg";
import { _t } from "../languageHandler";
import Modal, { IHandle } from "../Modal";
import ErrorDialog from "../components/views/dialogs/ErrorDialog";
import dis from "../dispatcher/dispatcher";
import RoomViewStore from "../stores/RoomViewStore";
import Spinner from "../components/views/elements/Spinner";
import { isMetaSpace } from "../stores/spaces";
import SpaceStore from "../stores/spaces/SpaceStore";
import { Action } from "../dispatcher/actions";

/**
 * Approximation of a membership status for a given room.
 */
export enum EffectiveMembership {
    /**
     * The user is effectively joined to the room. For example, actually joined
     * or knocking on the room (when that becomes possible).
     */
    Join = "JOIN",

    /**
     * The user is effectively invited to the room. Currently this is a direct map
     * to the invite membership as no other membership states are effectively
     * invites.
     */
    Invite = "INVITE",

    /**
     * The user is effectively no longer in the room. For example, kicked,
     * banned, or voluntarily left.
     */
    Leave = "LEAVE",
}

export interface MembershipSplit {
    // @ts-ignore - TS wants this to be a string key, but we know better.
    [state: EffectiveMembership]: Room[];
}

export function splitRoomsByMembership(rooms: Room[]): MembershipSplit {
    const split: MembershipSplit = {
        [EffectiveMembership.Invite]: [],
        [EffectiveMembership.Join]: [],
        [EffectiveMembership.Leave]: [],
    };

    for (const room of rooms) {
        split[getEffectiveMembership(room.getMyMembership())].push(room);
    }

    return split;
}

export function getEffectiveMembership(membership: string): EffectiveMembership {
    if (membership === 'invite') {
        return EffectiveMembership.Invite;
    } else if (membership === 'join') {
        // TODO: Include knocks? Update docs as needed in the enum. https://github.com/vector-im/element-web/issues/14237
        return EffectiveMembership.Join;
    } else {
        // Probably a leave, kick, or ban
        return EffectiveMembership.Leave;
    }
}

export function isJoinedOrNearlyJoined(membership: string): boolean {
    const effective = getEffectiveMembership(membership);
    return effective === EffectiveMembership.Join || effective === EffectiveMembership.Invite;
}

export async function leaveRoomBehaviour(roomId: string, retry = true, spinner = true) {
    let spinnerModal: IHandle<any>;
    if (spinner) {
        spinnerModal = Modal.createDialog(Spinner, null, 'mx_Dialog_spinner');
    }

    const cli = MatrixClientPeg.get();
    let leavingAllVersions = true;
    const history = cli.getRoomUpgradeHistory(roomId);
    if (history && history.length > 0) {
        const currentRoom = history[history.length - 1];
        if (currentRoom.roomId !== roomId) {
            // The user is trying to leave an older version of the room. Let them through
            // without making them leave the current version of the room.
            leavingAllVersions = false;
        }
    }

    const room = cli.getRoom(roomId);
    // await any queued messages being sent so that they do not fail
    await Promise.all(room.getPendingEvents().filter(ev => {
        return [EventStatus.QUEUED, EventStatus.ENCRYPTING, EventStatus.SENDING].includes(ev.status);
    }).map(ev => new Promise<void>((resolve, reject) => {
        const handler = () => {
            if (ev.status === EventStatus.NOT_SENT) {
                spinnerModal?.close();
                reject(ev.error);
            }

            if (!ev.status || ev.status === EventStatus.SENT) {
                ev.off("Event.status", handler);
                resolve();
            }
        };

        ev.on("Event.status", handler);
    })));

    let results: { [roomId: string]: Error & { errcode?: string, message: string, data?: Record<string, any> } } = {};
    if (!leavingAllVersions) {
        try {
            await cli.leave(roomId);
        } catch (e) {
            if (e?.data?.errcode) {
                const message = e.data.error || _t("Unexpected server error trying to leave the room");
                results[roomId] = Object.assign(new Error(message), { errcode: e.data.errcode, data: e.data });
            } else {
                results[roomId] = e || new Error("Failed to leave room for unknown causes");
            }
        }
    } else {
        results = await cli.leaveRoomChain(roomId, retry);
    }

    if (retry) {
        const limitExceededError = Object.values(results).find(e => e?.errcode === "M_LIMIT_EXCEEDED");
        if (limitExceededError) {
            await sleep(limitExceededError.data.retry_after_ms ?? 100);
            return leaveRoomBehaviour(roomId, false, false);
        }
    }

    spinnerModal?.close();

    const errors = Object.entries(results).filter(r => !!r[1]);
    if (errors.length > 0) {
        const messages = [];
        for (const roomErr of errors) {
            const err = roomErr[1]; // [0] is the roomId
            let message = _t("Unexpected server error trying to leave the room");
            if (err.errcode && err.message) {
                if (err.errcode === 'M_CANNOT_LEAVE_SERVER_NOTICE_ROOM') {
                    Modal.createTrackedDialog('Error Leaving Room', '', ErrorDialog, {
                        title: _t("Can't leave Server Notices room"),
                        description: _t(
                            "This room is used for important messages from the Homeserver, " +
                            "so you cannot leave it.",
                        ),
                    });
                    return;
                }
                message = results[roomId].message;
            }
            messages.push(message, React.createElement('BR')); // createElement to avoid using a tsx file in utils
        }
        Modal.createTrackedDialog('Error Leaving Room', '', ErrorDialog, {
            title: _t("Error leaving room"),
            description: messages,
        });
        return;
    }

    if (SpaceStore.spacesEnabled &&
        !isMetaSpace(SpaceStore.instance.activeSpace) &&
        SpaceStore.instance.activeSpace !== roomId &&
        RoomViewStore.getRoomId() === roomId
    ) {
        dis.dispatch({
            action: Action.ViewRoom,
            room_id: SpaceStore.instance.activeSpace,
        });
    } else {
        dis.dispatch({ action: 'view_home_page' });
    }
}
