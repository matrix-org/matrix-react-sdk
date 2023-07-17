/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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

import React, { ReactElement, useMemo } from "react";
import classNames from "classnames";
import { Room } from "matrix-js-sdk/src/models/room";
import { EventType } from "matrix-js-sdk/src/@types/event";

import { _t } from "../../../languageHandler";
import Dropdown from "../elements/Dropdown";
import SpaceStore from "../../../stores/spaces/SpaceStore";
import RoomAvatar from "../avatars/RoomAvatar";
import { getDisplayAliasForRoom } from "../../../Rooms";
import { NonEmptyArray } from "../../../@types/common";

interface Props {
    title: string;
    space: Room;
    value: Room;
    onChange(space: Room): void;
}

export const SpaceSelectDropdown: React.FC<Props> = ({ title, space, value, onChange }) => {
    const options = useMemo(() => {
        return [
            space,
            ...SpaceStore.instance.getChildSpaces(space.roomId).filter((space) => {
                return space.currentState.maySendStateEvent(EventType.SpaceChild, space.client.getSafeUserId());
            }),
        ];
    }, [space]);

    let body;
    if (options.length > 1) {
        body = (
            <Dropdown
                id="mx_SpaceSelectDropdown"
                className="mx_SpaceSelectDropdown"
                onOptionChange={(key: string) => {
                    onChange(options.find((space) => space.roomId === key) || space);
                }}
                value={value.roomId}
                label={_t("Space selection")}
            >
                {
                    options.map((space) => {
                        const classes = classNames({
                            mx_SubspaceSelector_dropdownOptionActive: space === value,
                        });
                        return (
                            <div key={space.roomId} className={classes}>
                                <RoomAvatar room={space} width={24} height={24} />
                                {space.name || getDisplayAliasForRoom(space) || space.roomId}
                            </div>
                        );
                    }) as NonEmptyArray<ReactElement & { key: string }>
                }
            </Dropdown>
        );
    } else {
        body = (
            <div className="mx_SubspaceSelector_onlySpace">
                {space.name || getDisplayAliasForRoom(space) || space.roomId}
            </div>
        );
    }

    return (
        <div className="mx_SubspaceSelector">
            <RoomAvatar room={value} height={40} width={40} />
            <div>
                <h1>{title}</h1>
                {body}
            </div>
        </div>
    );
};

export default SpaceSelectDropdown;
