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

import React from "react";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { EventType, MsgType, RelationType } from "matrix-js-sdk/src/@types/event";
import { M_POLL_START, Optional } from "matrix-events-sdk";
import { MatrixClient } from "matrix-js-sdk/src/client";

import EditorStateTransfer from "../utils/EditorStateTransfer";
import { RoomPermalinkCreator } from "../utils/permalinks/Permalinks";
import CallEventGrouper from "../components/structures/CallEventGrouper";
import { GetRelationsForEvent } from "../components/views/rooms/EventTile";
import { TimelineRenderingType } from "../contexts/RoomContext";
import MessageEvent from "../components/views/messages/MessageEvent";
import MKeyVerificationConclusion from "../components/views/messages/MKeyVerificationConclusion";
import CallEvent from "../components/views/messages/CallEvent";
import TextualEvent from "../components/views/messages/TextualEvent";
import EncryptionEvent from "../components/views/messages/EncryptionEvent";
import RoomCreate from "../components/views/messages/RoomCreate";
import RoomAvatarEvent from "../components/views/messages/RoomAvatarEvent";
import { WIDGET_LAYOUT_EVENT_TYPE } from "../stores/widgets/WidgetLayoutStore";
import { ALL_RULE_TYPES } from "../mjolnir/BanList";
import { MatrixClientPeg } from "../MatrixClientPeg";
import MKeyVerificationRequest from "../components/views/messages/MKeyVerificationRequest";
import { WidgetType } from "../widgets/WidgetType";
import MJitsiWidgetEvent from "../components/views/messages/MJitsiWidgetEvent";
import { hasText } from "../TextForEvent";
import { getMessageModerationState, MessageModerationState } from "../utils/EventUtils";
import HiddenBody from "../components/views/messages/HiddenBody";
import ViewSourceEvent from "../components/views/messages/ViewSourceEvent";
import { shouldDisplayAsBeaconTile } from "../utils/beacon/timeline";

// Subset of EventTile's IProps plus some mixins
export interface EventTileTypeProps {
    ref?: React.RefObject<any>; // `any` because it's effectively impossible to convince TS of a reasonable type
    mxEvent: MatrixEvent;
    highlights?: string[];
    highlightLink?: string;
    showUrlPreview?: boolean;
    onHeightChanged: () => void;
    forExport?: boolean;
    getRelationsForEvent?: GetRelationsForEvent;
    editState?: EditorStateTransfer;
    replacingEventId?: string;
    permalinkCreator: RoomPermalinkCreator;
    callEventGrouper?: CallEventGrouper;
    isSeeingThroughMessageHiddenForModeration?: boolean;
    timestamp?: JSX.Element;
    maxImageHeight?: number; // pixels
    overrideBodyTypes?: Record<string, typeof React.Component>;
    overrideEventTypes?: Record<string, typeof React.Component>;
}

type FactoryProps = Omit<EventTileTypeProps, "ref">;
type Factory<X = FactoryProps> = (ref: Optional<React.RefObject<any>>, props: X) => JSX.Element;
type FactoryMap = Record<string, Factory>;

const MessageEventFactory: Factory = (ref, props) => <MessageEvent ref={ref} {...props} />;
const KeyVerificationConclFactory: Factory = (ref, props) => <MKeyVerificationConclusion ref={ref} {...props} />;
const CallEventFactory: Factory<FactoryProps & { callEventGrouper: CallEventGrouper }> = (ref, props) => (
    <CallEvent ref={ref} {...props} />
);
const TextualEventFactory: Factory = (ref, props) => <TextualEvent ref={ref} {...props} />;
const VerificationReqFactory: Factory = (ref, props) => <MKeyVerificationRequest ref={ref} {...props} />;
const HiddenEventFactory: Factory = (ref, props) => <HiddenBody ref={ref} {...props} />;

// These factories are exported for reference comparison against pickFactory()
export const JitsiEventFactory: Factory = (ref, props) => <MJitsiWidgetEvent ref={ref} {...props} />;
export const JSONEventFactory: Factory = (ref, props) => <ViewSourceEvent ref={ref} {...props} />;

