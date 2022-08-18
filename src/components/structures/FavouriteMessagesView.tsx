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

import React, { useContext, useRef } from 'react';
import { MatrixClient, MatrixEvent, RelationType } from 'matrix-js-sdk/src/matrix';
import { logger } from 'matrix-js-sdk/src/logger';

import { _t } from '../../languageHandler';
import ScrollPanel from './ScrollPanel';
import FavouriteMessagesTilesList from './FavouriteMessagesTilesList';
import MatrixClientContext from '../../contexts/MatrixClientContext';
import { useAsyncMemo } from '../../hooks/useAsyncMemo';

const FavouriteMessagesView = () => {
    const favouriteMessagesIds= JSON.parse(
        localStorage?.getItem("io_element_favouriteMessages") ?? "[]") as any[];

    const favouriteMessagesPanelRef = useRef<ScrollPanel>();
    const cli = useContext<MatrixClient>(MatrixClientContext);

    const favouriteMessageEvents = useAsyncMemo(() => {
        const promises = favouriteMessagesIds.map(async (resultObj) => {
            try {
                // Fetch the events and latest edit in parallel
                const [evJson, { events: [edit] }] = await Promise.all([
                    cli.fetchRoomEvent(resultObj.roomId, resultObj.eventId),
                    cli.relations(resultObj.roomId, resultObj.eventId, RelationType.Replace, null, { limit: 1 }),
                ]);
                const event = new MatrixEvent(evJson);
                const roomId = event.getRoomId();
                const room = cli.getRoom(roomId);

                if (event.isEncrypted()) {
                    await cli.decryptEventIfNeeded(event);
                }

                if (event) {
                    // Inject sender information
                    event.sender = room.getMember(event.getSender());

                    // Also inject any edits found
                    if (edit) event.makeReplaced(edit);

                    return event;
                }
            } catch (err) {
                logger.error(err);
            }
            return null;
        });

        return Promise.all(promises);
    }, [cli, favouriteMessagesIds], null);

    let favouriteMessagesPanel;

    if (favouriteMessagesIds?.length === 0) {
        favouriteMessagesPanel = (<h2 className="mx_RoomView_topMarker">{ _t("No Saved Messages") }</h2>);
    } else {
        favouriteMessagesPanel = (
            <>
                { /* <RoomAvatar
                    oobData={{
                        name: "Favourites",
                    }}
                    width={32}
                    height={32}
                    resizeMethod="crop"
                /> */ }
                <ScrollPanel
                    ref={favouriteMessagesPanelRef}
                    className="mx_RoomView_searchResultsPanel "
                >
                    <FavouriteMessagesTilesList favouriteMessageEvents={favouriteMessageEvents} favouriteMessagesPanelRef={favouriteMessagesPanelRef} />
                </ScrollPanel>
            </>
        );
    }

    return (
        <> { favouriteMessagesPanel } </>
    );
};

export default FavouriteMessagesView;
