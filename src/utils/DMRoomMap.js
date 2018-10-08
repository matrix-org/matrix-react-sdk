/*
Copyright 2016 OpenMarket Ltd

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

import MatrixClientPeg from '../MatrixClientPeg';
import _uniq from 'lodash/uniq';

/**
 * Class that takes a Matrix Client and flips the m.direct map
 * so the operation of mapping a room ID to which user it's a DM
 * with can be performed efficiently.
 *
 * With 'start', this can also keep itself up to date over time.
 */
export default class DMRoomMap {
    constructor(matrixClient) {
        this.matrixClient = matrixClient;
        this.roomToUser = null;
        // see _onAccountData
        this._hasSentOutPatchDirectAccountDataPatch = false;

        // XXX: Force-bind the event handler method because it
        // doesn't call it with our object as the 'this'
        // (use a static property arrow function for this when we can)
        this._onAccountData = this._onAccountData.bind(this);

        const mDirectEvent = matrixClient.getAccountData('m.direct');
        this.mDirectEvent = mDirectEvent ? mDirectEvent.getContent() : {};
        this.userToRooms = null;
    }

    /**
     * Makes and returns a new shared instance that can then be accessed
     * with shared(). This returned instance is not automatically started.
     */
    static makeShared() {
        DMRoomMap._sharedInstance = new DMRoomMap(MatrixClientPeg.get());
        return DMRoomMap._sharedInstance;
    }

    /**
     * Returns a shared instance of the class
     * that uses the singleton matrix client
     * The shared instance must be started before use.
     */
    static shared() {
        return DMRoomMap._sharedInstance;
    }

    start() {
        this._populateRoomToUser();
        this.matrixClient.on("accountData", this._onAccountData);
    }

    stop() {
        this.matrixClient.removeListener("accountData", this._onAccountData);
    }

    _onAccountData(ev) {
        if (ev.getType() == 'm.direct') {
            this.mDirectEvent = this.matrixClient.getAccountData('m.direct').getContent() || {};
            this.userToRooms = null;
            this.roomToUser = null;
        }
    }
    /**
     * some client bug somewhere is causing some DMs to be marked
     * with ourself, not the other user. Fix it by guessing the other user and
     * modifying userToRooms
     */
    _patchUpSelfDMs(userToRooms) {
        const myUserId = this.matrixClient.getUserId();
        const selfRoomIds = userToRooms[myUserId];
        if (selfRoomIds) {
            // any self-chats that should not be self-chats?
            const guessedUserIdsThatChanged = selfRoomIds.map((roomId) => {
                const room = this.matrixClient.getRoom(roomId);
                if (room) {
                    const userId = room.guessDMUserId();
                    if (userId && userId !== myUserId) {
                        return {userId, roomId};
                    }
                }
            }).filter((ids) => !!ids);  //filter out
            // these are actually all legit self-chats
            // bail out
            if (!guessedUserIdsThatChanged.length) {
                return false;
            }
            userToRooms[myUserId] = selfRoomIds.filter((roomId) => {
                return !guessedUserIdsThatChanged
                    .some((ids) => ids.roomId === roomId);
            });
            guessedUserIdsThatChanged.forEach(({userId, roomId}) => {
                let roomIds = userToRooms[userId];
                if (!roomIds) {
                    userToRooms[userId] = [roomId];
                } else {
                    roomIds.push(roomId);
                    userToRooms[userId] = _uniq(roomIds);
                }
            });
            return true;
        }
    }

    getDMRoomsForUserId(userId) {
        // Here, we return the empty list if there are no rooms,
        // since the number of conversations you have with this user is zero.
        return this._getUserToRooms()[userId] || [];
    }

    getUserIdForRoomId(roomId) {
        if (this.roomToUser == null) {
            // we lazily populate roomToUser so you can use
            // this class just to call getDMRoomsForUserId
            // which doesn't do very much, but is a fairly
            // convenient wrapper and there's no point
            // iterating through the map if getUserIdForRoomId()
            // is never called.
            this._populateRoomToUser();
        }
        // Here, we return undefined if the room is not in the map:
        // the room ID you gave is not a DM room for any user.
        if (this.roomToUser[roomId] === undefined) {
            // no entry? if the room is an invite, look for the is_direct hint.
            const room = this.matrixClient.getRoom(roomId);
            if (room) {
                return room.getDMInviter();
            }
        }
        return this.roomToUser[roomId];
    }

    _getUserToRooms() {
        if (!this.userToRooms) {
            const userToRooms = this.mDirectEvent;
            const myUserId = this.matrixClient.getUserId();
            const selfDMs = userToRooms[myUserId];
            if (selfDMs && selfDMs.length) {
                const neededPatching = this._patchUpSelfDMs(userToRooms);
                // to avoid multiple devices fighting to correct
                // the account data, only try to send the corrected
                // version once.
                console.warn(`Invalid m.direct account data detected ` +
                    `(self-chats that shouldn't be), patching it up.`);
                if (neededPatching && !this._hasSentOutPatchDirectAccountDataPatch) {
                    this._hasSentOutPatchDirectAccountDataPatch = true;
                    this.matrixClient.setAccountData('m.direct', userToRooms);
                }
            }
            this.userToRooms = userToRooms;
        }
        return this.userToRooms;
    }

    _populateRoomToUser() {
        this.roomToUser = {};
        for (const user of Object.keys(this._getUserToRooms())) {
            for (const roomId of this.userToRooms[user]) {
                this.roomToUser[roomId] = user;
            }
        }
    }
}