const EVENT_TILE_TYPES: FactoryMap = {
    [EventType.RoomMessage]: MessageEventFactory, // note that verification requests are handled in pickFactory()
    [EventType.Sticker]: MessageEventFactory,
    [M_POLL_START.name]: MessageEventFactory,
    [M_POLL_START.altName]: MessageEventFactory,
    [EventType.KeyVerificationCancel]: KeyVerificationConclFactory,
    [EventType.KeyVerificationDone]: KeyVerificationConclFactory,
    [EventType.CallInvite]: CallEventFactory, // note that this requires a special factory type
};

const STATE_EVENT_TILE_TYPES: FactoryMap = {
    [EventType.RoomEncryption]: (ref, props) => <EncryptionEvent ref={ref} {...props} />,
    [EventType.RoomCanonicalAlias]: TextualEventFactory,
    [EventType.RoomCreate]: (ref, props) => <RoomCreate ref={ref} {...props} />,
    [EventType.RoomMember]: TextualEventFactory,
    [EventType.RoomName]: TextualEventFactory,
    [EventType.RoomAvatar]: (ref, props) => <RoomAvatarEvent ref={ref} {...props} />,
    [EventType.RoomThirdPartyInvite]: TextualEventFactory,
    [EventType.RoomHistoryVisibility]: TextualEventFactory,
    [EventType.RoomTopic]: TextualEventFactory,
    [EventType.RoomPowerLevels]: TextualEventFactory,
    [EventType.RoomPinnedEvents]: TextualEventFactory,
    [EventType.RoomServerAcl]: TextualEventFactory,
    // TODO: Enable support for m.widget event type (https://github.com/vector-im/element-web/issues/13111)
    'im.vector.modular.widgets': TextualEventFactory, // note that Jitsi widgets are special in pickFactory()
    [WIDGET_LAYOUT_EVENT_TYPE]: TextualEventFactory,
    [EventType.RoomTombstone]: TextualEventFactory,
    [EventType.RoomJoinRules]: TextualEventFactory,
    [EventType.RoomGuestAccess]: TextualEventFactory,
};

// Add all the Mjolnir stuff to the renderer too
for (const evType of ALL_RULE_TYPES) {
    STATE_EVENT_TILE_TYPES[evType] = TextualEventFactory;
}

// These events should be recorded in the STATE_EVENT_TILE_TYPES
const SINGULAR_STATE_EVENTS = new Set([
    EventType.RoomEncryption,
    EventType.RoomCanonicalAlias,
    EventType.RoomCreate,
    EventType.RoomName,
    EventType.RoomAvatar,
    EventType.RoomHistoryVisibility,
    EventType.RoomTopic,
    EventType.RoomPowerLevels,
    EventType.RoomPinnedEvents,
    EventType.RoomServerAcl,
    WIDGET_LAYOUT_EVENT_TYPE,
    EventType.RoomTombstone,
    EventType.RoomJoinRules,
    EventType.RoomGuestAccess,
]);

/**
 * Find an event tile factory for the given conditions.
 * @param mxEvent The event.
 * @param cli The matrix client to reference when needed.
 * @param showHiddenEvents Whether hidden events should be shown.
 * @param asHiddenEv When true, treat the event as always hidden.
 * @returns The factory, or falsy if not possible.
 */
