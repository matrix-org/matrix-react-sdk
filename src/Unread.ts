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
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { EventType, MsgType } from "matrix-js-sdk/src/@types/event";

import { MatrixClientPeg } from "./MatrixClientPeg";
import shouldHideEvent from './shouldHideEvent';
import { haveTileForEvent } from "./components/views/rooms/EventTile";

const isMyEvent = (event: MatrixEvent): boolean => event.getSender() === MatrixClientPeg.get().getUserId();

/**
 * Returns true if this event arriving in a room should affect the room's
 * count of unread messages
 *
 * @param {Object} ev The event
 * @returns {boolean} True if the given event should affect the unread message count
 */
export function eventTriggersUnreadCount(ev: MatrixEvent): boolean {
    // Ignore events sent by us
    if (isMyEvent(ev)) return false;

    const type = ev.getType()

    if (
        (type.startsWith("m.call.") || type.startsWith("org.matrix.call.")) &&
        type !== EventType.CallInvite
    ) return false;

    switch (type) {
        case EventType.RoomMember:
        case EventType.RoomThirdPartyInvite:
        case EventType.RoomAliases:
        case EventType.RoomCanonicalAlias:
        case EventType.RoomServerAcl:
            return false;

        case EventType.RoomMessage:
            if (ev.getContent().msgtype === MsgType.Notice) {
                return false;
            }
            break;
    }

    if (ev.isRedacted()) return false;
    return haveTileForEvent(ev);
}

export function shouldSubtractEventFromNotifCount(event: MatrixEvent): boolean {
    // Ignore events sent by us
    if (isMyEvent(event)) return false;

    const type = event.getType();

    if (
        (type.startsWith("m.call.") || type.startsWith("org.matrix.call.")) &&
        type !== EventType.CallInvite
    ) return true;

    return false;
}

export function doesRoomHaveUnreadMessages(room: Room): boolean {
    const myUserId = MatrixClientPeg.get().getUserId();

    // get the most recent read receipt sent by our account.
    // N.B. this is NOT a read marker (RM, aka "read up to marker"),
    // despite the name of the method :((
    const readUpToId = room.getEventReadUpTo(myUserId);

    // as we don't send RRs for our own messages, make sure we special case that
    // if *we* sent the last message into the room, we consider it not unread!
    // Should fix: https://github.com/vector-im/element-web/issues/3263
    //             https://github.com/vector-im/element-web/issues/2427
    // ...and possibly some of the others at
    //             https://github.com/vector-im/element-web/issues/3363
    if (room.timeline.length &&
        room.timeline[room.timeline.length - 1].sender &&
        room.timeline[room.timeline.length - 1].sender.userId === myUserId) {
        return false;
    }

    // this just looks at whatever history we have, which if we've only just started
    // up probably won't be very much, so if the last couple of events are ones that
    // don't count, we don't know if there are any events that do count between where
    // we have and the read receipt. We could fetch more history to try & find out,
    // but currently we just guess.

    // Loop through messages, starting with the most recent...
    for (let i = room.timeline.length - 1; i >= 0; --i) {
        const ev = room.timeline[i];

        if (ev.getId() == readUpToId) {
            // If we've read up to this event, there's nothing more recent
            // that counts and we can stop looking because the user's read
            // this and everything before.
            return false;
        } else if (!shouldHideEvent(ev) && eventTriggersUnreadCount(ev)) {
            // We've found a message that counts before we hit
            // the user's read receipt, so this room is definitely unread.
            return true;
        }
    }
    // If we got here, we didn't find a message that counted but didn't find
    // the user's read receipt either, so we guess and say that the room is
    // unread on the theory that false positives are better than false
    // negatives here.
    return true;
}


/**
 * This method returns the number of events before the user's RR that should not
 * be counted as notifications. An example of this would be hidden call events
 * or call hangup events
 *
 * This method only looks at the history we currently have!
 * @param {Room} room
 * @returns {number} number of events that should not be counted as notifications
 */
export function getSubtractNotifCountForRoom(room: Room): number {
    const myUserId = MatrixClientPeg.get().getUserId();

    // Get the most recent read receipt sent by our account
    const readUpToId = room.getEventReadUpTo(myUserId);

    // If we sent the last message don't subtract anything
    if (room.timeline[room.timeline.length - 1]?.sender?.userId === myUserId) return 0;

    let subtractCount = 0;

    // Loop through messages, starting with the most recent...
    for (let i = room.timeline.length - 1; i >= 0; --i) {
        const event = room.timeline[i];

        // We've go to the RR, therefore we return
        if (event.getId() === readUpToId) return subtractCount;

        // We've found an event before the user's RM that shouldn't count as
        // a notification, therefore we increment
        if (shouldSubtractEventFromNotifCount(event)) subtractCount++;
    }

    // If we got here, we didn't find the user's RM. That means that there is
    // probably more events to go through. We could fetch more history, but
    // currently we just return what we got
    return subtractCount;
}
