/*
 * Copyright 2024 The Matrix.org Foundation C.I.C.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { JSX, useEffect, useMemo, useState } from "react";
import { Icon as PinIcon } from "@vector-im/compound-design-tokens/icons/pin-solid.svg";
import { Button } from "@vector-im/compound-web";
import { Room } from "matrix-js-sdk/src/matrix";
import classNames from "classnames";

import { usePinnedEvents, useSortedFetchedPinnedEvents } from "../../../hooks/usePinnedEvents";
import { _t } from "../../../languageHandler";
import RightPanelStore from "../../../stores/right-panel/RightPanelStore";
import { RightPanelPhases } from "../../../stores/right-panel/RightPanelStorePhases";
import { useEventEmitter } from "../../../hooks/useEventEmitter";
import { UPDATE_EVENT } from "../../../stores/AsyncStore";
import { RoomPermalinkCreator } from "../../../utils/permalinks/Permalinks";
import { MessagePreviewStore } from "../../../stores/room-list/MessagePreviewStore";
import dis from "../../../dispatcher/dispatcher";
import { ViewRoomPayload } from "../../../dispatcher/payloads/ViewRoomPayload";
import { Action } from "../../../dispatcher/actions";
import MessageEvent from "../messages/MessageEvent";

/**
 * The props for the {@link PinnedMessageBanner} component.
 */
interface PinnedMessageBannerProps {
    /**
     * The permalink creator to use.
     */
    permalinkCreator: RoomPermalinkCreator;
    /**
     * The room where the banner is displayed
     */
    room: Room;
}

/**
 * A banner that displays the pinned messages in a room.
 */
export function PinnedMessageBanner({ room, permalinkCreator }: PinnedMessageBannerProps): JSX.Element | null {
    const pinnedEventIds = usePinnedEvents(room);
    const pinnedEvents = useSortedFetchedPinnedEvents(room, pinnedEventIds);
    const eventCount = pinnedEvents.length;
    const isSinglePinnedEvent = eventCount === 1;

    const [currentEventIndex, setCurrentEventIndex] = useState(eventCount - 1);
    // If the list of pinned events changes, we need to make sure the current index isn't out of bound
    useEffect(() => {
        setCurrentEventIndex((currentEventIndex) => {
            // If the current index is out of bound, we set it to the last index
            if (currentEventIndex < 0 || currentEventIndex >= eventCount) return eventCount - 1;
            return currentEventIndex;
        });
    }, [eventCount]);

    const pinnedEvent = pinnedEvents[currentEventIndex];
    // Generate a preview for the pinned event
    const eventPreview = useMemo(() => {
        if (!pinnedEvent || pinnedEvent.isRedacted() || pinnedEvent.isDecryptionFailure()) return null;
        return MessagePreviewStore.instance.generatePreviewForEvent(pinnedEvent);
    }, [pinnedEvent]);

    if (!pinnedEvent) return null;

    const shouldUseMessageEvent = pinnedEvent.isRedacted() || pinnedEvent.isDecryptionFailure();

    const onBannerClick = (): void => {
        // Scroll to the pinned message
        dis.dispatch<ViewRoomPayload>({
            action: Action.ViewRoom,
            event_id: pinnedEvent.getId(),
            highlighted: true,
            room_id: room.roomId,
            metricsTrigger: undefined, // room doesn't change
        });

        // Cycle through the pinned messages
        // When we reach the first message, we go back to the last message
        setCurrentEventIndex((currentEventIndex) => (--currentEventIndex === -1 ? eventCount - 1 : currentEventIndex));
    };

    return (
        <div
            className="mx_PinnedMessageBanner"
            data-single-message={isSinglePinnedEvent}
            aria-label={_t("room|pinned_message_banner|description")}
            data-testid="pinned-message-banner"
        >
            <button
                aria-label={_t("room|pinned_message_banner|go_to_message")}
                type="button"
                className="mx_PinnedMessageBanner_main"
                onClick={onBannerClick}
            >
                <div className="mx_PinnedMessageBanner_content">
                    <Indicators count={eventCount} currentIndex={currentEventIndex} />
                    <PinIcon width="20" className="mx_PinnedMessageBanner_PinIcon" />
                    {!isSinglePinnedEvent && (
                        <div className="mx_PinnedMessageBanner_title" data-testid="banner-counter">
                            {_t(
                                "room|pinned_message_banner|title",
                                {
                                    index: currentEventIndex + 1,
                                    length: eventCount,
                                },
                                { bold: (sub) => <span className="mx_PinnedMessageBanner_title_counter">{sub}</span> },
                            )}
                        </div>
                    )}
                    {eventPreview && <span className="mx_PinnedMessageBanner_message">{eventPreview}</span>}
                    {/* In case of redacted event, we want to display the nice sentence of the message event like in the timeline or in the pinned message list */}
                    {shouldUseMessageEvent && (
                        <div className="mx_PinnedMessageBanner_redactedMessage">
                            <MessageEvent
                                mxEvent={pinnedEvent}
                                maxImageHeight={20}
                                permalinkCreator={permalinkCreator}
                                replacingEventId={pinnedEvent.replacingEventId()}
                            />
                        </div>
                    )}
                </div>
            </button>
            {!isSinglePinnedEvent && <BannerButton room={room} />}
        </div>
    );
}

