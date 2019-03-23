/*
Copyright 2018, 2019 New Vector Ltd

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
import {Store} from 'flux/utils';
import dis from '../dispatcher';
import DMRoomMap from '../utils/DMRoomMap';
import Unread from '../Unread';
import SettingsStore from "../settings/SettingsStore";

/*
Room sorting algorithm:
* Always prefer to have red > grey > bold > idle
* The room being viewed should be sticky (not jump down to the idle list)
* When switching to a new room, sort the last sticky room to the top of the idle list.

The approach taken by the store is to generate an initial representation of all the
tagged lists (accepting that it'll take a little bit longer to calculate) and make
small changes to that over time. This results in quick changes to the room list while
also having update operations feel more like popping/pushing to a stack.
 */

const CATEGORY_RED = "red";     // Mentions in the room
const CATEGORY_GREY = "grey";   // Unread notified messages (not mentions)
const CATEGORY_BOLD = "bold";   // Unread messages (not notified, 'Mentions Only' rooms)
const CATEGORY_IDLE = "idle";   // Nothing of interest

const CATEGORY_ORDER = [CATEGORY_RED, CATEGORY_GREY, CATEGORY_BOLD, CATEGORY_IDLE];
const LIST_ORDERS = {
    "m.favourite": "manual",
    "im.vector.fake.invite": "recent",
    "im.vector.fake.recent": "recent",
    "im.vector.fake.direct": "recent",
    "m.lowpriority": "recent",
    "im.vector.fake.archived": "recent",
};

/**
 * Identifier for the "breadcrumb" (or "sort by most important room first") algorithm.
 * Includes a provision for keeping the currently open room from flying down the room
 * list.
 * @type {string}
 */
const ALGO_IMPORTANCE = "importance";

/**
 * Identifier for classic sorting behaviour: sort by the most recent message first.
 * @type {string}
 */
const ALGO_RECENT = "recent";

/**
 * A class for storing application state for categorising rooms in
 * the RoomList.
 */
class RoomListStore extends Store {
    constructor() {
        super(dis);

        this._init();
        this._getManualComparator = this._getManualComparator.bind(this);
        this._recentsComparator = this._recentsComparator.bind(this);
    }

    /**
     * Changes the sorting algorithm used by the RoomListStore.
     * @param {string} algorithm The new algorithm to use. Should be one of the ALGO_* constants.
     */
    updateSortingAlgorithm(algorithm) {
        // Dev note: We only have two algorithms at the moment, but it isn't impossible that we want
        // multiple in the future. Also constants make things slightly clearer.
        const byImportance = algorithm === ALGO_IMPORTANCE;
        console.log("Updating room sorting algorithm: sortByImportance=" + byImportance);
        this._setState({orderRoomsByImportance: byImportance});

        // Trigger a resort of the entire list to reflect the change in algorithm
        this._generateInitialRoomLists();
    }

    _init() {
        // Initialise state
        const defaultLists = {
            "m.server_notice": [/* { room: js-sdk room, category: string } */],
            "im.vector.fake.invite": [],
            "m.favourite": [],
            "im.vector.fake.recent": [],
            "im.vector.fake.direct": [],
            "m.lowpriority": [],
            "im.vector.fake.archived": [],
        };
        this._state = {
            // The rooms in these arrays are ordered according to either the
            // 'recents' behaviour or 'manual' behaviour.
            lists: defaultLists,
            presentationLists: defaultLists, // like `lists`, but with arrays of rooms instead
            ready: false,
            stickyRoomId: null,
            orderRoomsByImportance: true,
        };

        SettingsStore.monitorSetting('RoomList.orderByImportance', null);
        SettingsStore.monitorSetting('feature_custom_tags', null);
    }

