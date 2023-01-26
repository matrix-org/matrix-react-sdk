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

import React, { FC, useCallback, useState } from "react";

import { Action } from "../../../dispatcher/actions";
import defaultDispatcher from "../../../dispatcher/dispatcher";
import useFavouriteMessages from "../../../hooks/useFavouriteMessages";
import { _t } from "../../../languageHandler";
import { FavouriteMessagesStore } from "../../../stores/FavouriteMessagesStore";
import RoomAvatar from "../../views/avatars/RoomAvatar";
import AccessibleTooltipButton from "../../views/elements/AccessibleTooltipButton";

interface IProps {
    query: string;
    handleSearchQuery: (query: string) => void;

    // Provide this to use a different store for favourite messages
    // e.g. in tests. If not supplied, we use the global default.
    favouriteMessagesStore?: FavouriteMessagesStore;
}

const FavouriteMessagesHeader: FC<IProps> = ({ query, handleSearchQuery, favouriteMessagesStore }: IProps) => {
    const { getFavouriteMessages } = useFavouriteMessages(favouriteMessagesStore);
    const favouriteMessagesIds = getFavouriteMessages();

    const [isSearchClicked, setSearchClicked] = useState<boolean>(false);

    const onChange = useCallback((e) => handleSearchQuery(e.target.value), [handleSearchQuery]);
    const onCancelClick = useCallback(() => {
        setSearchClicked(false);
        handleSearchQuery("");
    }, [handleSearchQuery, setSearchClicked]);
    const onSearchClick = useCallback(() => setSearchClicked(true), [setSearchClicked]);

    const onClearClick = useCallback(() => {
        if (favouriteMessagesIds.length > 0) {
            defaultDispatcher.dispatch({ action: Action.OpenClearFavourites });
        }
    }, [favouriteMessagesIds]);

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
                    {isSearchClicked ? (
                        <>
                            <input
                                type="text"
                                className="mx_FavMessagesHeader_Search"
                                placeholder="Search..."
                                onChange={onChange}
                                value={query}
                            />
                            <AccessibleTooltipButton
                                className="mx_FavMessagesHeader_cancelButton"
                                onClick={onCancelClick}
                                title={_t("Cancel")}
                                key="cancel"
                            />
                        </>
                    ) : (
                        <AccessibleTooltipButton
                            className="mx_RoomHeader_button mx_RoomHeader_searchButton"
                            onClick={onSearchClick}
                            title={_t("Search")}
                            key="search"
                        />
                    )}
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
