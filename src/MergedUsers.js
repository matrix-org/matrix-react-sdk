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

/**
 * Tracks users that should be merged together and their profiles.
 */
class MergedUsers {

    // We track which localparts we see and their associated parents.
    _localpartCache = {}; // [localpart] => {parentUserId, childrenUserIds}
    _noProfileCache = []; // list of localparts without profiles
    _profileCache = {}; // [user] => {global: profile, rooms: [roomId] => profile}

    _getLocalpart(userId) {
        return userId.substring(1).split(":")[0];
    }

    /**
     * Tracks a user in the tree. This is implicitly called by several other operations
     * on MergedUsers but may be invoked directly if needed. If a user is already tracked
     * then this will be a no-op.
     * @param {string} userId The user ID to track.
     * @return {Promise<void>} Resolves when tracking has been completed.
     */
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
                dis.dispatch({action: "merged_user_general_update", namespaceUserId: userId});
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
            dis.dispatch({action: "merged_user_general_update", namespaceUserId: userId});
        } catch (e) {
            console.error("Non-fatal error getting linked accounts for " + userId);
            console.error(e);
            if (!this._noProfileCache.includes(localpart)) this._noProfileCache.push(localpart);
        }
    }

    /**
     * Determines if a given user ID is a child of another known user.
     * @param {string} userId The user ID to check the status of.
     * @return {boolean} True if the user ID is a child, false otherwise.
     */
    isChild(userId) {
        // We can do this async as it doesn't matter all that much
        this.trackUser(userId);

        const localpart = this._getLocalpart(userId);
        const cached = this._localpartCache[localpart];
        if (cached) return cached.parentUserId !== userId;
        else return false;
    }

    /**
     * Determines if a given user ID is a parent of zero or more users.
     * @param {string} userId The user ID to check the status of.
     * @return {boolean} True if the user ID is a parent, false otherwise.
     */
    isParent(userId) {
        return !this.isChild(userId);
    }

    /**
     * Determines if a given user ID is logically a child of any of the
     * given parent user IDs. Note that this is a *logical* check not a
     * hierarchical one: asking if "@alice:example.org" is a child of
     * ["@alice:example.org"] will return true. User IDs listed in the
     * parent array which do not match the merge rules will be ignored.
     * @param {string} userId The user ID to check the status of.
     * @param {string[]} parentIds The user IDs to treat as potentially
     * related parents.
     * @return {boolean} True if the userId is logically a child of the
     * parentIds, false otherwise.
     */
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

    /**
     * Lists all the known children for a given user ID. If the user ID
     * given is not a parent, this returns an empty collection.
     * @param {string} userId The user ID to get the children of.
     * @return {string[]} An array of user IDs which are children of the
     * parent.
     */
    getChildren(userId) {
        if (!this.isParent(userId)) return [];
        const record = this._localpartCache[this._getLocalpart(userId)];
        if (!record) return [];
        else return record.childrenUserIds;
    }

    /**
     * Gets the parent for a given user ID. If the user ID is a parent,
     * it will be returned as-is.
     * @param {string} userId The user ID to get the parent of.
     * @return {string} The parent user ID for the given user ID.
     */
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

        dis.dispatch({action: "merged_user_general_update", namespaceUserId: userId});
    }

    /**
     * Gets the hierarchical profile for a given room member. This will return
     * the parent's profile.
     * @param {RoomMember} roomMember The room member to calculate the profile of.
     * @return {{displayname?: String, avatar_url?: String}} The calculated profile.
     */
    getProfileOf(roomMember) {
        const userId = this.getParent(roomMember.userId);
        const fastProfile = this.getProfileFast(userId, roomMember.roomId);
        if (fastProfile && (fastProfile.displayname || fastProfile.avatar_url)) return fastProfile;

        const room = MatrixClientPeg.get().getRoom(roomMember.roomId);
        const membership = room.currentState.getStateEvents("m.room.member", userId);
        if (membership && membership.getContent()) {
            return membership.getContent();
        }

        return {
            displayname: roomMember.name,
            avatar_url: roomMember.getMxcAvatarUrl(),
        };
    }

    /**
     * Gets the hierarchical profile for a given user ID by only requesting the
     * profile from the cache. This does not attempt to resolve the profile.
     * @param {string} userId The user ID to look up the profile for.
     * @param {String?} roomId The room ID to look up the profile in. Optional.
     * @return {{displayname?: String, avatar_url?: String}} The cached profile.
     */
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

    /**
     * Calculates the profile for a given user ID in a given room. This will return
     * the parent's profile for hte given circumstances where possible.
     * @param {string} userId The user ID to calculate the profile for.
     * @param {String?} roomId The room ID to calculate the profile in. Optional.
     * @return {Promise<{displayname?: String, avatar_url?: String}>} Resolves to
     * the calculated profile.
     */
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