    _setState(newState) {
        // If we're changing the lists, transparently change the presentation lists (which
        // is given to requesting components). This dramatically simplifies our code elsewhere
        // while also ensuring we don't need to update all the calling components to support
        // categories.
        if (newState['lists']) {
            const presentationLists = {};
            for (const key of Object.keys(newState['lists'])) {
                presentationLists[key] = newState['lists'][key].map((e) => e.room);
            }
            newState['presentationLists'] = presentationLists;
        }
        this._state = Object.assign(this._state, newState);
        this.__emitChange();
    }

    __onDispatch(payload) {
        const logicallyReady = this._matrixClient && this._state.ready;
        switch (payload.action) {
            case 'setting_updated': {
                if (!logicallyReady) break;

                if (payload.settingName === 'RoomList.orderByImportance') {
                    this.updateSortingAlgorithm(payload.newValue === true ? ALGO_IMPORTANCE : ALGO_RECENT);
                } else if (payload.settingName === 'feature_custom_tags') {
                    this._setState({tagsEnabled: payload.newValue});
                    this._generateInitialRoomLists(); // Tags means we have to start from scratch
                }
            }
            break;
            // Initialise state after initial sync
            case 'MatrixActions.sync': {
                if (!(payload.prevState !== 'PREPARED' && payload.state === 'PREPARED')) {
                    break;
                }

                // Always ensure that we set any state needed for settings here. It is possible that
                // setting updates trigger on startup before we are ready to sync, so we want to make
                // sure that the right state is in place before we actually react to those changes.

                this._setState({tagsEnabled: SettingsStore.isFeatureEnabled("feature_custom_tags")});

                this._matrixClient = payload.matrixClient;

                const algorithm = SettingsStore.getValue("RoomList.orderByImportance")
                    ? ALGO_IMPORTANCE : ALGO_RECENT;
                this.updateSortingAlgorithm(algorithm);
            }
            break;
            case 'MatrixActions.Room.receipt': {
                if (!logicallyReady) break;

                // First see if the receipt event is for our own user. If it was, trigger
                // a room update (we probably read the room on a different device).
                const myUserId = this._matrixClient.getUserId();
                for (const eventId of Object.keys(payload.event.getContent())) {
                    const receiptUsers = Object.keys(payload.event.getContent()[eventId]['m.read'] || {});
                    if (receiptUsers.includes(myUserId)) {
                        this._roomUpdateTriggered(payload.room.roomId);
                        return;
                    }
                }
            }
            break;
            case 'MatrixActions.Room.tags': {
                if (!logicallyReady) break;
                // TODO: Figure out which rooms changed in the tag and only change those.
                // This is very blunt and wipes out the sticky room stuff
                this._generateInitialRoomLists();
            }
            break;
            case 'MatrixActions.Room.timeline': {
                if (!logicallyReady ||
                    !payload.isLiveEvent ||
                    !payload.isLiveUnfilteredRoomTimelineEvent ||
                    !this._eventTriggersRecentReorder(payload.event)
                ) {
                    break;
                }

                this._roomUpdateTriggered(payload.event.getRoomId());
            }
            break;
            // When an event is decrypted, it could mean we need to reorder the room
            // list because we now know the type of the event.
            case 'MatrixActions.Event.decrypted': {
                if (!logicallyReady) break;

                const roomId = payload.event.getRoomId();

                // We may have decrypted an event without a roomId (e.g to_device)
                if (!roomId) break;

                const room = this._matrixClient.getRoom(roomId);

                // We somehow decrypted an event for a room our client is unaware of
                if (!room) break;

                const liveTimeline = room.getLiveTimeline();
                const eventTimeline = room.getTimelineForEvent(payload.event.getId());

                // Either this event was not added to the live timeline (e.g. pagination)
                // or it doesn't affect the ordering of the room list.
                if (liveTimeline !== eventTimeline || !this._eventTriggersRecentReorder(payload.event)) {
                    break;
                }

                this._roomUpdateTriggered(roomId);
            }
            break;
            case 'MatrixActions.accountData': {
                if (!logicallyReady) break;
                if (payload.event_type !== 'm.direct') break;
                // TODO: Figure out which rooms changed in the direct chat and only change those.
                // This is very blunt and wipes out the sticky room stuff
                this._generateInitialRoomLists();
            }
            break;
            case 'MatrixActions.Room.myMembership': {
                if (!logicallyReady) break;
                this._roomUpdateTriggered(payload.room.roomId, true);
            }
            break;
            // This could be a new room that we've been invited to, joined or created
            // we won't get a RoomMember.membership for these cases if we're not already
            // a member.
            case 'MatrixActions.Room': {
                if (!logicallyReady) break;
                this._roomUpdateTriggered(payload.room.roomId, true);
            }
            break;
            // TODO: Re-enable optimistic updates when we support dragging again
            // case 'RoomListActions.tagRoom.pending': {
            //     if (!logicallyReady) break;
            //     // XXX: we only show one optimistic update at any one time.
            //     // Ideally we should be making a list of in-flight requests
            //     // that are backed by transaction IDs. Until the js-sdk
            //     // supports this, we're stuck with only being able to use
            //     // the most recent optimistic update.
            //     console.log("!! Optimistic tag: ", payload);
            // }
            // break;
            // case 'RoomListActions.tagRoom.failure': {
            //     if (!logicallyReady) break;
            //     // Reset state according to js-sdk
            //     console.log("!! Optimistic tag failure: ", payload);
            // }
            // break;
            case 'on_logged_out': {
                // Reset state without pushing an update to the view, which generally assumes that
                // the matrix client isn't `null` and so causing a re-render will cause NPEs.
                this._init();
                this._matrixClient = null;
            }
            break;
            case 'view_room': {
                if (!logicallyReady) break;

                // Note: it is important that we set a new stickyRoomId before setting the old room
                // to IDLE. If we don't, the wrong room gets counted as sticky.
                const currentStickyId = this._state.stickyRoomId;
                this._setState({stickyRoomId: payload.room_id});
                if (currentStickyId) {
                    this._setRoomCategory(this._matrixClient.getRoom(currentStickyId), CATEGORY_IDLE);
                }
            }
            break;
        }
    }