const MAX_INDICATORS = 3;

/**
 * The props for the {@link IndicatorsProps} component.
 */
interface IndicatorsProps {
    /**
     * The number of messages pinned
     */
    count: number;
    /**
     * The current index of the pinned message
     */
    currentIndex: number;
}

/**
 * A component that displays vertical indicators for the pinned messages.
 */
function Indicators({ count, currentIndex }: IndicatorsProps): JSX.Element {
    // We only display a maximum of 3 indicators at one time.
    // When there is more than 3 messages pinned, we will cycle through the indicators

    // If there is only 2 messages pinned, we will display 2 indicators
    // In case of 1 message pinned, the indicators are not displayed, see {@link PinnedMessageBanner} logic.
    const numberOfIndicators = Math.min(count, MAX_INDICATORS);
    // The index of the active indicator
    const index = currentIndex % numberOfIndicators;

    // We hide the indicators when we are on the last cycle and there are less than 3 remaining messages pinned
    const numberOfCycles = Math.ceil(count / numberOfIndicators);
    // If the current index is greater than the last cycle index, we are on the last cycle
    const isLastCycle = currentIndex >= (numberOfCycles - 1) * MAX_INDICATORS;
    // The index of the last message in the last cycle
    const lastCycleIndex = numberOfIndicators - (numberOfCycles * numberOfIndicators - count);

    return (
        <div className="mx_PinnedMessageBanner_Indicators">
            {Array.from({ length: numberOfIndicators }).map((_, i) => (
                <Indicator key={i} active={i === index} hidden={isLastCycle && lastCycleIndex <= i} />
            ))}
        </div>
    );
}

/**
 * The props for the {@link Indicator} component.
 */
interface IndicatorProps {
    /**
     * Whether the indicator is active
     */
    active: boolean;
    /**
     * Whether the indicator is hidden
     */
    hidden: boolean;
}

/**
 * A component that displays a vertical indicator for a pinned message.
 */
function Indicator({ active, hidden }: IndicatorProps): JSX.Element {
    return (
        <div
            data-testid="banner-indicator"
            className={classNames("mx_PinnedMessageBanner_Indicator", {
                "mx_PinnedMessageBanner_Indicator--active": active,
                "mx_PinnedMessageBanner_Indicator--hidden": hidden,
            })}
        />
    );
}

function getRightPanelPhase(roomId: string): RightPanelPhases | null {
    if (!RightPanelStore.instance.isOpenForRoom(roomId)) return null;
    return RightPanelStore.instance.currentCard.phase;
}

/**
 * The props for the {@link BannerButton} component.
 */
interface BannerButtonProps {
    /**
     * The room where the banner is displayed
     */
    room: Room;
}

/**
 * A button that allows the user to view or close the list of pinned messages.
 */
function BannerButton({ room }: BannerButtonProps): JSX.Element {
    const [currentPhase, setCurrentPhase] = useState<RightPanelPhases | null>(getRightPanelPhase(room.roomId));
    useEventEmitter(RightPanelStore.instance, UPDATE_EVENT, () => setCurrentPhase(getRightPanelPhase(room.roomId)));
    const isPinnedMessagesPhase = currentPhase === RightPanelPhases.PinnedMessages;

    return (
        <Button
            className="mx_PinnedMessageBanner_actions"
            kind="tertiary"
            onClick={() => {
                RightPanelStore.instance.showOrHidePhase(RightPanelPhases.PinnedMessages);
            }}
        >
            {isPinnedMessagesPhase
                ? _t("room|pinned_message_banner|button_close_list")
                : _t("room|pinned_message_banner|button_view_all")}
        </Button>
    );
}
