/*
Copyright 2016 - 2021 The Matrix.org Foundation C.I.C.

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

import React from "react";
import { Room } from "matrix-js-sdk/src/models/room";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { User } from "matrix-js-sdk/src/models/user";

import { MatrixClientPeg } from './MatrixClientPeg';
import MultiInviter, { CompletionStates } from './utils/MultiInviter';
import Modal from './Modal';
import { _t } from './languageHandler';
import InviteDialog, { KIND_DM, KIND_INVITE, Member } from "./components/views/dialogs/InviteDialog";
import CommunityPrototypeInviteDialog from "./components/views/dialogs/CommunityPrototypeInviteDialog";
import { CommunityPrototypeStore } from "./stores/CommunityPrototypeStore";
import BaseAvatar from "./components/views/avatars/BaseAvatar";
import { mediaFromMxc } from "./customisations/Media";
import ErrorDialog from "./components/views/dialogs/ErrorDialog";

export interface IInviteResult {
    states: CompletionStates;
    inviter: MultiInviter;
}

/**
 * Invites multiple addresses to a room
 * Simpler interface to utils/MultiInviter but with
 * no option to cancel.
 *
 * @param {string} roomId The ID of the room to invite to
 * @param {string[]} addresses Array of strings of addresses to invite. May be matrix IDs or 3pids.
 * @returns {Promise} Promise
 */
export function inviteMultipleToRoom(roomId: string, addresses: string[]): Promise<IInviteResult> {
    const inviter = new MultiInviter(roomId);
    return inviter.invite(addresses).then(states => Promise.resolve({ states, inviter }));
}

export function showStartChatInviteDialog(initialText = ""): void {
    // This dialog handles the room creation internally - we don't need to worry about it.
    Modal.createTrackedDialog(
        'Start DM', '', InviteDialog, { kind: KIND_DM, initialText },
        /*className=*/null, /*isPriority=*/false, /*isStatic=*/true,
    );
}

export function showRoomInviteDialog(roomId: string, initialText = ""): void {
    // This dialog handles the room creation internally - we don't need to worry about it.
    Modal.createTrackedDialog(
        "Invite Users", "", InviteDialog, {
            kind: KIND_INVITE,
            initialText,
            roomId,
        },
        /*className=*/null, /*isPriority=*/false, /*isStatic=*/true,
    );
}

export function showCommunityRoomInviteDialog(roomId: string, communityName: string): void {
    Modal.createTrackedDialog(
        'Invite Users to Community', '', CommunityPrototypeInviteDialog, { communityName, roomId },
        /*className=*/null, /*isPriority=*/false, /*isStatic=*/true,
    );
}

export function showCommunityInviteDialog(communityId: string): void {
    const chat = CommunityPrototypeStore.instance.getGeneralChat(communityId);
    if (chat) {
        const name = CommunityPrototypeStore.instance.getCommunityName(communityId);
        showCommunityRoomInviteDialog(chat.roomId, name);
    } else {
        throw new Error("Failed to locate appropriate room to start an invite in");
    }
}

/**
 * Checks if the given MatrixEvent is a valid 3rd party user invite.
 * @param {MatrixEvent} event The event to check
 * @returns {boolean} True if valid, false otherwise
 */
export function isValid3pidInvite(event: MatrixEvent): boolean {
    if (!event || event.getType() !== "m.room.third_party_invite") return false;

    // any events without these keys are not valid 3pid invites, so we ignore them
    const requiredKeys = ['key_validity_url', 'public_key', 'display_name'];
    for (let i = 0; i < requiredKeys.length; ++i) {
        if (!event.getContent()[requiredKeys[i]]) return false;
    }

    // Valid enough by our standards
    return true;
}

export function inviteUsersToRoom(roomId: string, userIds: string[]): Promise<void> {
    return inviteMultipleToRoom(roomId, userIds).then((result) => {
        const room = MatrixClientPeg.get().getRoom(roomId);
        showAnyInviteErrors(result.states, room, result.inviter);
    }).catch((err) => {
        console.error(err.stack);
        Modal.createTrackedDialog('Failed to invite', '', ErrorDialog, {
            title: _t("Failed to invite"),
            description: ((err && err.message) ? err.message : _t("Operation failed")),
        });
    });
}

export function showAnyInviteErrors(
    states: CompletionStates,
    room: Room,
    inviter: MultiInviter,
    userMap?: Map<string, Member>,
): boolean {
    // Show user any errors
    const failedUsers = Object.keys(states).filter(a => states[a] === 'error');
    if (failedUsers.length === 1 && inviter.fatal) {
        // Just get the first message because there was a fatal problem on the first
        // user. This usually means that no other users were attempted, making it
        // pointless for us to list who failed exactly.
        Modal.createTrackedDialog('Failed to invite users to the room', '', ErrorDialog, {
            title: _t("Failed to invite users to the room:", { roomName: room.name }),
            description: inviter.getErrorText(failedUsers[0]),
        });
        return false;
    } else {
        const errorList = [];
        for (const addr of failedUsers) {
            if (states[addr] === "error") {
                const reason = inviter.getErrorText(addr);
                errorList.push(addr + ": " + reason);
            }
        }

        const cli = MatrixClientPeg.get();
        if (errorList.length > 0) {
            // React 16 doesn't let us use `errorList.join(<br />)` anymore, so this is our solution
            const description = <div className="mx_InviteDialog_multiInviterError">
                <h4>{ _t("We sent the others, but the below people couldn't be invited to <RoomName/>", {}, {
                    RoomName: () => <b>{ room.name }</b>,
                }) }</h4>
                <div>
                    { failedUsers.map(addr => {
                        const user = userMap?.get(addr) || cli.getUser(addr);
                        const name = (user as Member).name || (user as User).rawDisplayName;
                        const avatarUrl = (user as Member).getMxcAvatarUrl?.() || (user as User).avatarUrl;
                        return <div key={addr} className="mx_InviteDialog_multiInviterError_entry">
                            <div className="mx_InviteDialog_multiInviterError_entry_userProfile">
                                <BaseAvatar
                                    url={avatarUrl ? mediaFromMxc(avatarUrl).getSquareThumbnailHttp(24) : null}
                                    name={name}
                                    idName={user.userId}
                                    width={24}
                                    height={24}
                                />
                                <span className="mx_InviteDialog_multiInviterError_entry_name">{ name }</span>
                                <span className="mx_InviteDialog_multiInviterError_entry_userId">{ user.userId }</span>
                            </div>
                            <div className="mx_InviteDialog_multiInviterError_entry_error">
                                { inviter.getErrorText(addr) }
                            </div>
                        </div>;
                    }) }
                </div>
            </div>;

            Modal.createTrackedDialog("Some invites could not be sent", "", ErrorDialog, {
                title: _t("Some invites couldn't be sent"),
                description,
            });
            return false;
        }
    }

    return true;
}
