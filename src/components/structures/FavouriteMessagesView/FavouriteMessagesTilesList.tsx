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
import React, { useContext } from 'react';

import MatrixClientContext from '../../../contexts/MatrixClientContext';
import { _t } from '../../../languageHandler';
import Spinner from '../../views/elements/Spinner';
import FavouriteMessageTile from './FavouriteMessageTile';

interface IProps{
    favouriteMessageEvents: MatrixEvent[];
    favouriteMessagesPanelRef: any;
}

const FavouriteMessagesTilesList = ({ favouriteMessageEvents, favouriteMessagesPanelRef }: IProps) => {
    const ret = [];
    let lastRoomId: string;
    const cli = useContext<MatrixClient>(MatrixClientContext);

    if (!favouriteMessageEvents) {
        ret.push(<Spinner />);
    } else {
        favouriteMessageEvents.reverse().forEach(mxEvent => {
            const timeline = [] as MatrixEvent[];
            const roomId = mxEvent.getRoomId();
            const room = cli.getRoom(roomId);

            timeline.push(mxEvent);

            if (roomId !== lastRoomId) {
                ret.push(<li key={mxEvent.getId() + "-room"}>
                    <h2>{ _t("Room") }: { room.name }</h2>
                </li>);
                lastRoomId = roomId;
            }
            // once dynamic content in the favourite messages panel loads, make the scrollPanel check
            // the scroll offsets.
            const onHeightChanged = () => {
                const scrollPanel = favouriteMessagesPanelRef.current;
                if (scrollPanel) {
                    scrollPanel.checkScroll();
                }
            };

            const resultLink = "#/room/"+roomId+"/"+mxEvent.getId();

            ret.push(
                <FavouriteMessageTile
                    key={mxEvent.getId()}
                    result={mxEvent}
                    resultLink={resultLink}
                    timeline={timeline}
                    onHeightChanged={onHeightChanged}
                />,
            );
        });
    }

    return <>{ ret }</>;
};

export default FavouriteMessagesTilesList;
