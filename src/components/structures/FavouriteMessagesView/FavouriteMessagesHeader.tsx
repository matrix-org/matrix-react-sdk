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

import React, { useEffect, useState } from 'react';

import { Action } from '../../../dispatcher/actions';
import defaultDispatcher from '../../../dispatcher/dispatcher';
import useFavouriteMessages from '../../../hooks/useFavouriteMessages';
import { _t } from '../../../languageHandler';
import RoomAvatar from '../../views/avatars/RoomAvatar';
import AccessibleTooltipButton from '../../views/elements/AccessibleTooltipButton';

const FavouriteMessagesHeader = ({ handleSearchQuery }) => {
    const { reorderFavouriteMessages, setSearchState, getFavouriteMessagesIds } = useFavouriteMessages();
    const favouriteMessagesIds = getFavouriteMessagesIds();

    const [isSearchClicked, setSearchClicked] = useState<boolean>(false);
    const [query, setQuery] = useState<string>();

    useEffect(() => {
        handleSearchQuery(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]);

    useEffect(() => {
        setSearchState(isSearchClicked);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSearchClicked]);

    const onClearClick = () => {
        if (favouriteMessagesIds.length > 0) {
            defaultDispatcher.dispatch({ action: Action.OpenClearModal });
        }
    };

    return (
        <div className="mx_FavMessagesHeader">
            <div className="mx_FavMessagesHeader_Wrapper">
                <div className="mx_FavMessagesHeader_Wrapper_left">
                    <RoomAvatar
                        oobData={{
                            name: "Favourites",
                        }}
                        width={26}
                        height={26}
                        resizeMethod="crop"
                    />
                    <span>Favourite Messages</span>
                </div>
                <div className="mx_FavMessagesHeader_Wrapper_right">
                    { isSearchClicked &&
                    (<input
                        type='text'
                        className="mx_FavMessagesHeader_Search"
                        placeholder='Search...'
                        onChange={(e) => setQuery(e.target.value)}
                    />)
                    }
                    { !isSearchClicked
                        ? <AccessibleTooltipButton
                            className="mx_RoomHeader_button mx_RoomHeader_searchButton"
                            onClick={() => setSearchClicked(!isSearchClicked)}
                            title={_t("Search")}
                            key="search"
                        />
                        : <AccessibleTooltipButton
                            className="mx_FavMessagesHeader_cancelButton"
                            onClick={() => setSearchClicked(!isSearchClicked)}
                            title={_t("Cancel")}
                            key="cancel"
                        />
                    }
                    <AccessibleTooltipButton
                        className="mx_RoomHeader_button mx_FavMessagesHeader_sortButton"
                        onClick={() => reorderFavouriteMessages()}
                        title={_t("Reorder")}
                        key="reorder"
                    />
                    <AccessibleTooltipButton
                        className="mx_RoomHeader_button mx_FavMessagesHeader_clearAllButton"
                        onClick={onClearClick}
                        title={_t("Clear")}
                        key="clear"
                    />
                </div>
            </div>
        </div>
    );
};

export default FavouriteMessagesHeader;
