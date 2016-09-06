/*
Copyright 2015, 2016 OpenMarket Ltd

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

const HIDE_CONFERENCE_CHANS = true;

/**
 * Given a room object, return the alias we should use for it,
 * if any. This could be the canonical alias if one exists, otherwise
 * an alias selected arbitrarily but deterministically from the list
 * of aliases. Otherwise return null;
 */
export function getDisplayAliasForRoom(room) {
    return room.getCanonicalAlias() || room.getAliases()[0];
}

export function getRoomLists(rooms, myUserId, conferenceHandler) {
    var s = { lists: {} };

    s.lists["im.vector.fake.invite"] = [];
    s.lists["m.favourite"] = [];
    s.lists["im.vector.fake.recent"] = [];
    s.lists["im.vector.fake.direct"] = [];
    s.lists["m.lowpriority"] = [];
    s.lists["im.vector.fake.archived"] = [];

    rooms.forEach((room) => {
        const me = room.getMember(myUserId);
        if (!me) return;

        // console.log("room = " + room.name + ", me.membership = " + me.membership +
        //             ", sender = " + me.events.member.getSender() +
        //             ", target = " + me.events.member.getStateKey() +
        //             ", prevMembership = " + me.events.member.getPrevContent().membership);

        if (me.membership == "invite") {
            s.lists["im.vector.fake.invite"].push(room);
        }
        else if (HIDE_CONFERENCE_CHANS && isConfCallRoom(room, me, conferenceHandler)) {
            // skip past this room & don't put it in any lists
        }
        else if (isDirectMessageRoom(room, me)) {
            // "Direct Message" rooms
            s.lists["im.vector.fake.direct"].push(room);
        }
        else if (me.membership == "join" || me.membership === "ban" ||
                 (me.membership === "leave" && me.events.member.getSender() !== me.events.member.getStateKey()))
        {
            // Used to split rooms via tags
            var tagNames = Object.keys(room.tags);

            if (tagNames.length) {
                for (var i = 0; i < tagNames.length; i++) {
                    var tagName = tagNames[i];
                    s.lists[tagName] = s.lists[tagName] || [];
                    s.lists[tagNames[i]].push(room);
                }
            }
            else {
                s.lists["im.vector.fake.recent"].push(room);
            }
        }
        else if (me.membership === "leave") {
            s.lists["im.vector.fake.archived"].push(room);
        }
        else {
            console.error("unrecognised membership: " + me.membership + " - this should never happen");
        }
    });

    //console.log("calculated new roomLists; im.vector.fake.recent = " + s.lists["im.vector.fake.recent"]);

    // we actually apply the sorting to this when receiving the prop in RoomSubLists.

    return s;
}

/**
 * If the room contains only two members including the logged-in user,
 * return the other one. Otherwise, return null.
 */
function getOnlyOtherMember(room, me) {
    const joinedMembers = room.getJoinedMembers();

    if (joinedMembers.length === 2) {
        return joinedMembers.filter(function(m) {
            return m.userId !== me.userId
        })[0];
    }

    return null;
}

function isConfCallRoom(room, me, conferenceHandler) {
    if (!conferenceHandler) return false;

    if (me.membership != "join") {
        return false;
    }

    const otherMember = getOnlyOtherMember(room, me);
    if (otherMember === null) {
        return false;
    }

    if (conferenceHandler.isConferenceUser(otherMember.userId)) {
        return true;
    }
}

function isDirectMessageRoom(room, me) {
    if (me.membership == "join" || me.membership === "ban" ||
        (me.membership === "leave" && me.events.member.getSender() !== me.events.member.getStateKey()))
    {
        // Used to split rooms via tags
        const tagNames = Object.keys(room.tags);
        // Used for 1:1 direct chats
        const joinedMembers = room.getJoinedMembers();

        // Show 1:1 chats in seperate "Direct Messages" section as long as they haven't
        // been moved to a different tag section
        if (joinedMembers.length === 2 && !tagNames.length) {
            return true;
        }
    }
    return false;
}
