/*
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

import React, { useContext } from 'react';
import { MatrixEvent } from 'matrix-js-sdk/src';
import { Thread } from 'matrix-js-sdk/src/models/thread';

import BaseCard from "../views/right_panel/BaseCard";
import { RightPanelPhases } from "../../stores/RightPanelStorePhases";

import ResizeNotifier from '../../utils/ResizeNotifier';
import EventTile, { TileShape } from '../views/rooms/EventTile';
import MatrixClientContext from '../../contexts/MatrixClientContext';

interface IProps {
    roomId: string;
    onClose: () => void;
    resizeNotifier: ResizeNotifier;
}

export const ThreadPanelItem: React.FC<{event: MatrixEvent}> = ({ event }) => {
    return <>
        <EventTile
            mxEvent={event}
            enableFlair={false}
            showReadReceipts={false}
            as="div"
            tileShape={TileShape.ThreadPanel}
            alwaysShowTimestamps={true}
        />
    </>;
};

const ThreadPanel: React.FC<IProps> = ({ roomId, onClose }) => {
    const mxClient = useContext(MatrixClientContext);
    const room = mxClient.getRoom(roomId);
    const threads = Array.from(room.threads);
    return (
        <BaseCard
            className="mx_ThreadPanel"
            onClose={onClose}
            previousPhase={RightPanelPhases.RoomSummary}
        >
            <div className="mx_ThreadPanel--wrapper">
            { threads.map((thread: Thread) => {
                if (thread.ready) {
                    const event = thread.rootEvent;
                    return <ThreadPanelItem key={event.getId()} event={event} />;
                }
            }) }
            </div>
        </BaseCard>
    );
};
export default ThreadPanel;