    _roomUpdateTriggered(roomId, ignoreSticky) {
        // We don't calculate categories for sticky rooms because we have a moderate
        // interest in trying to maintain the category that they were last in before
        // being artificially flagged as IDLE. Also, this reduces the amount of time
        // we spend in _setRoomCategory ever so slightly.
        if (this._state.stickyRoomId !== roomId || ignoreSticky) {
            // Micro optimization: Only look up the room if we're confident we'll need it.
            const room = this._matrixClient.getRoom(roomId);
            if (!room) return;

            const category = this._calculateCategory(room);
            this._setRoomCategory(room, category);
        }
    }

    _filterTags(tags) {
        tags = tags ? Object.keys(tags) : [];
        if (this._state.tagsEnabled) return tags;
        return tags.filter((t) => !!LIST_ORDERS[t]);
    }

    _getRecommendedTagsForRoom(room) {
        const tags = [];

        const myMembership = room.getMyMembership();
        if (myMembership === 'join' || myMembership === 'invite') {
            // Stack the user's tags on top
            tags.push(...this._filterTags(room.tags));

            // Order matters here: The DMRoomMap updates before invites
            // are accepted, so we check to see if the room is an invite
            // first, then if it is a direct chat, and finally default
            // to the "recents" list.
            const dmRoomMap = DMRoomMap.shared();
            if (myMembership === 'invite') {
                tags.push("im.vector.fake.invite");
            } else if (dmRoomMap.getUserIdForRoomId(room.roomId) && tags.length === 0) {
                // We intentionally don't duplicate rooms in other tags into the people list
                // as a feature.
                tags.push("im.vector.fake.direct");
            } else if (tags.length === 0) {
                tags.push("im.vector.fake.recent");
            }
        } else {
            tags.push("im.vector.fake.archived");
        }


        return tags;
    }

