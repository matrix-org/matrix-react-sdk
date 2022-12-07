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

import React, { MouseEvent } from "react";
import { Room } from "matrix-js-sdk/src/matrix";
import classNames from "classnames";

import { LiveBadge, VoiceBroadcastLiveness } from "../..";
import { Icon as LiveIcon } from "../../../../res/img/element-icons/live.svg";
import { Icon as MicrophoneIcon } from "../../../../res/img/voip/call-view/mic-on.svg";
import { Icon as TimerIcon } from "../../../../res/img/element-icons/Timer.svg";
import { _t } from "../../../languageHandler";
import RoomAvatar from "../../../components/views/avatars/RoomAvatar";
import AccessibleButton from "../../../components/views/elements/AccessibleButton";
import { Icon as XIcon } from "../../../../res/img/element-icons/cancel-rounded.svg";
import Clock from "../../../components/views/audio_messages/Clock";
import { formatTimeLeft } from "../../../DateUtils";
import Spinner from "../../../components/views/elements/Spinner";
import { ViewRoomPayload } from "../../../dispatcher/payloads/ViewRoomPayload";
import { Action } from "../../../dispatcher/actions";
import dis from '../../../dispatcher/dispatcher';

interface VoiceBroadcastHeaderProps {
    linkToRoom?: boolean;
    live?: VoiceBroadcastLiveness;
    onCloseClick?: () => void;
    onMicrophoneLineClick?: () => void;
    room: Room;
    microphoneLabel?: string;
    showBroadcast?: boolean;
    showBuffering?: boolean;
    timeLeft?: number;
    showClose?: boolean;
}

export const VoiceBroadcastHeader: React.FC<VoiceBroadcastHeaderProps> = ({
    linkToRoom = false,
    live = "not-live",
    onCloseClick = () => {},
    onMicrophoneLineClick,
    room,
    microphoneLabel,
    showBroadcast = false,
    showBuffering = false,
    showClose = false,
    timeLeft,
}) => {
    const broadcast = showBroadcast && (
        <div className="mx_VoiceBroadcastHeader_line">
            <LiveIcon className="mx_Icon mx_Icon_16" />
            { _t("Voice broadcast") }
        </div>
    );

    const liveBadge = live !== "not-live" && (
        <LiveBadge grey={live === "grey"} />
    );

    const closeButton = showClose && (
        <AccessibleButton onClick={onCloseClick}>
            <XIcon className="mx_Icon mx_Icon_16" />
        </AccessibleButton>
    );

    const timeLeftLine = timeLeft && (
        <div className="mx_VoiceBroadcastHeader_line">
            <TimerIcon className="mx_Icon mx_Icon_16" />
            <Clock formatFn={formatTimeLeft} seconds={timeLeft} />
        </div>
    );

    const buffering = showBuffering && (
        <div className="mx_VoiceBroadcastHeader_line">
            <Spinner w={14} h={14} />
            { _t("Buffering…") }
        </div>
    );

    const microphoneLineClasses = classNames({
        mx_VoiceBroadcastHeader_line: true,
        ["mx_VoiceBroadcastHeader_mic--clickable"]: onMicrophoneLineClick,
    });

    const microphoneLine = microphoneLabel && (
        <div
            className={microphoneLineClasses}
            onClick={onMicrophoneLineClick}
        >
            <MicrophoneIcon className="mx_Icon mx_Icon_16" />
            <span>{ microphoneLabel }</span>
        </div>
    );

    const onRoomAvatarOrNameClick = (event: MouseEvent): void => {
        dis.dispatch<ViewRoomPayload>({
            action: Action.ViewRoom,
            room_id: room.roomId,
            metricsTrigger: undefined, // other
        });
    };

    let roomAvatar = <RoomAvatar room={room} width={32} height={32} />;
    let roomName = <div className="mx_VoiceBroadcastHeader_room">
        { room.name }
    </div>;

    if (linkToRoom) {
        roomAvatar = <AccessibleButton onClick={onRoomAvatarOrNameClick}>
            { roomAvatar }
        </AccessibleButton>;

        roomName = <AccessibleButton onClick={onRoomAvatarOrNameClick}>
            { roomName }
        </AccessibleButton>;
    }

    return <div className="mx_VoiceBroadcastHeader">
        { roomAvatar }
        <div className="mx_VoiceBroadcastHeader_content">
            { roomName }
            { microphoneLine }
            { timeLeftLine }
            { broadcast }
            { buffering }
        </div>
        { liveBadge }
        { closeButton }
    </div>;
};
