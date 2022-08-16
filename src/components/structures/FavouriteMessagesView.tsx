/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 Vector Creations Ltd
Copyright 2018, 2019 New Vector Ltd
Copyright 2019 - 2022 The Matrix.org Foundation C.I.C.

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

import { MatrixClient, MatrixEvent } from 'matrix-js-sdk/src/matrix';
import React, { useContext, useRef } from 'react';

import MatrixClientContext from '../../contexts/MatrixClientContext';
import { _t } from '../../languageHandler';
import FavouriteMessageTile from '../views/rooms/FavouriteMessageTile';
import ScrollPanel from './ScrollPanel';

function getFavouriteMessagesTiles(cli: MatrixClient, favouriteMessageEvents) {
    const ret = [];
    let lastRoomId: string;

    for (let i = (favouriteMessageEvents?.length || 0) - 1; i >= 0; i--) {
        const timeline = [] as MatrixEvent[];
        const resultObj = favouriteMessageEvents[i];
        const roomId = resultObj.roomId;
        const room = cli.getRoom(roomId);
        const mxEvent = room.findEventById(resultObj.eventId);
        timeline.push(mxEvent);

        if (roomId !== lastRoomId) {
            ret.push(<li key={mxEvent?.getId() + "-room"}>
                <h2>{ _t("Room") }: { room.name }</h2>
            </li>);
            lastRoomId = roomId;
        }

        const resultLink = "#/room/"+roomId+"/"+mxEvent.getId();

        ret.push(
            <FavouriteMessageTile
                key={mxEvent.getId()}
                result={mxEvent}
                resultLink={resultLink}
                timeline={timeline}
            />,
        );
    }
    return ret;
}

let favouriteMessagesPanel;

const FavouriteMessagesView = () => {
    const favouriteMessageEvents= JSON.parse(
        localStorage?.getItem("io_element_favouriteMessages") ?? "[]") as any[];

    const favouriteMessagesPanelRef = useRef<ScrollPanel>();
    const cli = useContext<MatrixClient>(MatrixClientContext);

    if (favouriteMessageEvents?.length === 0) {
        favouriteMessagesPanel = (<h2 className="mx_RoomView_topMarker">{ _t("No Saved Messages") }</h2>);
    } else {
        favouriteMessagesPanel = (
            <ScrollPanel
                ref={favouriteMessagesPanelRef}
                className="mx_RoomView_searchResultsPanel "
            >
                { getFavouriteMessagesTiles(cli, favouriteMessageEvents) }
            </ScrollPanel>
        );
    }

    return (
        <> { favouriteMessagesPanel } </>
    );
};

export default FavouriteMessagesView;
