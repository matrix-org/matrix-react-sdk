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
import SdkConfig from "./SdkConfig";

const MatrixClientPeg = require("./MatrixClientPeg");
const dis = require("./dispatcher");

const FAILED_LOOKUP_CACHE_TIME = 60 * 1000; // ms
const VERBOSE_LOGGING = false;

/**
 * Tracks users that should be merged together and their profiles.
 */
class MergedUsers {

    // We track which localparts we see and their associated parents.
    _localpartCache = {}; // [localpart] => {parentUserId, childrenUserIds}
    _profileCache = {}; // [user] => {global: profile, rooms: [roomId] => profile}
    _failureCache = {}; // [user] => timestamp  // used for caching profile lookup failures
    _pendingTrackers = {}; // [user] => Promise  // used to de-dupe tracking requests

    constructor() {
        console.log("Starting up MergedUsers");

        this._loadCaches();

        console.log("Mergable hosts:", this._mergableHosts);
    }

    get _mergableHosts() {
        return SdkConfig.get().mergable_hosts || [];
    }

    _persistCaches() {
        console.log("Persisting MergedUsers caches");
        localStorage.setItem("mx_merged_users", JSON.stringify({
            localparts: this._localpartCache,
            profiles: this._profileCache,
        }));
    }

    _loadCaches() {
        try {
            console.log("Loading MergedUsers caches");
            const containerStr = localStorage.getItem("mx_merged_users");
            if (containerStr) {
                const container = JSON.parse(containerStr);
                if (container.localparts) this._localpartCache = container.localparts;
                if (container.profiles) this._profileCache = container.profiles;
            }
        } catch (e) {
            console.error("Error loading MergedUsers caches");
            console.error(e);
        }
    }

    _isMergable(userId) {
        if (VERBOSE_LOGGING) console.log("MergedUsers#_isMergable on entity: " + userId);
        if (!userId) return false;
        const domain = userId.split(":").slice(1).join(":"); // extract everything after the first colon
        return this._mergableHosts.some(h => {
            if (h.endsWith("*")) {
                return domain.toLowerCase().startsWith(h.toLowerCase().substring(0, h.length - 1));
            } else return domain.toLowerCase() === h.toLowerCase();
        });
    }

    _getLocalpart(userId) {
        if (VERBOSE_LOGGING) console.log("MergedUsers#_getLocalpart on entity: " + userId);
        if (!userId) return "";
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
        if (VERBOSE_LOGGING) console.log("MergedUsers#trackUser on entity: " + userId);
        if (!userId) return Promise.resolve();
        if (!SettingsStore.getValue("mergeUsersByLocalpart")) return Promise.resolve();
        if (!this._isMergable(userId)) return Promise.resolve();

        const localpart = this._getLocalpart(userId);
        if (!localpart) return Promise.resolve();

        if (this._pendingTrackers[localpart]) {
            return this._pendingTrackers[localpart];
        }

        const promise = new Promise(async (resolve, reject) => {
            const now = new Date().getTime();
            if (this._failureCache[localpart]) {
                if (now - this._failureCache[localpart] >= FAILED_LOOKUP_CACHE_TIME) {
                    delete this._failureCache[localpart];
                } else return resolve();
            }

            if (this._localpartCache[localpart]) {
                // We already have a parent, so just append a child if we need to
                const children = this._localpartCache[localpart].childrenUserIds;
                const parent = this._localpartCache[localpart].parentUserId;
                if (userId !== parent && !children.includes(userId)) {
                    console.log("Adding " + userId + " as a child for " + parent);
                    children.push(userId);
                    this._persistCaches();
                    dis.dispatch({action: "merged_user_general_update", namespaceUserId: userId});
                }
                return resolve();
            }

            try {
                const state = await this._getLinkedState(userId);
                if (!state || !state["parent"]) {
                    return resolve(); // Nothing to do: the user is the parent
                }

                console.log("Tracking " + state["parent"] + " as the parent for " + userId);
                const children = state["parent"] === userId ? [] : [userId];
                this._localpartCache[localpart] = {
                    parentUserId: state["parent"],
                    childrenUserIds: children,
                };
                this._persistCaches();
                dis.dispatch({action: "merged_user_general_update", namespaceUserId: userId});
            } catch (e) {
                console.error("Non-fatal error getting linked accounts for " + userId);
                console.error(e);
                this._failureCache[localpart] = now;
            }

            return resolve();
        });

        this._pendingTrackers[localpart] = promise;
        return promise;
    }

