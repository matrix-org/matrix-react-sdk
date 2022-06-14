/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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

import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { EventType, MsgType } from "matrix-js-sdk/src/@types/event";
import { M_POLL_START } from "matrix-events-sdk";
import { M_BEACON_INFO } from "matrix-js-sdk/src/@types/beacon";

import SettingsStore from "../settings/SettingsStore";
import { haveRendererForEvent, JitsiEventFactory, JSONEventFactory, pickFactory } from "../events/EventTileFactory";
import { MatrixClientPeg } from "../MatrixClientPeg";
import { getMessageModerationState, isLocationEvent, MessageModerationState } from "./EventUtils";

export function getEventDisplayInfo(mxEvent: MatrixEvent, showHiddenEvents: boolean, hideEvent?: boolean): {
    isInfoMessage: boolean;
    hasRenderer: boolean;
    isBubbleMessage: boolean;
    isLeftAlignedBubbleMessage: boolean;
    noBubbleEvent: boolean;
    isSeeingThroughMessageHiddenForModeration: boolean;
} {
    const content = mxEvent.getContent();
    const msgtype = content.msgtype;
    const eventType = mxEvent.getType();

    let isSeeingThroughMessageHiddenForModeration = false;
    if (SettingsStore.getValue("feature_msc3531_hide_messages_pending_moderation")) {
        switch (getMessageModerationState(mxEvent)) {
            case MessageModerationState.VISIBLE_FOR_ALL:
            case MessageModerationState.HIDDEN_TO_CURRENT_USER:
                // Nothing specific to do here
                break;
            case MessageModerationState.SEE_THROUGH_FOR_CURRENT_USER:
                // Show message with a marker.
                isSeeingThroughMessageHiddenForModeration = true;
                break;
        }
    }

    // TODO: Thread a MatrixClient through to here
    let factory = pickFactory(mxEvent, MatrixClientPeg.get(), showHiddenEvents);

    // Info messages are basically information about commands processed on a room
    let isBubbleMessage = (
        eventType.startsWith("m.key.verification") ||
        (eventType === EventType.RoomMessage && msgtype?.startsWith("m.key.verification")) ||
        (eventType === EventType.RoomCreate) ||
        (eventType === EventType.RoomEncryption) ||
        (factory === JitsiEventFactory)
    );
    const isLeftAlignedBubbleMessage = (
        !isBubbleMessage &&
        eventType === EventType.CallInvite
    );
    let isInfoMessage = (
        !isBubbleMessage &&
        !isLeftAlignedBubbleMessage &&
        eventType !== EventType.RoomMessage &&
        eventType !== EventType.RoomMessageEncrypted &&
        eventType !== EventType.Sticker &&
        eventType !== EventType.RoomCreate &&
        !M_POLL_START.matches(eventType) &&
        !M_BEACON_INFO.matches(eventType)
    );
    // Some non-info messages want to be rendered in the appropriate bubble column but without the bubble background
    const noBubbleEvent = (
        (eventType === EventType.RoomMessage && msgtype === MsgType.Emote) ||
        M_POLL_START.matches(eventType) ||
        M_BEACON_INFO.matches(eventType) ||
        isLocationEvent(mxEvent)
    );

    // If we're showing hidden events in the timeline, we should use the
    // source tile when there's no regular tile for an event and also for
    // replace relations (which otherwise would display as a confusing
    // duplicate of the thing they are replacing).
    if (hideEvent || !haveRendererForEvent(mxEvent, showHiddenEvents)) {
        // forcefully ask for a factory for a hidden event (hidden event
        // setting is checked internally)
        // TODO: Thread a MatrixClient through to here
        factory = pickFactory(mxEvent, MatrixClientPeg.get(), showHiddenEvents, true);
        if (factory === JSONEventFactory) {
            isBubbleMessage = false;
            // Reuse info message avatar and sender profile styling
            isInfoMessage = true;
        }
    }

    return {
        hasRenderer: !!factory,
        isInfoMessage,
        isBubbleMessage,
        isLeftAlignedBubbleMessage,
        noBubbleEvent,
        isSeeingThroughMessageHiddenForModeration,
    };
}
