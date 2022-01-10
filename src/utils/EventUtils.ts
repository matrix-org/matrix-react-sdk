/*
Copyright 2019 - 2021 The Matrix.org Foundation C.I.C.

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

import { EventStatus, MatrixEvent } from 'matrix-js-sdk/src/models/event';
import { EventType, MsgType, RelationType } from "matrix-js-sdk/src/@types/event";
import { MatrixClient } from 'matrix-js-sdk/src/client';
import { logger } from 'matrix-js-sdk/src/logger';
import { POLL_START_EVENT_TYPE } from "matrix-js-sdk/src/@types/polls";
import { LOCATION_EVENT_TYPE } from 'matrix-js-sdk/src/@types/location';

import { MatrixClientPeg } from '../MatrixClientPeg';
import shouldHideEvent from "../shouldHideEvent";
import { getHandlerTile, haveTileForEvent } from "../components/views/rooms/EventTile";
import SettingsStore from "../settings/SettingsStore";

/**
 * Returns whether an event should allow actions like reply, reactions, edit, etc.
 * which effectively checks whether it's a regular message that has been sent and that we
 * can display.
 *
 * @param {MatrixEvent} mxEvent The event to check
 * @returns {boolean} true if actionable
 */
export function isContentActionable(mxEvent: MatrixEvent): boolean {
    const { status: eventStatus } = mxEvent;

    // status is SENT before remote-echo, null after
    const isSent = !eventStatus || eventStatus === EventStatus.SENT;

    if (isSent && !mxEvent.isRedacted()) {
        if (mxEvent.getType() === 'm.room.message') {
            const content = mxEvent.getContent();
            if (content.msgtype && content.msgtype !== 'm.bad.encrypted' && content.hasOwnProperty('body')) {
                return true;
            }
        } else if (
            mxEvent.getType() === 'm.sticker' ||
            POLL_START_EVENT_TYPE.matches(mxEvent.getType())
        ) {
            return true;
        }
    }

    return false;
}

export function canEditContent(mxEvent: MatrixEvent): boolean {
    if (mxEvent.status === EventStatus.CANCELLED ||
        mxEvent.getType() !== EventType.RoomMessage ||
        mxEvent.isRedacted() ||
        mxEvent.isRelation(RelationType.Replace) ||
        mxEvent.getSender() !== MatrixClientPeg.get().getUserId()
    ) {
        return false;
    }

    const { msgtype, body } = mxEvent.getOriginalContent();
    return (msgtype === MsgType.Text || msgtype === MsgType.Emote) && body && typeof body === 'string';
}

export function canEditOwnEvent(mxEvent: MatrixEvent): boolean {
    // for now we only allow editing
    // your own events. So this just call through
    // In the future though, moderators will be able to
    // edit other people's messages as well but we don't
    // want findEditableEvent to return other people's events
    // hence this method.
    return canEditContent(mxEvent);
}

const MAX_JUMP_DISTANCE = 100;
export function findEditableEvent({
    events,
    isForward,
    fromEventId,
}: {
    events: MatrixEvent[];
    isForward: boolean;
    fromEventId?: string;
}): MatrixEvent {
    const maxIdx = events.length - 1;
    const inc = isForward ? 1 : -1;
    const beginIdx = isForward ? 0 : maxIdx;
    let endIdx = isForward ? maxIdx : 0;
    if (!fromEventId) {
        endIdx = Math.min(Math.max(0, beginIdx + (inc * MAX_JUMP_DISTANCE)), maxIdx);
    }
    let foundFromEventId = !fromEventId;
    for (let i = beginIdx; i !== (endIdx + inc); i += inc) {
        const e = events[i];
        // find start event first
        if (!foundFromEventId && e.getId() === fromEventId) {
            foundFromEventId = true;
            // don't look further than MAX_JUMP_DISTANCE events from `fromEventId`
            // to not iterate potentially 1000nds of events on key up/down
            endIdx = Math.min(Math.max(0, i + (inc * MAX_JUMP_DISTANCE)), maxIdx);
        } else if (foundFromEventId && !shouldHideEvent(e) && canEditOwnEvent(e)) {
            // otherwise look for editable event
            return e;
        }
    }
}

export function getEventDisplayInfo(mxEvent: MatrixEvent): {
    isInfoMessage: boolean;
    tileHandler: string;
    isBubbleMessage: boolean;
    isLeftAlignedBubbleMessage: boolean;
    noBubbleEvent: boolean;
} {
    const content = mxEvent.getContent();
    const msgtype = content.msgtype;
    const eventType = mxEvent.getType();

    let tileHandler = getHandlerTile(mxEvent);

    // Info messages are basically information about commands processed on a room
    let isBubbleMessage = (
        eventType.startsWith("m.key.verification") ||
        (eventType === EventType.RoomMessage && msgtype && msgtype.startsWith("m.key.verification")) ||
        (eventType === EventType.RoomCreate) ||
        (eventType === EventType.RoomEncryption) ||
        (tileHandler === "messages.MJitsiWidgetEvent")
    );
    const isLeftAlignedBubbleMessage = (
        !isBubbleMessage &&
        eventType === EventType.CallInvite
    );
    let isInfoMessage = (
        !isBubbleMessage &&
        !isLeftAlignedBubbleMessage &&
        eventType !== EventType.RoomMessage &&
        eventType !== EventType.Sticker &&
        eventType !== EventType.RoomCreate &&
        !POLL_START_EVENT_TYPE.matches(eventType)
    );
    // Some non-info messages want to be rendered in the appropriate bubble column but without the bubble background
    const noBubbleEvent = (
        POLL_START_EVENT_TYPE.matches(eventType) ||
        LOCATION_EVENT_TYPE.matches(eventType) ||
        (
            eventType === EventType.RoomMessage &&
            LOCATION_EVENT_TYPE.matches(msgtype)
        )
    );

    // If we're showing hidden events in the timeline, we should use the
    // source tile when there's no regular tile for an event and also for
    // replace relations (which otherwise would display as a confusing
    // duplicate of the thing they are replacing).
    if (SettingsStore.getValue("showHiddenEventsInTimeline") && !haveTileForEvent(mxEvent)) {
        tileHandler = "messages.ViewSourceEvent";
        isBubbleMessage = false;
        // Reuse info message avatar and sender profile styling
        isInfoMessage = true;
    }

    return { tileHandler, isInfoMessage, isBubbleMessage, isLeftAlignedBubbleMessage, noBubbleEvent };
}

export function isVoiceMessage(mxEvent: MatrixEvent): boolean {
    const content = mxEvent.getContent();
    // MSC2516 is a legacy identifier. See https://github.com/matrix-org/matrix-doc/pull/3245
    return (
        !!content['org.matrix.msc2516.voice'] ||
        !!content['org.matrix.msc3245.voice']
    );
}

export async function fetchInitialEvent(
    client: MatrixClient,
    roomId: string,
    eventId: string): Promise<MatrixEvent | null> {
    let initialEvent: MatrixEvent;

    try {
        const eventData = await client.fetchRoomEvent(roomId, eventId);
        initialEvent = new MatrixEvent(eventData);
    } catch (e) {
        logger.warn("Could not find initial event: " + eventId);
        initialEvent = null;
    }

    if (initialEvent?.isThreadRelation) {
        try {
            const rootEventData = await client.fetchRoomEvent(roomId, initialEvent.threadRootId);
            const rootEvent = new MatrixEvent(rootEventData);
            const room = client.getRoom(roomId);
            room.createThread([rootEvent]);
        } catch (e) {
            logger.warn("Could not find root event: " + initialEvent.threadRootId);
        }
    }

    return initialEvent;
}