    /**
     * Determines if the given user ID equates to the currently logged in user.
     * This is done through a logical check on the child eligibility of the
     * user ID.
     * @param {string} userId The user ID to match against the currently logged
     * in user.
     * @returns {boolean} True if the user ID matches the logged in user, false
     * otherwise.
     */
    isSelf(userId) {
        if (VERBOSE_LOGGING) console.log("MergedUsers#isSelf on entity: " + userId);
        if (!MatrixClientPeg.get()) return false;
        if (!this._isMergable(userId)) return MatrixClientPeg.get().getUserId() === userId;
        return this.isChildOf(userId, [MatrixClientPeg.get().getUserId()]);
    }

    /**
     * Determines if a given user ID is a child of another known user.
     * @param {string} userId The user ID to check the status of.
     * @return {boolean} True if the user ID is a child, false otherwise.
     */
    isChild(userId) {
        if (VERBOSE_LOGGING) console.log("MergedUsers#isChild on entity: " + userId);
        if (!this._isMergable(userId)) return false;

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
        if (VERBOSE_LOGGING) console.log("MergedUsers#isParent on entity: " + userId);
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
        if (VERBOSE_LOGGING) console.log("MergedUsers#isChildOf on entity " + userId + " with parents", parentIds);
        const localpart = this._getLocalpart(userId);
        return parentIds.some(i => this._getLocalpart(i) === localpart);
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
     * @param {boolean} includeResultsWithNoUserId If true, tuples that
     * do not have a user ID will have their objects returned as-is.
     * @return {[object]} The objects from the tuples for which the
     * accompanying user is considered a parent.
     */
    getEffectiveParents(tuples, includeResultsWithNoUserId) {
        if (VERBOSE_LOGGING) console.log("MergedUsers#getEffectiveParents | includeResultsWithNoUserId=" + includeResultsWithNoUserId);
        const parentIds = [];
        const parentObjects = [];

        // First pass: identify parents
        for (const tuple of tuples) {
            const userId = tuple[0];
            const obj = tuple[1];

            const includeAnyways = !userId && includeResultsWithNoUserId;
            if (includeAnyways || this.isParent(userId)) {
                parentIds.push(userId);
                parentObjects.push(obj);
            }
        }

        // Second pass: find all the children we missed
        for (const tuple of tuples) {
            const userId = tuple[0];
            const obj = tuple[1];

            if (!userId) continue;
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
        if (VERBOSE_LOGGING) console.log("MergedUsers#getChildren on entity: " + userId);
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
        if (VERBOSE_LOGGING) console.log("MergedUsers#getParent on entity: " + userId);
        if (!this._isMergable(userId)) return userId;
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
        this._persistCaches();

        dis.dispatch({action: "merged_user_general_update", namespaceUserId: userId});
    }

    /**
     * Gets the hierarchical profile for a given room member. This will return
     * the parent's profile.
     * @param {RoomMember} roomMember The room member to calculate the profile of.
     * @return {{displayname?: String, avatar_url?: String}} The calculated profile.
     */
    getProfileOf(roomMember) {
        if (VERBOSE_LOGGING) console.log("MergedUsers#getProfileOf on entity: " + roomMember);
        const userId = this.getParent(roomMember.userId);
        if (!this._isMergable(userId)) {
            return {
                displayname: roomMember.name,
                avatar_url: roomMember.getMxcAvatarUrl(),
            };
        }

        const fastProfile = this.getProfileFast(userId, roomMember.roomId);
        if (fastProfile && (fastProfile.displayname || fastProfile.avatar_url)) return fastProfile;

        const room = MatrixClientPeg.get().getRoom(roomMember.roomId);
        if (room) {
            const parentMember = room.currentState.members[userId];
            if (parentMember) roomMember = parentMember;
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
        if (VERBOSE_LOGGING) console.log("MergedUsers#getProfileFast on entity " + userId + " in " + roomId);
        if (!this._isMergable(userId)) return {};

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
        if (VERBOSE_LOGGING) console.log("MergedUsers#getProfile on entity " + userId + " in " + roomId);
        const client = MatrixClientPeg.get();
        if (!client) return {}; // We're just not ready

        if (!SettingsStore.getValue("mergeUsersByLocalpart") || !this._isMergable(userId)) {
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

    /**
     * Calculates the name for a room. This is intended to be used in place
     * of the js-sdk's Room.name property and other calculation methods.
     * @param {Room} room The room to calculate the name of.
     * @returns {string} The calculated room name.
     */
    calculateRoomName(room) {
        // Note: A lot of this is copy/pasted from the js-sdk. This is bad.

        const mRoomName = room.currentState.getStateEvents("m.room.name", "");
        if (mRoomName && mRoomName.getContent() && mRoomName.getContent().name) {
            return mRoomName.getContent().name;
        }

        let alias = room.getCanonicalAlias();

        if (!alias) {
            const aliases = room.getAliases();

            if (aliases.length) {
                alias = aliases[0];
            }
        }
        if (alias) {
            return alias;
        }

        // This is where things get different: we need to only consider effective
        // parents in the room, not everyone.
        const members = this.getEffectiveParents(room.currentState.getMembers().map(m => [m.userId, m]));
        const joinedCount = members.filter(m => m.membership === 'join' && !this.isSelf(m.userId)).length;
        const inviteCount = members.filter(m => m.membership === 'invite' && !this.isSelf(m.userId)).length;
        let otherNames = null;
        if (room._summaryHeroes) { // HACK: Internal access
            otherNames = this.getEffectiveParents(room._summaryHeroes.map(h => [h, h])).map(h => {
                const member = room.getMember(h);
                const profile = this.getProfileOf(member) || {};
                return profile.displayname || h;
            });
        } else {
            let otherMembers = members.filter(m => ['join', 'invite'].includes(m.membership) && !this.isSelf(m.userId));
            otherMembers.sort((a, b) => a.userId.localeCompare(b.userId));
            otherMembers = this.getEffectiveParents(otherMembers.map(m => [m.userId, m])).splice(0, 5);
            otherNames = otherMembers.map(m => {
                const profile = this.getProfileOf(m) || {};
                return profile.displayname || m.userId;
            });
        }

        if (joinedCount + inviteCount > 0) {
            return this._memberNamesToRoomName(otherNames, joinedCount + inviteCount);
        }

        const myMember = members.find(m => this.isSelf(m.userId));
        if (!myMember) return "Unknown Room";
        const myMembership = myMember.membership;

        // if I have created a room and invited people through
        // 3rd party invites
        if (myMembership === 'join') {
            const thirdPartyInvites =
                room.currentState.getStateEvents("m.room.third_party_invite");

            if (thirdPartyInvites && thirdPartyInvites.length) {
                const thirdPartyNames = thirdPartyInvites.map((i) => {
                    return i.getContent().display_name;
                });

                return `Inviting ${this._memberNamesToRoomName(thirdPartyNames, thirdPartyNames.length + 1)}`;
            }
        }
        // let's try to figure out who was here before
        let leftNames = otherNames;
        // if we didn't have heroes, try finding them in the room state
        if(!leftNames.length) {
            leftNames = this.getEffectiveParents(members.filter(m => !['join', 'invite'].includes(m.membership) && !this.isSelf(m.userId)).map(m => [m.userId, m])).map(m => {
                const profile = this.getProfileOf(m) || {};
                return profile.displayname || m.userId;
            });
        }
        if(leftNames.length) {
            return `Empty room (was ${this._memberNamesToRoomName(leftNames, leftNames.length + 1)})`;
        } else {
            return "Empty room";
        }
    }

    _memberNamesToRoomName(names, count) {
        // This is a direct copy/paste from the js-sdk

        const countWithoutMe = count - 1;
        if (!names.length) {
            return count <= 1 ? "Empty room" : null;
        } else if (names.length === 1 && countWithoutMe <= 1) {
            return names[0];
        } else if (names.length === 2 && countWithoutMe <= 2) {
            return `${names[0]} and ${names[1]}`;
        } else {
            const plural = countWithoutMe > 1;
            if (plural) {
                return `${names[0]} and ${countWithoutMe} others`;
            } else {
                return `${names[0]} and 1 other`;
            }
        }
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
