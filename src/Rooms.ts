/*
Copyright 2015 - 2021 The Matrix.org Foundation C.I.C.

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
import { EventType } from "matrix-js-sdk/src/@types/event";

import { MatrixClientPeg } from './MatrixClientPeg';
import AliasCustomisations from './customisations/Alias';

/**
 * Given a room object, return the alias we should use for it,
 * if any. This could be the canonical alias if one exists, otherwise
 * an alias selected arbitrarily but deterministically from the list
 * of aliases. Otherwise return null;
 *
 * @param {Object} room The room object
 * @returns {string} A display alias for the given room
 */
export function getDisplayAliasForRoom(room: Room): string {
    return getDisplayAliasForAliasSet(
        room.getCanonicalAlias(), room.getAltAliases(),
    );
}

// The various display alias getters should all feed through this one path so
// there's a single place to change the logic.
export function getDisplayAliasForAliasSet(canonicalAlias: string, altAliases: string[]): string {
    if (AliasCustomisations.getDisplayAliasForAliasSet) {
        return AliasCustomisations.getDisplayAliasForAliasSet(canonicalAlias, altAliases);
    }
    return canonicalAlias || altAliases?.[0];
}

export function guessAndSetDMRoom(room: Room, isDirect: boolean): Promise<void> {
    let newTarget;
    if (isDirect) {
        const guessedUserId = guessDMRoomTargetId(
            room, MatrixClientPeg.get().getUserId(),
        );
        newTarget = guessedUserId;
    } else {
        newTarget = null;
    }

    return setDMRoom(room.roomId, newTarget);
}

/**
 * Marks or unmarks the given room as being as a DM room.
 * @param {string} roomId The ID of the room to modify
 * @param {string} userId The user ID of the desired DM
 room target user or null to un-mark
 this room as a DM room
 * @returns {object} A promise
 */
export async function setDMRoom(roomId: string, userId: string): Promise<void> {
    if (MatrixClientPeg.get().isGuest()) return;

    const mDirectEvent = MatrixClientPeg.get().getAccountData(EventType.Direct);
    let dmRoomMap = {};

    if (mDirectEvent !== undefined) dmRoomMap = { ...mDirectEvent.getContent() }; // copy as we will mutate

    // remove it from the lists of any others users
    // (it can only be a DM room for one person)
    for (const thisUserId of Object.keys(dmRoomMap)) {
        const roomList = dmRoomMap[thisUserId];

        if (thisUserId != userId) {
            const indexOfRoom = roomList.indexOf(roomId);
            if (indexOfRoom > -1) {
                roomList.splice(indexOfRoom, 1);
            }
        }
    }

    // now add it, if it's not already there
    if (userId) {
        const roomList = dmRoomMap[userId] || [];
        if (roomList.indexOf(roomId) == -1) {
            roomList.push(roomId);
        }
        dmRoomMap[userId] = roomList;
    }

    await MatrixClientPeg.get().setAccountData(EventType.Direct, dmRoomMap);
}

/**
 * Given a room, estimate which of its members is likely to
 * be the target if the room were a DM room and return that user.
 *
 * @param {Object} room Target room
 * @param {string} myUserId User ID of the current user
 * @returns {string} User ID of the user that the room is probably a DM with
 */
function guessDMRoomTargetId(room: Room, myUserId: string): string {
    let oldestTs;
    let oldestUser;

    // Pick the joined user who's been here longest (and isn't us),
    for (const user of room.getJoinedMembers()) {
        if (user.userId == myUserId) continue;

        if (oldestTs === undefined || (user.events.member && user.events.member.getTs() < oldestTs)) {
            oldestUser = user;
            oldestTs = user.events.member.getTs();
        }
    }
    if (oldestUser) return oldestUser.userId;

    // if there are no joined members other than us, use the oldest member
    for (const user of room.currentState.getMembers()) {
        if (user.userId == myUserId) continue;

        if (oldestTs === undefined || (user.events.member && user.events.member.getTs() < oldestTs)) {
            oldestUser = user;
            oldestTs = user.events.member.getTs();
        }
    }

    if (oldestUser === undefined) return myUserId;
    return oldestUser.userId;
}
