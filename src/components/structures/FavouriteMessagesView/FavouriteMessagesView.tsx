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

import React, { useContext, useEffect, useRef, useState } from 'react';
import { MatrixClient, MatrixEvent, RelationType } from 'matrix-js-sdk/src/matrix';
import { logger } from 'matrix-js-sdk/src/logger';

import { _t } from '../../../languageHandler';
import ScrollPanel from '../ScrollPanel';
import FavouriteMessagesTilesList from './FavouriteMessagesTilesList';
import MatrixClientContext from '../../../contexts/MatrixClientContext';
import { useAsyncMemo } from '../../../hooks/useAsyncMemo';
import FavouriteMessagesHeader from './FavouriteMessagesHeader';
import useFavouriteMessages from '../../../hooks/useFavouriteMessages';
import ResizeNotifier from '../../../utils/ResizeNotifier';

interface IProps {
    resizeNotifier: ResizeNotifier;
}

//temporary container for current messageids after filtering
let temp = JSON.parse(
    localStorage?.getItem("io_element_favouriteMessages")?? "[]") as any[];

let searchQuery: string;

const FavouriteMessagesView = ({ resizeNotifier }: IProps) => {
    const { getFavouriteMessagesIds, isSearchClicked } = useFavouriteMessages();
    const favouriteMessagesIds = getFavouriteMessagesIds();

    const favouriteMessagesPanelRef = useRef<ScrollPanel>();
    const cli = useContext<MatrixClient>(MatrixClientContext);
    const [, setX] = useState<string[]>();

    //not the best solution, temporary implementation till a better approach comes up
    const handleSearchQuery = (query: string) => {
        if (query?.length === 0 || query?.length > 2) {
            temp = favouriteMessagesIds.filter((evtObj) => (
                evtObj.content.body.trim().toLowerCase().includes(query)));
            searchQuery = query;

            //force rerender
            setX([]);
        }
    };

    useEffect(() => {
        if (!isSearchClicked) {
            searchQuery = '';
            temp = favouriteMessagesIds;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSearchClicked]);

    const favouriteMessageEvents = useAsyncMemo(() => {
        const currentFavMessageIds = temp.length < favouriteMessagesIds.length ? temp : favouriteMessagesIds;

        const promises = currentFavMessageIds.map(async (resultObj) => {
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
        favouriteMessagesPanel = (
            <>
                <FavouriteMessagesHeader handleSearchQuery={handleSearchQuery} />
                <h2 className="mx_FavouriteMessages_emptyMarker">{ _t("No Saved Messages") }</h2>
            </>
        );
    } else {
        favouriteMessagesPanel = (
            <React.Fragment>
                <FavouriteMessagesHeader handleSearchQuery={handleSearchQuery} />
                <ScrollPanel
                    ref={favouriteMessagesPanelRef}
                    className="mx_RoomView_searchResultsPanel mx_FavouriteMessages_scrollPanel"
                    resizeNotifier={resizeNotifier}
                >
                    <FavouriteMessagesTilesList favouriteMessageEvents={favouriteMessageEvents} favouriteMessagesPanelRef={favouriteMessagesPanelRef} searchQuery={searchQuery} />
                </ScrollPanel>
            </React.Fragment>
        );
    }

    return (
        <> { favouriteMessagesPanel } </>
    );
};

export default FavouriteMessagesView;
