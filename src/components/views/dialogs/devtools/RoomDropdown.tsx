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

import React, { ReactElement, useState } from "react";
import { Room } from "matrix-js-sdk/src/matrix";

import Dropdown from "../../elements/Dropdown";
import { NonEmptyArray } from "../../../../@types/common";
import { MatrixClientPeg } from "../../../../MatrixClientPeg";
import { _t } from "../../../../languageHandler";

interface Props {
    /** room ID */
    value: string | null;
    /** called on value change with the new value */
    onValueChange: (value: string | null) => void;
}

/**
 * Room dropdown with search by ID or name for using inside developer tools.
 */
export const RoomDropdown: React.FC<Props> = ({ value, onValueChange }) => {
    const [searchQuery, setSearchQuery] = useState<string | null>(null);
    const client = MatrixClientPeg.get();
    let rooms = client.getRooms();
    if (searchQuery) {
        rooms = rooms.filter((room: Room) => {
            return room.roomId.toLowerCase().includes(searchQuery) || room.name.toLowerCase().includes(searchQuery);
        });
    }

    const roomOptions = rooms.map((room) => {
        return (
            <div key={room.roomId}>
                {room.roomId} - {room.name}
            </div>
        );
    }) as NonEmptyArray<ReactElement & { key: string }>;

    return (
        <Dropdown
            id="mx_devtools_room"
            label={_t("Room")}
            onSearchChange={(search) => setSearchQuery(() => search.toLowerCase())}
            onOptionChange={onValueChange}
            searchEnabled={true}
            value={value}
        >
            {roomOptions}
        </Dropdown>
    );
};