export function pickFactory(
    mxEvent: MatrixEvent,
    cli: MatrixClient,
    showHiddenEvents: boolean,
    asHiddenEv?: boolean,
): Optional<Factory> {
    const evType = mxEvent.getType(); // cache this to reduce call stack execution hits

    // Note: we avoid calling SettingsStore unless absolutely necessary - this code is on the critical path.

    if (asHiddenEv && showHiddenEvents) {
        return JSONEventFactory;
    }

    const noEventFactoryFactory: (() => Optional<Factory>) = () => showHiddenEvents
        ? JSONEventFactory
        : undefined; // just don't render things that we shouldn't render

    // We run all the event type checks first as they might override the factory entirely.

    const moderationState = getMessageModerationState(mxEvent, cli);
    if (moderationState === MessageModerationState.HIDDEN_TO_CURRENT_USER) {
        return HiddenEventFactory;
    }

    if (evType === EventType.RoomMessage) {
        // don't show verification requests we're not involved in,
        // not even when showing hidden events
        const content = mxEvent.getContent();
        if (content?.msgtype === MsgType.KeyVerificationRequest) {
            const me = cli.getUserId();
            if (mxEvent.getSender() !== me && content['to'] !== me) {
                return noEventFactoryFactory(); // not for/from us
            } else {
                // override the factory
                return VerificationReqFactory;
            }
        }
    } else if (evType === EventType.KeyVerificationDone) {
        // these events are sent by both parties during verification, but we only want to render one
        // tile once the verification concludes, so filter out the one from the other party.
        const me = cli.getUserId();
        if (mxEvent.getSender() !== me) {
            return noEventFactoryFactory();
        }
    }

    if (evType === EventType.KeyVerificationCancel || evType === EventType.KeyVerificationDone) {
        // sometimes MKeyVerificationConclusion declines to render. Jankily decline to render and
        // fall back to showing hidden events, if we're viewing hidden events
        // XXX: This is extremely a hack. Possibly these components should have an interface for
        // declining to render?
        if (!MKeyVerificationConclusion.shouldRender(mxEvent, mxEvent.verificationRequest)) {
            return noEventFactoryFactory();
        }
    }

    // TODO: Enable support for m.widget event type (https://github.com/vector-im/element-web/issues/13111)
    if (evType === "im.vector.modular.widgets") {
        let type = mxEvent.getContent()['type'];
        if (!type) {
            // deleted/invalid widget - try the past widget type
            type = mxEvent.getPrevContent()['type'];
        }

        if (WidgetType.JITSI.matches(type)) {
            // override the factory
            return JitsiEventFactory;
        }
    }

    // Try and pick a state event factory, if we can.
    if (mxEvent.isState()) {
        if (shouldDisplayAsBeaconTile(mxEvent)) {
            return MessageEventFactory;
        }

        if (SINGULAR_STATE_EVENTS.has(evType) && mxEvent.getStateKey() !== '') {
            return noEventFactoryFactory(); // improper event type to render
        }

        if (STATE_EVENT_TILE_TYPES[evType] === TextualEventFactory && !hasText(mxEvent, showHiddenEvents)) {
            return noEventFactoryFactory();
        }

        return STATE_EVENT_TILE_TYPES[evType] ?? noEventFactoryFactory();
    }

    // Blanket override for all events. The MessageEvent component handles redacted states for us.
    if (mxEvent.isRedacted()) {
        return MessageEventFactory;
    }

    if (mxEvent.isRelation(RelationType.Replace)) {
        return noEventFactoryFactory();
    }

    return EVENT_TILE_TYPES[evType] ?? noEventFactoryFactory();
}

/**
 * Render an event as a tile
 * @param renderType The render type. Used to inform properties given to the eventual component.
 * @param props The properties to provide to the eventual component.
 * @param showHiddenEvents Whether hidden events should be shown.
 * @param cli Optional client instance to use, otherwise the default MatrixClientPeg will be used.
 * @returns The tile as JSX, or falsy if unable to render.
 */