    _slotRoomIntoList(room, category, tag, existingEntries, newList, lastTimestampFn) {
        const targetCategoryIndex = CATEGORY_ORDER.indexOf(category);

        // The slotting algorithm works by trying to position the room in the most relevant
        // category of the list (red > grey > etc). To accomplish this, we need to consider
        // a couple cases: the category existing in the list but having other rooms in it and
        // the case of the category simply not existing and needing to be started. In order to
        // do this efficiently, we only want to iterate over the list once and solve our sorting
        // problem as we go.
        //
        // Firstly, we'll remove any existing entry that references the room we're trying to
        // insert. We don't really want to consider the old entry and want to recreate it. We
        // also exclude the sticky (currently active) room from the categorization logic and
        // let it pass through wherever it resides in the list: it shouldn't be moving around
        // the list too much, so we want to keep it where it is.
        //
        // The case of the category we want existing is easy to handle: once we hit the category,
        // find the room that has a most recent event later than our own and insert just before
        // that (making us the more recent room). If we end up hitting the next category before
        // we can slot the room in, insert the room at the top of the category as a fallback. We
        // do this to ensure that the room doesn't go too far down the list given it was previously
        // considered important (in the case of going down in category) or is now more important
        // (suddenly becoming red, for instance). The boundary tracking is how we end up achieving
        // this, as described in the next paragraphs.
        //
        // The other case of the category not already existing is a bit more complicated. We track
        // the boundaries of each category relative to the list we're currently building so that
        // when we miss the category we can insert the room at the right spot. Most importantly, we
        // can't assume that the end of the list being built is the right spot because of the last
        // paragraph's requirement: the room should be put to the top of a category if the category
        // runs out of places to put it.
        //
        // All told, our tracking looks something like this:
        //
        // ------ A <- Category boundary (start of red)
        //  RED
        //  RED
        //  RED
        // ------ B <- In this example, we have a grey room we want to insert.
        //  BOLD
        //  BOLD
        // ------ C
        //  IDLE
        //  IDLE
        // ------ D <- End of list
        //
        // Given that example, and our desire to insert a GREY room into the list, this iterates
        // over the room list until it realizes that BOLD comes after GREY and we're no longer
        // in the RED section. Because there's no rooms there, we simply insert there which is
        // also a "category boundary". If we change the example to wanting to insert a BOLD room
        // which can't be ordered by timestamp with the existing couple rooms, we would still make
        // use of the boundary flag to insert at B before changing the boundary indicator to C.

        let desiredCategoryBoundaryIndex = 0;
        let foundBoundary = false;
        let pushedEntry = false;

        for (const entry of existingEntries) {
            // We insert our own record as needed, so don't let the old one through.
            if (entry.room.roomId === room.roomId) {
                continue;
            }

            // if the list is a recent list, and the room appears in this list, and we're
            // not looking at a sticky room (sticky rooms have unreliable categories), try
            // to slot the new room in
            if (entry.room.roomId !== this._state.stickyRoomId && !pushedEntry) {
                const entryCategoryIndex = CATEGORY_ORDER.indexOf(entry.category);

                // As per above, check if we're meeting that boundary we wanted to locate.
                if (entryCategoryIndex >= targetCategoryIndex && !foundBoundary) {
                    desiredCategoryBoundaryIndex = newList.length - 1;
                    foundBoundary = true;
                }

                // If we've hit the top of a boundary beyond our target category, insert at the top of
                // the grouping to ensure the room isn't slotted incorrectly. Otherwise, try to insert
                // based on most recent timestamp.
                const changedBoundary = entryCategoryIndex > targetCategoryIndex;
                const currentCategory = entryCategoryIndex === targetCategoryIndex;
                if (changedBoundary || (currentCategory && lastTimestampFn(room) >= lastTimestampFn(entry.room))) {
                    if (changedBoundary) {
                        // If we changed a boundary, then we've gone too far - go to the top of the last
                        // section instead.
                        newList.splice(desiredCategoryBoundaryIndex, 0, {room, category});
                    } else {
                        // If we're ordering by timestamp, just insert normally
                        newList.push({room, category});
                    }
                    pushedEntry = true;
                }
            }

            // Fall through and clone the list.
            newList.push(entry);
        }

        if (!pushedEntry && desiredCategoryBoundaryIndex >= 0) {
            console.warn(`!! Room ${room.roomId} nearly lost: Ran off the end of ${tag}`);
            console.warn(`!! Inserting at position ${desiredCategoryBoundaryIndex} with category ${category}`);
            newList.splice(desiredCategoryBoundaryIndex, 0, {room, category});
            pushedEntry = true;
        }

        return pushedEntry;
    }

