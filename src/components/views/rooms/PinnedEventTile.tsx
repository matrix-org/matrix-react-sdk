/*
Copyright 2017 Travis Ralston
Copyright 2021 The Matrix.org Foundation C.I.C.

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

import React, { JSX, useCallback, useState } from "react";
import { EventTimeline, EventType, MatrixEvent, Room } from "matrix-js-sdk/src/matrix";
import { IconButton, Menu, MenuItem, Separator, Text } from "@vector-im/compound-web";
import { Icon as ViewIcon } from "@vector-im/compound-design-tokens/icons/visibility-on.svg";
import { Icon as UnpinIcon } from "@vector-im/compound-design-tokens/icons/unpin.svg";
import { Icon as ForwardIcon } from "@vector-im/compound-design-tokens/icons/forward.svg";
import { Icon as TriggerIcon } from "@vector-im/compound-design-tokens/icons/overflow-horizontal.svg";
import { Icon as DeleteIcon } from "@vector-im/compound-design-tokens/icons/delete.svg";
import classNames from "classnames";

import dis from "../../../dispatcher/dispatcher";
import { Action } from "../../../dispatcher/actions";
import MessageEvent from "../messages/MessageEvent";
import MemberAvatar from "../avatars/MemberAvatar";
import { _t } from "../../../languageHandler";
import { getUserNameColorClass } from "../../../utils/FormattingUtils";
import { ViewRoomPayload } from "../../../dispatcher/payloads/ViewRoomPayload";
import { RoomPermalinkCreator } from "../../../utils/permalinks/Permalinks";
import { useMatrixClientContext } from "../../../contexts/MatrixClientContext";
import { useRoomState } from "../../../hooks/useRoomState";
import { isContentActionable } from "../../../utils/EventUtils";
import { getForwardableEvent } from "../../../events";
import { OpenForwardDialogPayload } from "../../../dispatcher/payloads/OpenForwardDialogPayload";
import { createRedactEventDialog } from "../dialogs/ConfirmRedactDialog";

const AVATAR_SIZE = "32px";

/**
 * Properties for {@link PinnedEventTile}.
 */
interface PinnedEventTileProps {
    /**
     * The event to display.
     */
    event: MatrixEvent;
    /**
     * The permalink creator to use.
     */
    permalinkCreator: RoomPermalinkCreator;
    /**
     * The room the event is in.
     */
    room: Room;
}

/**
 * A pinned event tile.
 */
export function PinnedEventTile({ event, room, permalinkCreator }: PinnedEventTileProps): JSX.Element {
    const sender = event.getSender();
    if (!sender) {
        throw new Error("Pinned event unexpectedly has no sender");
    }

    return (
        <div className="mx_PinnedEventTile" role="listitem">
            <div>
                <MemberAvatar
                    className="mx_PinnedEventTile_senderAvatar"
                    member={event.sender}
                    size={AVATAR_SIZE}
                    fallbackUserId={sender}
                />
            </div>
            <div className="mx_PinnedEventTile_wrapper">
                <div className="mx_PinnedEventTile_top">
                    <Text
                        weight="semibold"
                        className={classNames("mx_PinnedEventTile_sender", getUserNameColorClass(sender))}
                        as="span"
                    >
                        {event.sender?.name || sender}
                    </Text>
                    <PinMenu event={event} room={room} permalinkCreator={permalinkCreator} />
                </div>
                <MessageEvent
                    mxEvent={event}
                    maxImageHeight={150}
                    onHeightChanged={() => {}} // we need to give this, apparently
                    permalinkCreator={permalinkCreator}
                    replacingEventId={event.replacingEventId()}
                />
            </div>
        </div>
    );
}

/**
 * Properties for {@link PinMenu}.
 */
interface PinMenuProps extends PinnedEventTileProps {}

/**
 * A popover menu with actions on the pinned event
 */
function PinMenu({ event, room, permalinkCreator }: PinMenuProps): JSX.Element {
    const [open, setOpen] = useState(false);
    const matrixClient = useMatrixClientContext();

    /**
     * View the event in the timeline.
     */
    const onViewInTimeline = useCallback(() => {
        dis.dispatch<ViewRoomPayload>({
            action: Action.ViewRoom,
            event_id: event.getId(),
            highlighted: true,
            room_id: event.getRoomId(),
            metricsTrigger: undefined, // room doesn't change
        });
    }, [event]);

    /**
     * Whether the client can unpin the event.
     * Pin and unpin are using the same permission.
     */
    const canUnpin = useRoomState(room, (state) =>
        state.mayClientSendStateEvent(EventType.RoomPinnedEvents, matrixClient),
    );

    /**
     * Unpin the event.
     * @param event
     */
    const onUnpin = useCallback(async (): Promise<void> => {
        const pinnedEvents = room
            .getLiveTimeline()
            .getState(EventTimeline.FORWARDS)
            ?.getStateEvents(EventType.RoomPinnedEvents, "");
        if (pinnedEvents?.getContent()?.pinned) {
            const pinned = pinnedEvents.getContent().pinned;
            const index = pinned.indexOf(event.getId());
            if (index !== -1) {
                pinned.splice(index, 1);
                await matrixClient.sendStateEvent(room.roomId, EventType.RoomPinnedEvents, { pinned }, "");
            }
        }
    }, [event, room, matrixClient]);

    const contentActionable = isContentActionable(event);
    // Get the forwardable event for the given event
    const forwardableEvent = contentActionable && getForwardableEvent(event, matrixClient);
    /**
     * Open the forward dialog.
     */
    const onForward = useCallback(() => {
        if (forwardableEvent) {
            dis.dispatch<OpenForwardDialogPayload>({
                action: Action.OpenForwardDialog,
                event: forwardableEvent,
                permalinkCreator: permalinkCreator,
            });
        }
    }, [forwardableEvent, permalinkCreator]);

    /**
     * Whether the client can redact the event.
     */
    const canRedact =
        room
            .getLiveTimeline()
            .getState(EventTimeline.FORWARDS)
            ?.maySendRedactionForEvent(event, matrixClient.getSafeUserId()) &&
        event.getType() !== EventType.RoomServerAcl &&
        event.getType() !== EventType.RoomEncryption;

    /**
     * Redact the event.
     */
    const onRedact = useCallback(
        (): void =>
            createRedactEventDialog({
                mxEvent: event,
            }),
        [event],
    );

    return (
        <Menu
            open={open}
            onOpenChange={setOpen}
            showTitle={false}
            title={_t("right_panel|pinned_messages|menu")}
            side="right"
            align="start"
            trigger={
                <IconButton size="24px" aria-label={_t("right_panel|pinned_messages|menu")}>
                    <TriggerIcon />
                </IconButton>
            }
        >
            <MenuItem Icon={ViewIcon} label={_t("right_panel|pinned_messages|view")} onSelect={onViewInTimeline} />
            {canUnpin && <MenuItem Icon={UnpinIcon} label={_t("action|unpin")} onSelect={onUnpin} />}
            {forwardableEvent && <MenuItem Icon={ForwardIcon} label={_t("action|forward")} onSelect={onForward} />}
            {canRedact && (
                <>
                    <Separator />
                    <MenuItem kind="critical" Icon={DeleteIcon} label={_t("action|delete")} onSelect={onRedact} />
                </>
            )}
        </Menu>
    );
}
