/*
Copyright 2023 The Matrix.org Foundation C.I.C.

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

import React, { useCallback } from "react";
import { Body as BodyText, IconButton } from "@vector-im/compound-web";
import { Icon as VideoCallIcon } from "@vector-im/compound-design-tokens/icons/video-call.svg";
import { Icon as VoiceCallIcon } from "@vector-im/compound-design-tokens/icons/voice-call.svg";
import { CallType } from "matrix-js-sdk/src/webrtc/call";

import type { Room } from "matrix-js-sdk/src/matrix";
import { _t } from "../../../languageHandler";
import { useRoomName } from "../../../hooks/useRoomName";
import DecoratedRoomAvatar from "../avatars/DecoratedRoomAvatar";
import { RightPanelPhases } from "../../../stores/right-panel/RightPanelStorePhases";
import RightPanelStore from "../../../stores/right-panel/RightPanelStore";
import { useTopic } from "../../../hooks/room/useTopic";
import { Flex } from "../../utils/Flex";
import { Box } from "../../utils/Box";
import { useRoomCallStatus } from "../../../hooks/room/useRoomCallStatus";
import LegacyCallHandler from "../../../LegacyCallHandler";
import defaultDispatcher from "../../../dispatcher/dispatcher";
import { ViewRoomPayload } from "../../../dispatcher/payloads/ViewRoomPayload";
import { Action } from "../../../dispatcher/actions";

export default function RoomHeader({ room }: { room: Room }): JSX.Element {
    const roomName = useRoomName(room);
    const roomTopic = useTopic(room);

    const { voiceCallDisabledReason, voiceCallType, videoCallDisabledReason, videoCallType } = useRoomCallStatus(room);

    const placeCall = useCallback(
        async (callType: CallType, platformCallType: typeof voiceCallType) => {
            switch (platformCallType) {
                case "legacy_or_jitsi":
                    await LegacyCallHandler.instance.placeCall(room.roomId, callType);
                    break;
                // TODO: Remove the jitsi_or_element_call case and
                // use the commented code below
                case "element_call":
                case "jitsi_or_element_call":
                    defaultDispatcher.dispatch<ViewRoomPayload>({
                        action: Action.ViewRoom,
                        room_id: room.roomId,
                        view_call: true,
                        metricsTrigger: undefined,
                    });
                    break;

                // case "jitsi_or_element_call":
                // TODO: Open dropdown menu to choice between
                // EC and Jitsi. Waiting on Compound's dropdown
                // component
                // break;
            }
        },
        [room.roomId],
    );

    return (
        <Flex
            as="header"
            align="center"
            gap="var(--cpd-space-3x)"
            className="mx_RoomHeader light-panel"
            onClick={() => {
                const rightPanel = RightPanelStore.instance;
                rightPanel.isOpen
                    ? rightPanel.togglePanel(null)
                    : rightPanel.setCard({ phase: RightPanelPhases.RoomSummary });
            }}
        >
            <DecoratedRoomAvatar room={room} avatarSize={40} displayBadge={false} />
            <Box flex="1" className="mx_RoomHeader_info">
                <BodyText
                    as="div"
                    size="lg"
                    weight="semibold"
                    dir="auto"
                    title={roomName}
                    role="heading"
                    aria-level={1}
                >
                    {roomName}
                </BodyText>
                {roomTopic && (
                    <BodyText as="div" size="sm" className="mx_RoomHeader_topic">
                        {roomTopic.text}
                    </BodyText>
                )}
            </Box>
            <Flex as="nav" align="center" gap="var(--cpd-space-2x)">
                <IconButton
                    disabled={!!voiceCallDisabledReason}
                    title={!voiceCallDisabledReason ? _t("Voice call") : voiceCallDisabledReason!}
                    onClick={async (ev) => {
                        ev.preventDefault();
                        placeCall(CallType.Voice, voiceCallType);
                    }}
                >
                    <VoiceCallIcon />
                </IconButton>
                <IconButton
                    disabled={!!videoCallDisabledReason}
                    title={!videoCallDisabledReason ? _t("Video call") : videoCallDisabledReason!}
                    onClick={(ev) => {
                        ev.preventDefault();
                        placeCall(CallType.Video, videoCallType);
                    }}
                >
                    <VideoCallIcon />
                </IconButton>
            </Flex>
        </Flex>
    );
}
