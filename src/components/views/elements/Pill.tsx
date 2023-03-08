/*
Copyright 2017 - 2019, 2021 The Matrix.org Foundation C.I.C.

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

import React, { ReactElement, useState } from "react";
import classNames from "classnames";
import { Room } from "matrix-js-sdk/src/models/room";

import { MatrixClientPeg } from "../../../MatrixClientPeg";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import Tooltip, { Alignment } from "../elements/Tooltip";
import { usePermalink } from "../../../hooks/usePermalink";
import MemberAvatar from "../avatars/MemberAvatar";
import RoomAvatar from "../avatars/RoomAvatar";
import { _t } from "../../../languageHandler";

export enum PillType {
    UserMention = "TYPE_USER_MENTION",
    RoomMention = "TYPE_ROOM_MENTION",
    AtRoomMention = "TYPE_AT_ROOM_MENTION", // '@room' mention
    EventInSameRoom = "TYPE_EVENT_IN_SAME_ROOM",
    EventInOtherRoom = "TYPE_EVENT_IN_OTHER_ROOM",
}

export const pillRoomNotifPos = (text: string): number => {
    return text.indexOf("@room");
};

export const pillRoomNotifLen = (): number => {
    return "@room".length;
};

export interface PillProps {
    // The Type of this Pill. If url is given, this is auto-detected.
    type?: PillType;
    // The URL to pillify (no validation is done)
    url?: string;
    /** Whether the pill is in a message. It will act as a link then. */
    inMessage?: boolean;
    // The room in which this pill is being rendered
    room?: Room;
    // Whether to include an avatar in the pill
    shouldShowPillAvatar?: boolean;
}

export const Pill: React.FC<PillProps> = ({ type: propType, url, inMessage, room, shouldShowPillAvatar }) => {
    const [hover, setHover] = useState(false);
    const { member, onClick, resourceId, targetRoom, text, type } = usePermalink({
        room,
        type: propType,
        url,
    });

    if (!type || !text) {
        return null;
    }

    const classes = classNames("mx_Pill", {
        mx_AtRoomPill: type === PillType.AtRoomMention,
        mx_RoomPill: type === PillType.RoomMention,
        mx_SpacePill: type === "space",
        mx_UserPill: type === PillType.UserMention,
        mx_UserPill_me: resourceId === MatrixClientPeg.get().getUserId(),
        mx_EventPill: type === PillType.EventInOtherRoom || type === PillType.EventInSameRoom,
    });

    const onMouseOver = (): void => {
        setHover(true);
    };

    const onMouseLeave = (): void => {
        setHover(false);
    };

    const tip = hover && resourceId ? <Tooltip label={resourceId} alignment={Alignment.Right} /> : null;
    let content: ReactElement | null = null;

    switch (type) {
        case PillType.EventInOtherRoom:
            {
                const avatar = shouldShowPillAvatar && targetRoom && (
                    <RoomAvatar room={targetRoom} width={16} height={16} aria-hidden="true" />
                );
                content = (
                    <>
                        {_t("Message in")}
                        {avatar || " "}
                        {text}
                    </>
                );
            }
            break;
        case PillType.EventInSameRoom:
            {
                const avatar = shouldShowPillAvatar && member && (
                    <MemberAvatar member={member} width={16} height={16} aria-hidden="true" hideTitle />
                );
                content = (
                    <>
                        {_t("Message from")}
                        {avatar || " "}
                        {text}
                    </>
                );
            }
            break;
        case PillType.AtRoomMention:
        case PillType.RoomMention:
        case "space":
            content = (
                <>
                    {shouldShowPillAvatar && targetRoom && (
                        <RoomAvatar room={targetRoom} width={16} height={16} aria-hidden="true" />
                    )}
                    {text}
                </>
            );
            break;
        case PillType.UserMention:
            content = (
                <>
                    {shouldShowPillAvatar && member && (
                        <MemberAvatar member={member} width={16} height={16} aria-hidden="true" hideTitle />
                    )}
                    {text}
                </>
            );
            break;
        default:
            return null;
    }

    return (
        <bdi>
            <MatrixClientContext.Provider value={MatrixClientPeg.get()}>
                {inMessage && url ? (
                    <a
                        className={classes}
                        href={url}
                        onClick={onClick}
                        onMouseOver={onMouseOver}
                        onMouseLeave={onMouseLeave}
                    >
                        <span className="mx_Pill_content">{content}</span>
                        {tip}
                    </a>
                ) : (
                    <span className={classes} onMouseOver={onMouseOver} onMouseLeave={onMouseLeave}>
                        <span className="mx_Pill_content">{content}</span>
                        {tip}
                    </span>
                )}
            </MatrixClientContext.Provider>
        </bdi>
    );
};
