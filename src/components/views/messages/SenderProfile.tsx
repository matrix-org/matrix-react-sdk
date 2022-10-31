/*
 Copyright 2015, 2016 OpenMarket Ltd

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

import React, { useContext } from 'react';
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { MsgType } from "matrix-js-sdk/src/@types/event";

import MatrixClientContext from "../../../contexts/MatrixClientContext";
import DisambiguatedProfile from "./DisambiguatedProfile";
import RoomContext, { TimelineRenderingType } from '../../../contexts/RoomContext';
import SettingsStore from "../../../settings/SettingsStore";

interface IProps {
    mxEvent: MatrixEvent;
    onClick?(): void;
}

export default function SenderProfile({ mxEvent, onClick }: IProps) {
    const roomContext = useContext(RoomContext);
    const cli = useContext(MatrixClientContext);

    if (mxEvent.getContent().msgtype === MsgType.Emote) {
        return null;
    }

    let member = mxEvent.sender;
    if (SettingsStore.getValue("useOnlyCurrentProfiles")
        || roomContext.timelineRenderingType === TimelineRenderingType.ThreadsList
        || roomContext.timelineRenderingType === TimelineRenderingType.Thread
    ) {
        const room = cli.getRoom(mxEvent.getRoomId());
        if (room) {
            member = room.getMember(mxEvent.getSender());
        }
    }

    return <DisambiguatedProfile
        fallbackName={mxEvent.getSender() ?? ""}
        onClick={onClick}
        member={member}
        colored={true}
        emphasizeDisplayName={true}
    />;
}
