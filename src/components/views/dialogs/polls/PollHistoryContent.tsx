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

import React, { useContext } from "react";

import { MatrixEvent } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";
import { M_POLL_START } from "matrix-js-sdk/src/@types/polls";

import MatrixClientContext from "../../../../contexts/MatrixClientContext";
import { PollHistoryList } from "./PollHistoryList";
import { _t } from "../../../../languageHandler";
import Heading from "../../typography/Heading";

const usePolls = (roomId: string): MatrixEvent[] => {
    const matrixClient = useContext(MatrixClientContext);
    const room = matrixClient.getRoom(roomId);

    if (!room) {
        throw new Error('Cannot find room');
    }

    // @TODO(kerrya) polls will be actively fetched in PSG-1043
    // for now, just display polls that are in the current timeline
    const timelineEvents = room.getUnfilteredTimelineSet()?.getLiveTimeline()?.getEvents() || [];
    const pollStartEvents = timelineEvents.filter(event => M_POLL_START.matches(event.getType()))
    
    return pollStartEvents;
}

type PollHistoryContentProps = {
    roomId: string;
}
export const PollHistoryContent: React.FC<PollHistoryContentProps> = ({ roomId }) => {
    const pollStartEvents = usePolls(roomId);

    return <div className="mx_PollHistoryContent">
        
        <PollHistoryList pollStartEvents={pollStartEvents} />
        <a>load more</a>
    </div>
}