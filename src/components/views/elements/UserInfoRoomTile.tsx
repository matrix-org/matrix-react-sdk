/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 New Vector Ltd
Copyright 2018 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2019, 2020 The Matrix.org Foundation C.I.C.

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

import React from "react";
import { Room } from "matrix-js-sdk/src/models/room";
import classNames from "classnames";
import AccessibleButton from "../../views/elements/AccessibleButton";
import ActiveRoomObserver from "../../../ActiveRoomObserver";
import { DefaultTagID } from "../../../stores/room-list/models";
import DecoratedRoomAvatar from "../avatars/DecoratedRoomAvatar";
import AccessibleTooltipButton from "../elements/AccessibleTooltipButton";
import dis from '../../../dispatcher/dispatcher';
import { Key } from "../../../Keyboard";

interface IProps {
    room: Room;
}

type PartialDOMRect = Pick<DOMRect, "left" | "bottom">;

interface IState {
    selected: boolean;
    notificationsMenuPosition: PartialDOMRect;
    generalMenuPosition: PartialDOMRect;
    messagePreview?: string;
}

export default class UserInfoRoomTile extends React.PureComponent<IProps, IState> {
    constructor(props: IProps) {
        super(props);

        this.state = {
            selected: ActiveRoomObserver.activeRoomId === this.props.room.roomId,
            notificationsMenuPosition: null,
            generalMenuPosition: null,
        };
    }

    private onTileClick = (ev: React.KeyboardEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        dis.dispatch({
            action: 'view_room',
            show_room_tile: true, // make sure the room is visible in the list
            room_id: this.props.room.roomId,
            clear_search: (ev && (ev.key === Key.ENTER || ev.key === Key.SPACE)),
        });
    };

    public render(): React.ReactElement {
        const classes = classNames({
            'mx_RoomTile': true,
            'mx_RoomTile_selected': this.state.selected,
        });

        const roomAvatar = <DecoratedRoomAvatar
            room={this.props.room}
            avatarSize={32}
            tag={DefaultTagID.Untagged}
            displayBadge={false}
        />;

        let badge: React.ReactNode;

        let name = this.props.room.name;
        if (typeof name !== 'string') name = '';
        name = name.replace(":", ":\u200b"); // add a zero-width space to allow linewrapping after the colon

        const nameContainer = (
            <div className="mx_RoomTile_nameContainer">
                <div title={name} className={"mx_RoomTile_name"} tabIndex={-1} dir="auto">
                    {name}
                </div>
            </div>
        );

        const ariaLabel = name;
        let ariaDescribedBy: string;

        const props: Partial<React.ComponentProps<typeof AccessibleTooltipButton>> = {};
        const Button: React.ComponentType<React.ComponentProps<typeof AccessibleButton>> = AccessibleButton;

        return (
            <>
                <Button
                    {...props}
                    className={classes}
                    onClick={this.onTileClick}
                    role="treeitem"
                    aria-label={ariaLabel}
                    aria-selected={this.state.selected}
                    aria-describedby={ariaDescribedBy}
                >
                    {roomAvatar}
                    {nameContainer}
                    {badge}
                </Button>
            </>
        );
    }
}