export function renderTile(
    renderType: TimelineRenderingType,
    props: EventTileTypeProps,
    showHiddenEvents: boolean,
    cli?: MatrixClient,
): Optional<JSX.Element> {
    cli = cli ?? MatrixClientPeg.get(); // because param defaults don't do the correct thing

    const factory = pickFactory(props.mxEvent, cli, showHiddenEvents);
    if (!factory) return undefined;

    // Note that we split off the ones we actually care about here just to be sure that we're
    // not going to accidentally send things we shouldn't from lazy callers. Eg: EventTile's
    // lazy calls of `renderTile(..., this.props)` will have a lot more than we actually care
    // about.
    const {
        ref,
        mxEvent,
        forExport,
        replacingEventId,
        editState,
        highlights,
        highlightLink,
        showUrlPreview,
        permalinkCreator,
        onHeightChanged,
        callEventGrouper,
        getRelationsForEvent,
        isSeeingThroughMessageHiddenForModeration,
        timestamp,
    } = props;

    switch (renderType) {
        case TimelineRenderingType.File:
        case TimelineRenderingType.Notification:
        case TimelineRenderingType.Thread:
            // We only want a subset of props, so we don't end up causing issues for downstream components.
            return factory(props.ref, {
                mxEvent,
                highlights,
                highlightLink,
                showUrlPreview,
                onHeightChanged,
                editState,
                replacingEventId,
                getRelationsForEvent,
                isSeeingThroughMessageHiddenForModeration,
                permalinkCreator,
            });
        default:
            // NEARLY ALL THE OPTIONS!
            return factory(ref, {
                mxEvent,
                forExport,
                replacingEventId,
                editState,
                highlights,
                highlightLink,
                showUrlPreview,
                permalinkCreator,
                onHeightChanged,
                callEventGrouper,
                getRelationsForEvent,
                isSeeingThroughMessageHiddenForModeration,
                timestamp,
            });
    }
}

/**
 * A version of renderTile() specifically for replies.
 * @param props The properties to specify on the eventual object.
 * @param showHiddenEvents Whether hidden events should be shown.
 * @param cli Optional client instance to use, otherwise the default MatrixClientPeg will be used.
 * @returns The tile as JSX, or falsy if unable to render.
 */
export function renderReplyTile(
    props: EventTileTypeProps,
    showHiddenEvents: boolean,
    cli?: MatrixClient,
): Optional<JSX.Element> {
    cli = cli ?? MatrixClientPeg.get(); // because param defaults don't do the correct thing

    const factory = pickFactory(props.mxEvent, cli, showHiddenEvents);
    if (!factory) return undefined;

    // See renderTile() for why we split off so much
    const {
        ref,
        mxEvent,
        highlights,
        highlightLink,
        onHeightChanged,
        showUrlPreview,
        overrideBodyTypes,
        overrideEventTypes,
        replacingEventId,
        maxImageHeight,
        getRelationsForEvent,
        isSeeingThroughMessageHiddenForModeration,
        permalinkCreator,
    } = props;

    return factory(ref, {
        mxEvent,
        highlights,
        highlightLink,
        onHeightChanged,
        showUrlPreview,
        overrideBodyTypes,
        overrideEventTypes,
        replacingEventId,
        maxImageHeight,
        getRelationsForEvent,
        isSeeingThroughMessageHiddenForModeration,
        permalinkCreator,
    });
}

// XXX: this'll eventually be dynamic based on the fields once we have extensible event types
const messageTypes = [EventType.RoomMessage, EventType.Sticker];
export function isMessageEvent(ev: MatrixEvent): boolean {
    return (messageTypes.includes(ev.getType() as EventType)) || M_POLL_START.matches(ev.getType());
}

export function haveRendererForEvent(mxEvent: MatrixEvent, showHiddenEvents: boolean): boolean {
    // Only show "Message deleted" tile for plain message events, encrypted events,
    // and state events as they'll likely still contain enough keys to be relevant.
    if (mxEvent.isRedacted() && !mxEvent.isEncrypted() && !isMessageEvent(mxEvent) && !mxEvent.isState()) {
        return false;
    }

    // No tile for replacement events since they update the original tile
    if (mxEvent.isRelation(RelationType.Replace)) return false;

    const handler = pickFactory(mxEvent, MatrixClientPeg.get(), showHiddenEvents);
    if (!handler) return false;
    if (handler === TextualEventFactory) {
        return hasText(mxEvent, showHiddenEvents);
    } else if (handler === STATE_EVENT_TILE_TYPES[EventType.RoomCreate]) {
        return Boolean(mxEvent.getContent()['predecessor']);
    } else if (handler === JSONEventFactory) {
        return false;
    } else {
        return true;
    }
}
