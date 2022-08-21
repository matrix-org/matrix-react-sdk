/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2019 New Vector Ltd

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

import useFavouriteMessages from '../../../hooks/useFavouriteMessages';
import { _t } from '../../../languageHandler';
import RoomAvatar from '../../views/avatars/RoomAvatar';
import AccessibleTooltipButton from '../../views/elements/AccessibleTooltipButton';
import { Alignment } from '../../views/elements/Tooltip';

const FavouriteMessagesHeader = ({ handleSearchQuery }) => {
    const { sortFavouriteMessages, clearFavouriteMessages } = useFavouriteMessages();

    const [isSearchClicked, setSearchClicked] = useState<boolean>(false);
    const [query, setQuery] = useState<string>();

    useEffect(() => {
        handleSearchQuery(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]);

    return (
        <div className="mx_FavMessagesHeader">
            <div className="mx_FavMessagesHeader_Wrapper">
                <div className="mx_FavMessagesHeader_Wrapper--left">
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
                <div className="mx_FavMessagesHeader_Wrapper--right">
                    { isSearchClicked &&
                    (<input
                        type='text'
                        className="mx_FavMessagesHeader_Search"
                        placeholder='Search...'
                        onChange={(e) => setQuery(e.target.value)}
                    />)
                    }
                    <AccessibleTooltipButton
                        className="mx_RoomHeader_button mx_RoomHeader_searchButton"
                        onClick={() => setSearchClicked(!isSearchClicked)}
                        title={_t("Search")}
                        key="search"
                        alignment={Alignment.Bottom}
                    />
                    <AccessibleTooltipButton
                        className="mx_RoomHeader_button mx_FavMessagesHeader_sortButton"
                        onClick={() => sortFavouriteMessages()}
                        title={_t("Sort")}
                        key="sort"
                        alignment={Alignment.Bottom}
                    />
                    <AccessibleTooltipButton
                        className="mx_RoomHeader_button mx_FavMessagesHeader_clearAllButton"
                        onClick={() => clearFavouriteMessages()}
                        title={_t("Clear")}
                        key="clear"
                    />
                </div>
            </div>
        </div>
    );
};

export default FavouriteMessagesHeader;
