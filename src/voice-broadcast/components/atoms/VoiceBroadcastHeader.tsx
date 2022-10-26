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
import { Room, RoomMember } from "matrix-js-sdk/src/matrix";

import { LiveBadge } from "../..";
import { Icon as LiveIcon } from "../../../../res/img/element-icons/live.svg";
import { Icon as MicrophoneIcon } from "../../../../res/img/voip/call-view/mic-on.svg";
import { _t } from "../../../languageHandler";
import RoomAvatar from "../../../components/views/avatars/RoomAvatar";

interface VoiceBroadcastHeaderProps {
    live: boolean;
    sender: RoomMember;
    room: Room;
    showBroadcast?: boolean;
}

export const VoiceBroadcastHeader: React.FC<VoiceBroadcastHeaderProps> = ({
    live,
    sender,
    room,
    showBroadcast = false,
}) => {
    const broadcast = showBroadcast
        ? <div className="mx_VoiceBroadcastHeader_line">
            <LiveIcon className="mx_Icon mx_Icon_16" />
            { _t("Voice broadcast") }
        </div>
        : null;
    const liveBadge = live ? <LiveBadge /> : null;
    return <div className="mx_VoiceBroadcastHeader">
        <RoomAvatar room={room} width={32} height={32} />
        <div className="mx_VoiceBroadcastHeader_content">
            <div className="mx_VoiceBroadcastHeader_room">
                { room.name }
            </div>
            <div className="mx_VoiceBroadcastHeader_line">
                <MicrophoneIcon className="mx_Icon mx_Icon_16" />
                <span>{ sender.name }</span>
            </div>
            { broadcast }
        </div>
        { liveBadge }
    </div>;
};