    _setRoomCategory(room, category) {
        if (!room) return; // This should only happen in tests

        const listsClone = {};

        // Micro optimization: Support lazily loading the last timestamp in a room
        const timestampCache = {}; // {roomId => ts}
        const lastTimestamp = (room) => {
            if (!timestampCache[room.roomId]) {
                timestampCache[room.roomId] = this._tsOfNewestEvent(room);
            }
            return timestampCache[room.roomId];
        };
        const targetTags = this._getRecommendedTagsForRoom(room);
        const insertedIntoTags = [];

        // We need to make sure all the tags (lists) are updated with the room's new position. We
        // generally only get called here when there's a new room to insert or a room has potentially
        // changed positions within the list.
        //
        // We do all our checks by iterating over the rooms in the existing lists, trying to insert
        // our room where we can. As a guiding principle, we should be removing the room from all
        // tags, and insert the room into targetTags. We should perform the deletion before the addition
        // where possible to keep a consistent state. By the end of this, targetTags should be the
        // same as insertedIntoTags.

        for (const key of Object.keys(this._state.lists)) {
            const shouldHaveRoom = targetTags.includes(key);

            // Speed optimization: Don't do complicated math if we don't have to.
            if (!shouldHaveRoom) {
                listsClone[key] = this._state.lists[key].filter((e) => e.room.roomId !== room.roomId);
            } else if (LIST_ORDERS[key] !== 'recent') {
                // Manually ordered tags are sorted later, so for now we'll just clone the tag
                // and add our room if needed
                listsClone[key] = this._state.lists[key].filter((e) => e.room.roomId !== room.roomId);
                listsClone[key].push({room, category});
                insertedIntoTags.push(key);
            } else {
                listsClone[key] = [];

                const pushedEntry = this._slotRoomIntoList(
                    room, category, key, this._state.lists[key], listsClone[key], lastTimestamp);

                if (!pushedEntry) {
                    // This should rarely happen: _slotRoomIntoList has several checks which attempt
                    // to make sure that a room is not lost in the list. If we do lose the room though,
                    // we shouldn't throw it on the floor and forget about it. Instead, we should insert
                    // it somewhere. We'll insert it at the top for a couple reasons: 1) it is probably
                    // an important room for the user and 2) if this does happen, we'd want a bug report.
                    console.warn(`!! Room ${room.roomId} nearly lost: Failed to find a position`);
                    console.warn(`!! Inserting at position 0 in the list and flagging as inserted`);
                    console.warn("!! Additional info: ", {
                       category,
                       key,
                       upToIndex: listsClone[key].length,
                       expectedCount: this._state.lists[key].length,
                    });
                    listsClone[key].splice(0, 0, {room, category});
                }
                insertedIntoTags.push(key);
            }
        }

        // Double check that we inserted the room in the right places.
        // There should never be a discrepancy.
        for (const targetTag of targetTags) {
            let count = 0;
            for (const insertedTag of insertedIntoTags) {
                if (insertedTag === targetTag) count++;
            }

            if (count !== 1) {
                console.warn(`!! Room ${room.roomId} inserted ${count} times`);
            }
        }

        // Sort the favourites before we set the clone
        for (const tag of Object.keys(listsClone)) {
            if (LIST_ORDERS[tag] === 'recent') continue; // skip recents (pre-sorted)
            listsClone[tag].sort(this._getManualComparator(tag));
        }

        this._setState({lists: listsClone});
    }

