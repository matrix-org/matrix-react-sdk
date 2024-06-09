/*
 *
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
 * /
 */

import React, { JSX, Ref, SyntheticEvent, forwardRef, useContext, useEffect, useState } from "react";
import { EventType, JoinRule, Room } from "matrix-js-sdk/src/matrix";
import { Badge, Heading, IconButton, Link, Text } from "@vector-im/compound-web";
import { Icon as LockIcon } from "@vector-im/compound-design-tokens/icons/lock-solid.svg";
import { Icon as LockOffIcon } from "@vector-im/compound-design-tokens/icons/lock-off.svg";
import { Icon as PublicIcon } from "@vector-im/compound-design-tokens/icons/public.svg";
import { Icon as ErrorIcon } from "@vector-im/compound-design-tokens/icons/error.svg";
import { Icon as ChevronDownIcon } from "@vector-im/compound-design-tokens/icons/chevron-down.svg";
import classNames from "classnames";

import RoomAvatar from "../avatars/RoomAvatar";
import { useRoomName } from "../../../hooks/useRoomName";
import { useRoomState } from "../../../hooks/useRoomState";
import { useAccountData } from "../../../hooks/useAccountData";
import { E2EStatus } from "../../../utils/ShieldUtils";
import { Flex } from "../../utils/Flex";
import { _t } from "../../../languageHandler";
import { useIsEncrypted } from "../../../hooks/useIsEncrypted";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import RoomContext from "../../../contexts/RoomContext";
import defaultDispatcher from "../../../dispatcher/dispatcher";
import { useTopic } from "../../../hooks/room/useTopic";
import { Linkify, topicToHtml } from "../../../HtmlUtils";
import { Box } from "../../utils/Box";
import { onRoomTopicLinkClick } from "../elements/RoomTopic";

interface Props {
    room: Room;
    height: number;
    isDragging: boolean;
}

const RoomTopic: React.FC<Pick<Props, "room">> = ({ room }): JSX.Element | null => {
    const [expanded, setExpanded] = useState(false);

    const topic = useTopic(room);
    const body = topicToHtml(topic?.text, topic?.html);

    const onEditClick = (e: SyntheticEvent): void => {
        e.preventDefault();
        e.stopPropagation();
        defaultDispatcher.dispatch({ action: "open_room_settings" });
    };

    if (!body) {
        return (
            <Flex
                as="section"
                direction="column"
                justify="center"
                gap="var(--cpd-space-2x)"
                className="mx_CommonRoomInformationCard_topic"
            >
                <Box flex="1">
                    <Link kind="primary" onClick={onEditClick}>
                        <Text size="sm" weight="regular">
                            {_t("right_panel|add_topic")}
                        </Text>
                    </Link>
                </Box>
            </Flex>
        );
    }

    const content = expanded ? <Linkify>{body}</Linkify> : body;
    return (
        <Flex
            as="section"
            direction="column"
            justify="center"
            gap="var(--cpd-space-2x)"
            className={classNames("mx_CommonRoomInformationCard_topic", {
                mx_CommonRoomInformationCard_topic_collapsed: !expanded,
            })}
        >
            <Box flex="1" className="mx_CommonRoomInformationCard_topic_container">
                <Text
                    size="sm"
                    weight="regular"
                    onClick={(ev: React.MouseEvent): void => {
                        if (ev.target instanceof HTMLAnchorElement) {
                            onRoomTopicLinkClick(ev);
                            return;
                        }
                        setExpanded(!expanded);
                    }}
                >
                    {content}
                </Text>
                <IconButton
                    className="mx_CommonRoomInformationCard_topic_chevron"
                    size="24px"
                    onClick={() => setExpanded(!expanded)}
                >
                    <ChevronDownIcon />
                </IconButton>
            </Box>
            {expanded && (
                <Box flex="1" className="mx_CommonRoomInformationCard_topic_edit">
                    <Link kind="primary" onClick={onEditClick}>
                        <Text size="sm" weight="regular">
                            {_t("action|edit")}
                        </Text>
                    </Link>
                </Box>
            )}
        </Flex>
    );
};

export const CommonRoomInformationCard = forwardRef(function (
    { room, isDragging, height }: Props,
    ref: Ref<HTMLElement>,
): JSX.Element {
    const name = useRoomName(room);
    const alias = room.getCanonicalAlias() || room.getAltAliases()[0] || "";

    const cli = useContext(MatrixClientContext);
    const isRoomEncrypted = useIsEncrypted(cli, room);
    const roomState = useRoomState(room);
    const roomContext = useContext(RoomContext);
    const e2eStatus = roomContext.e2eStatus;
    const directRoomsList = useAccountData<Record<string, string[]>>(room.client, EventType.Direct);
    const [isDirectMessage, setDirectMessage] = useState(false);
    useEffect(() => {
        for (const [, dmRoomList] of Object.entries(directRoomsList)) {
            if (dmRoomList.includes(room?.roomId ?? "")) {
                setDirectMessage(true);
                break;
            }
        }
    }, [room, directRoomsList]);

    const header = (
        <header
            className={`mx_CommonRoomInformationCard_container ${isDragging ? "dragging" : ""}`}
            ref={ref}
            style={{ height: `${height}px` }}
        >
            <RoomAvatar room={room} size="80px" viewAvatarOnClick />
            <Heading
                as="h1"
                size="md"
                weight="semibold"
                className="mx_CommonRoomInformationCard_roomName text-primary"
                title={name}
            >
                {name}
            </Heading>
            <Text
                as="div"
                size="sm"
                weight="semibold"
                className="mx_CommonRoomInformationCard_alias text-secondary"
                title={alias}
            >
                {alias}
            </Text>

            <Flex
                as="section"
                justify="center"
                gap="var(--cpd-space-2x)"
                className="mx_CommonRoomInformationCard_badges"
            >
                {!isDirectMessage && roomState.getJoinRule() === JoinRule.Public && (
                    <Badge kind="default">
                        <PublicIcon width="1em" />
                        {_t("common|public_room")}
                    </Badge>
                )}

                {isRoomEncrypted && e2eStatus !== E2EStatus.Warning && (
                    <Badge kind="success">
                        <LockIcon width="1em" />
                        {_t("common|encrypted")}
                    </Badge>
                )}

                {!e2eStatus && (
                    <Badge kind="default">
                        <LockOffIcon width="1em" />
                        {_t("common|unencrypted")}
                    </Badge>
                )}

                {e2eStatus === E2EStatus.Warning && (
                    <Badge kind="critical">
                        <ErrorIcon width="1em" />
                        {_t("common|not_trusted")}
                    </Badge>
                )}
            </Flex>
            <RoomTopic room={room} />
        </header>
    );
    return header;
});
