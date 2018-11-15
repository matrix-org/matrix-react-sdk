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

import SettingsStore from "./settings/SettingsStore";

const MatrixClientPeg = require("./MatrixClientPeg");
const dis = require("./dispatcher");

class MergedUsers {

    // We track which localparts we see and their associated parents.
    _localpartCache = {}; // [localpart] => {parentUserId, childrenUserIds}
    _noProfileCache = []; // list of localparts without profiles
    _profileCache = {}; // [user] => {global: profile, rooms: [roomId] => profile}

    _getLocalpart(userId) {
        return userId.substring(1).split(":")[0];
    }

    async trackUser(userId) {
        if (!SettingsStore.getValue("mergeUsersByLocalpart")) return;

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

        if (this._noProfileCache.includes(localpart)) {
            return; // skip the lookup because it already failed at least once.
        }

        try {
            const state = await this._getLinkedState(userId);
            if (!state || !state["parent"]) {
                if (!this._noProfileCache.includes(localpart)) this._noProfileCache.push(localpart);
                return; // Nothing to do: the user is the parent
            }

            console.log("Tracking " + state["parent"] + " as the parent for " + userId);
            const children = state["parent"] === userId ? [] : [userId];
            this._localpartCache[localpart] = {
                parentUserId: state["parent"],
                childrenUserIds: children,
            };
            dis.dispatch({action: "merged_user_updated", parentUserId: parent, children: children});
        } catch (e) {
            console.error("Non-fatal error getting linked accounts for " + userId);
            console.error(e);
            if (!this._noProfileCache.includes(localpart)) this._noProfileCache.push(localpart);
        }
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

    isChildOf(userId, parentIds) {
        return parentIds.map(i => this._getLocalpart(i)).includes(this._getLocalpart(userId));
    }

    /**
     * Determines the users that should be considered the parent in a
     * given set of objects. This is useful for cases like the member
     * list where the parent user may not be a member however a child
     * account is. This will return the first child account found if
     * there is no parent in the list.
     * @param {[[string,object]]} tuples An array of [userId, object]
     * where the object can be anything you like. The userId (index 0)
     * will be used to determine which object to consider the parent.
     * @return {[object]} The objects from the tuples for which the
     * accompanying user is considered a parent.
     */
    getEffectiveParents(tuples) {
        const parentIds = [];
        const parentObjects = [];

        // First pass: identify parents
        for (const tuple of tuples) {
            const userId = tuple[0];
            const obj = tuple[1];

            if (this.isParent(userId)) {
                parentIds.push(userId);
                parentObjects.push(obj);
            }
        }

        // Second pass: find all the children we missed
        for (const tuple of tuples) {
            const userId = tuple[0];
            const obj = tuple[1];

            if (this.isChildOf(userId, parentIds)) continue;

            parentIds.push(userId);
            parentObjects.push(obj);
        }

        // Return just the objects
        return parentObjects;
    }

    getChildren(userId) {
        if (!this.isParent(userId)) return [];
        const record = this._localpartCache[this._getLocalpart(userId)];
        if (!record) return [];
        else return record.childrenUserIds;
    }

    getParent(userId) {
        const record = this._localpartCache[this._getLocalpart(userId)];
        if (!record) return userId;
        else return record.parentUserId;
    }

    _cacheProfile(userId, roomId, profile) {
        console.log("Caching profile for user " + userId + " in room " + roomId + " as " + JSON.stringify(profile));
        if (!this._profileCache[userId]) this._profileCache[userId] = {
            rooms: {}, // [roomId] => profile
            global: {},
        };
        if (roomId) {
            this._profileCache[userId].rooms[roomId] = profile;
        } else this._profileCache[userId].global = profile;
    }

    getProfileFast(userId, roomId) {
        this.trackUser(userId);

        const localpart = this._getLocalpart(userId);
        const cached = this._localpartCache[localpart];
        const parentUserId = cached ? cached.parentUserId : userId;

        const cachedProfile = this._profileCache[parentUserId];
        if (cachedProfile) {
            const roomProfile = cachedProfile.rooms[roomId];
            if (roomProfile) return roomProfile;
            else if (roomProfile !== undefined) return cachedProfile.global;
        }

        return {};
    }

    async getProfile(userId, roomId) {
        const client = MatrixClientPeg.get();
        if (!client) return {}; // We're just not ready

        if (!SettingsStore.getValue("mergeUsersByLocalpart")) {
            // HACK: We don't bother checking the roomId here
            return client.getProfileInfo(userId);
        }

        // Wait for the tracking to complete because we actually want this to be
        // accurate.
        await this.trackUser(userId);

        const localpart = this._getLocalpart(userId);
        const cached = this._localpartCache[localpart];
        const parentUserId = cached ? cached.parentUserId : userId;

        const cachedProfile = this._profileCache[parentUserId];
        if (cachedProfile) {
            const roomProfile = cachedProfile.rooms[roomId];
            if (roomProfile) return roomProfile;
            else if (roomProfile !== undefined) return cachedProfile.global;
        }

        // First try to get the user's membership event in the desired room
        if (roomId) {
            try {
                const room = client.getRoom(roomId);
                if (room) {
                    const membership = room.currentState.getStateEvents("m.room.member", parentUserId);
                    if (membership && membership.getContent()) {
                        const profile = membership.getContent();
                        this._cacheProfile(parentUserId, roomId, profile);
                        return profile;
                    } else this._cacheProfile(parentUserId, roomId, null);
                }
            } catch (e) {
                console.error("Non-fatal error getting per-room profile for " + parentUserId);
                console.error(e);
            }
        }

        // Otherwise try to get the user's global profile and use that
        const profile = await client.getProfileInfo(parentUserId);
        this._cacheProfile(parentUserId, roomId, profile);
        this._cacheProfile(parentUserId, null, profile);
        return profile;
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
        const roomId = (await client.getRoomIdForAlias(roomAlias)).room_id;

        // First try to peek into the user's profile room
        // We peek using initialSync directly to avoid interfering with the client's
        // currently peeked room (if any).
        try {
            const response = await client.roomInitialSync(roomId, 1);
            const stateEvent = response.state.find(e => e.type === "m.linked_accounts");
            if (stateEvent) return stateEvent["content"];
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
