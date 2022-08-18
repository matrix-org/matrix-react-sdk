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

import React from 'react';

import RoomAvatar from '../../views/avatars/RoomAvatar';

const FavouriteMessagesHeader = () => {
    return (
        <div className="mx_FavMessagesHeader">
            <div className="mx_FavMessagesHeader_Wrapper">
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
        </div>
    );
};

export default FavouriteMessagesHeader;