    _generateInitialRoomLists() {
        // Log something to show that we're throwing away the old results. This is for the inevitable
        // question of "why is 100% of my CPU going towards Riot?" - a quick look at the logs would reveal
        // that something is wrong with the RoomListStore.
        console.log("Generating initial room lists");

        const lists = {
            "m.server_notice": [],
            "im.vector.fake.invite": [],
            "m.favourite": [],
            "im.vector.fake.recent": [],
            "im.vector.fake.direct": [],
            "m.lowpriority": [],
            "im.vector.fake.archived": [],
        };

        const dmRoomMap = DMRoomMap.shared();

        this._matrixClient.getRooms().forEach((room) => {
            const myUserId = this._matrixClient.getUserId();
            const membership = room.getMyMembership();
            const me = room.getMember(myUserId);

            if (membership === "invite") {
                lists["im.vector.fake.invite"].push({room, category: CATEGORY_RED});
            } else if (membership === "join" || membership === "ban" || (me && me.isKicked())) {
                // Used to split rooms via tags
                let tagNames = Object.keys(room.tags);

                // ignore any m. tag names we don't know about
                tagNames = tagNames.filter((t) => {
                    // Speed optimization: Avoid hitting the SettingsStore at all costs by making it the
                    // last condition possible.
                    return lists[t] !== undefined || (!t.startsWith('m.') && this._state.tagsEnabled);
                });

                if (tagNames.length) {
                    for (let i = 0; i < tagNames.length; i++) {
                        const tagName = tagNames[i];
                        lists[tagName] = lists[tagName] || [];

                        // Default to an arbitrary category for tags which aren't ordered by recents
                        let category = CATEGORY_IDLE;
                        if (LIST_ORDERS[tagName] === 'recent') category = this._calculateCategory(room);
                        lists[tagName].push({room, category: category});
                    }
                } else if (dmRoomMap.getUserIdForRoomId(room.roomId)) {
                    // "Direct Message" rooms (that we're still in and that aren't otherwise tagged)
                    lists["im.vector.fake.direct"].push({room, category: this._calculateCategory(room)});
                } else {
                    lists["im.vector.fake.recent"].push({room, category: this._calculateCategory(room)});
                }
            } else if (membership === "leave") {
                // The category of these rooms is not super important, so deprioritize it to the lowest
                // possible value.
                lists["im.vector.fake.archived"].push({room, category: CATEGORY_IDLE});
            }
        });

        // We use this cache in the recents comparator because _tsOfNewestEvent can take a while. This
        // cache only needs to survive the sort operation below and should not be implemented outside
        // of this function, otherwise the room lists will almost certainly be out of date and wrong.
        const latestEventTsCache = {}; // roomId => timestamp

        Object.keys(lists).forEach((listKey) => {
            let comparator;
            switch (LIST_ORDERS[listKey]) {
                case "recent":
                    comparator = (entryA, entryB) => {
                        return this._recentsComparator(entryA, entryB, (room) => {
                            if (!room) return Number.MAX_SAFE_INTEGER; // Should only happen in tests

                            if (latestEventTsCache[room.roomId]) {
                                return latestEventTsCache[room.roomId];
                            }

                            const ts = this._tsOfNewestEvent(room);
                            latestEventTsCache[room.roomId] = ts;
                            return ts;
                        });
                    };
                    break;
                case "manual":
                default:
                    comparator = this._getManualComparator(listKey);
                    break;
            }
            lists[listKey].sort(comparator);
        });

        this._setState({
            lists,
            ready: true, // Ready to receive updates to ordering
        });
    }

