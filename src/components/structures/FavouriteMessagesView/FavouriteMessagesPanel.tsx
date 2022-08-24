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

import { MatrixClient, MatrixEvent } from 'matrix-js-sdk/src/matrix';
import React, { useRef } from 'react';

import { _t } from '../../../languageHandler';
import ResizeNotifier from '../../../utils/ResizeNotifier';
import ScrollPanel from '../ScrollPanel';
import FavouriteMessagesHeader from './FavouriteMessagesHeader';
import FavouriteMessagesTilesList from './FavouriteMessagesTilesList';

interface IProps{
    favouriteMessageEvents?: MatrixEvent[];
    resizeNotifier?: ResizeNotifier;
    searchQuery?: string;
    handleSearchQuery?: (query: string) => void;
    cli?: MatrixClient;
}

const FavouriteMessagesPanel = (props: IProps) => {
    const favouriteMessagesPanelRef = useRef<ScrollPanel>();
    let favouriteMessagesPanel;

    if (props.favouriteMessageEvents?.length === 0) {
        favouriteMessagesPanel = (
            <>
                <FavouriteMessagesHeader handleSearchQuery={props.handleSearchQuery} />
                <h2 className="mx_FavouriteMessages_emptyMarker">{ _t("No Saved Messages") }</h2>
            </>
        );
    } else {
        favouriteMessagesPanel = (
            <>
                <FavouriteMessagesHeader handleSearchQuery={props.handleSearchQuery} />
                <ScrollPanel
                    ref={favouriteMessagesPanelRef}
                    className="mx_RoomView_searchResultsPanel mx_FavouriteMessages_scrollPanel"
                    resizeNotifier={props.resizeNotifier}
                >
                    <FavouriteMessagesTilesList cli={props.cli} favouriteMessageEvents={props.favouriteMessageEvents} favouriteMessagesPanelRef={favouriteMessagesPanelRef} searchQuery={props.searchQuery} />
                </ScrollPanel>
            </>
        );
    }

    return <>{ favouriteMessagesPanel }</>;
};
export default FavouriteMessagesPanel;

