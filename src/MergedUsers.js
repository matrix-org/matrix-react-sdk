/*
Copyright 2018 New Vector Ltd

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

const MatrixClientPeg = require("./MatrixClientPeg");
const dis = require("./dispatcher");

class MergedUsers {

    // We track which localparts we see and their associated parents.
    _localpartCache = {}; // [localpart] => {parentUserId, childrenUserIds}

    _getLocalpart(userId) {
        return userId.substring(1).split(":")[0];
    }

    async trackUser(userId) {
        const localpart = this._getLocalpart(userId);
        if (this._localpartCache[localpart]) {
            // We already have a parent, so just append a child if we need to
            const children = this._localpartCache[localpart].childrenUserIds;
            const parent = this._localpartCache[localpart].parentUserId;
            if (userId !== parent && !children.includes(userId)) {
                console.log("Adding " + userId + " as a child for " + parent);
                children.push(userId);
                dis.dispatch({action: "merged_user_updated", parentUserId: parent, children: children});
            }
            return;
        }

        const state = await this._getLinkedState(userId);
        if (!state || !state["parent"]) return; // Nothing to do: the user is the parent

        console.log("Tracking " + state["parent"] + " as the parent for " + userId);
        const children = state["parent"] === userId ? [] : [userId];
        this._localpartCache[localpart] = {
            parentUserId: state["parent"],
            childrenUserIds: children,
        };
        dis.dispatch({action: "merged_user_updated", parentUserId: parent, children: children});
    }

    isChild(userId) {
        // We can do this async as it doesn't matter all that much
        this.trackUser(userId);

        const localpart = this._getLocalpart(userId);
        const cached = this._localpartCache[localpart];
        if (cached) return cached.parentUserId !== userId;
        else return false;
    }

    isParent(userId) {
        return !this.isChild(userId);
    }

    getChildren(userId) {
        if (!this.isParent(userId)) return [];
        return this._localpartCache[this._getLocalpart(userId)].childrenUserIds;
    }

    async getProfile(userId, roomId) {
        const client = MatrixClientPeg.get();
        if (!client) return null; // We're just not ready

        // Wait for the tracking to complete because we actually want this to be
        // accurate.
        await this.trackUser(userId);

        const localpart = this._getLocalpart(userId);
        const cached = this._localpartCache[localpart];
        const parentUserId = cached ? cached.parentUserId : userId;

        // First try to get the user's membership event in the desired room
        if (roomId) {
            try {
                const room = client.getRoom(roomId);
                if (room) {
                    const membership = room.currentState.getStateEvents("m.room.member", parentUserId);
                    if (membership && membership.getContent()) {
                        return membership.getContent();
                    }
                }
            } catch (e) {
                console.error("Non-fatal error getting per-room profile for " + parentUserId);
                console.error(e);
            }
        }

        // Otherwise try to get the user's global profile and use that
        return client.getProfileInfo(parentUserId);
    }

    async _getLinkedState(userId) {
        const client = MatrixClientPeg.get();
        if (!client) return null; // We're just not ready

        // Resolve the profile alias to a room ID
        // We use the connected client's homeserver as it has the best chance of
        // being resolved to a room ID during a network problem.
        const localDomain = MatrixClientPeg.getHomeServerName();
        const localpart = this._getLocalpart(userId);
        const roomAlias = `#_profile_${localpart}:${localDomain}`;
        const roomId = await client.getRoomIdForAlias(roomAlias);

        // First try to peek into the user's profile room
        // We peek using initialSync directly to avoid interfering with the client's
        // currently peeked room (if any).
        try {
            const response = await client.roomInitialSync(roomId, 1);
            console.log(response.state);
        } catch (e) {
            console.error("Non-fatal error peeking into profile room for " + userId);
            console.error(e);
        }

        // If we made it here, then the room is probably not peekable. We'll try
        // to join instead.
        const realRoom = await client.joinRoom(roomAlias);

        // Now we just grab the state event we want and return that
        return client.getStateEvent(realRoom.roomId, "m.linked_accounts");
    }
}

const instance = new MergedUsers();
module.exports = instance;

// For debugging
global.mxMergedUsers = instance;
