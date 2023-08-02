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

import React, { useEffect, useState } from "react";
import { Avatar, AvatarStack, Body as BodyText } from "@vector-im/compound-web";

import type { Room } from "matrix-js-sdk/src/models/room";
import { useRoomName } from "../../../hooks/useRoomName";
import DecoratedRoomAvatar from "../avatars/DecoratedRoomAvatar";
import { RightPanelPhases } from "../../../stores/right-panel/RightPanelStorePhases";
import RightPanelStore from "../../../stores/right-panel/RightPanelStore";
import { useTopic } from "../../../hooks/room/useTopic";
import { useAccountData } from "../../../hooks/useAccountData";
import { useMatrixClientContext } from "../../../contexts/MatrixClientContext";
import { EventType } from "matrix-js-sdk/src/matrix";
import { useRoomMemberCount, useRoomMembers } from "../../../hooks/useRoomMembers";
import { mediaFromMxc } from "../../../customisations/Media";
import { _t, getCurrentLanguage } from "../../../languageHandler";

export default function RoomHeader({ room }: { room: Room }): JSX.Element {
    const client = useMatrixClientContext();

    const roomName = useRoomName(room);
    const roomTopic = useTopic(room);

    const directRoomsList = useAccountData<Record<string, string[]>>(client, EventType.Direct);
    const [isDirectMessage, setDirectMessage] = useState(false);

    const members = useRoomMembers(room);
    const memberCount = useRoomMemberCount(room);

    useEffect(() => {
        for (const [, dmRoomList] of Object.entries(directRoomsList)) {
            if (dmRoomList.includes(room?.roomId ?? "")) {
                setDirectMessage(true);
                break;
            }
        }
    }, [room, directRoomsList]);

    function togglePanel(phase: RightPanelPhases): void {
        const rightPanel = RightPanelStore.instance;
        if (rightPanel.isOpen && rightPanel.currentCard.phase === phase) {
            rightPanel.togglePanel(null);
        } else {
            rightPanel.setCard({ phase: phase });
        }
    }

    return (
        <header
            className="mx_RoomHeader light-panel"
            onClick={() => {
                togglePanel(RightPanelPhases.RoomSummary);
            }}
        >
            <DecoratedRoomAvatar room={room} avatarSize={40} displayBadge={false} />
            <div className="mx_RoomHeader_info">
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
            </div>

            {!isDirectMessage && (
                <BodyText
                    as="div"
                    size="sm"
                    weight="medium"
                    className="mx_RoomHeader_members"
                    aria-label={_t("%(count)s members", { count: memberCount })}
                    onClick={(e: React.MouseEvent) => {
                        togglePanel(RightPanelPhases.RoomMemberList);
                        e.stopPropagation();
                    }}
                >
                    <AvatarStack>
                        {members.slice(0, 3).map((member) => {
                            const mxcUrl = member.getMxcAvatarUrl();
                            return (
                                <Avatar
                                    key={member.userId}
                                    id={member.userId}
                                    name={member.name}
                                    src={
                                        mxcUrl
                                            ? mediaFromMxc(mxcUrl, client).getThumbnailOfSourceHttp(32, 32, "crop") ??
                                              undefined
                                            : undefined
                                    }
                                    size="20px"
                                />
                            );
                        })}
                    </AvatarStack>
                    {memberCount.toLocaleString(getCurrentLanguage())}
                </BodyText>
            )}
        </header>
    );
}