    _eventTriggersRecentReorder(ev) {
        return ev.getTs() && (
            Unread.eventTriggersUnreadCount(ev) ||
            ev.getSender() === this._matrixClient.credentials.userId
        );
    }

    _tsOfNewestEvent(room) {
        // Apparently we can have rooms without timelines, at least under testing
        // environments. Just return MAX_INT when this happens.
        if (!room || !room.timeline) return Number.MAX_SAFE_INTEGER;

        for (let i = room.timeline.length - 1; i >= 0; --i) {
            const ev = room.timeline[i];
            if (this._eventTriggersRecentReorder(ev)) {
                return ev.getTs();
            }
        }

        // we might only have events that don't trigger the unread indicator,
        // in which case use the oldest event even if normally it wouldn't count.
        // This is better than just assuming the last event was forever ago.
        if (room.timeline.length && room.timeline[0].getTs()) {
            return room.timeline[0].getTs();
        } else {
            return Number.MAX_SAFE_INTEGER;
        }
    }

    _calculateCategory(room) {
        if (!this._state.orderRoomsByImportance) {
            // Effectively disable the categorization of rooms if we're supposed to
            // be sorting by more recent messages first. This triggers the timestamp
            // comparison bit of _setRoomCategory and _recentsComparator instead of
            // the category ordering.
            return CATEGORY_IDLE;
        }

        const mentions = room.getUnreadNotificationCount("highlight") > 0;
        if (mentions) return CATEGORY_RED;

        let unread = room.getUnreadNotificationCount() > 0;
        if (unread) return CATEGORY_GREY;

        unread = Unread.doesRoomHaveUnreadMessages(room);
        if (unread) return CATEGORY_BOLD;

        return CATEGORY_IDLE;
    }

    _recentsComparator(entryA, entryB, tsOfNewestEventFn) {
        const roomA = entryA.room;
        const roomB = entryB.room;
        const categoryA = entryA.category;
        const categoryB = entryB.category;

        if (categoryA !== categoryB) {
            const idxA = CATEGORY_ORDER.indexOf(categoryA);
            const idxB = CATEGORY_ORDER.indexOf(categoryB);
            if (idxA > idxB) return 1;
            if (idxA < idxB) return -1;
            return 0; // Technically not possible
        }

        const timestampA = tsOfNewestEventFn(roomA);
        const timestampB = tsOfNewestEventFn(roomB);
        return timestampB - timestampA;
    }

    _lexicographicalComparator(roomA, roomB) {
        return roomA.name > roomB.name ? 1 : -1;
    }

    _getManualComparator(tagName, optimisticRequest) {
        return (entryA, entryB) => {
            const roomA = entryA.room;
            const roomB = entryB.room;

            let metaA = roomA.tags[tagName];
            let metaB = roomB.tags[tagName];

            if (optimisticRequest && roomA === optimisticRequest.room) metaA = optimisticRequest.metaData;
            if (optimisticRequest && roomB === optimisticRequest.room) metaB = optimisticRequest.metaData;

            // Make sure the room tag has an order element, if not set it to be the bottom
            const a = metaA ? Number(metaA.order) : undefined;
            const b = metaB ? Number(metaB.order) : undefined;

            // Order undefined room tag orders to the bottom
            if (a === undefined && b !== undefined) {
                return 1;
            } else if (a !== undefined && b === undefined) {
                return -1;
            }

            return a === b ? this._lexicographicalComparator(roomA, roomB) : (a > b ? 1 : -1);
        };
    }

    getRoomLists() {
        return this._state.presentationLists;
    }
}

if (global.singletonRoomListStore === undefined) {
    global.singletonRoomListStore = new RoomListStore();
}
export default global.singletonRoomListStore;
