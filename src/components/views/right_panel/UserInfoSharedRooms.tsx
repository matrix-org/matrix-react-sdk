/*
Copyright 2020 The Matrix.org Foundation C.I.C.

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
import { MatrixClientPeg } from '../../../MatrixClientPeg';
import Spinner from "../elements/Spinner";
import RoomTile from "../rooms/RoomTile";
import { _t } from '../../../languageHandler';
import dis from '../../../dispatcher/dispatcher';

interface IProps {
    userId: string;
}

interface IState {
    roomIds?: [];
    error: boolean;
}

export default class UserInfoSharedRooms extends React.PureComponent<IProps, IState> {

    constructor(props: IProps) {
        super(props);

        this.state = {
            error: false,
        };
    }

    async componentDidMount() {
        try {
            const roomIds = await MatrixClientPeg.get()._unstable_getSharedRooms(this.props.userId);
            this.setState({roomIds});
        } catch (ex) {
            console.log(`Failed to get shared rooms for ${this.props.userId}`, ex);
            this.setState({ error: true });
        }
    }

    private onRoomTileClick(roomId) {
        dis.dispatch({
            action: 'view_room',
            show_room_tile: true, // to make sure the room gets scrolled into view
            room_id: roomId,
        });
    }

    private renderRoomTile(roomId) {
        const peg = MatrixClientPeg.get();
        const room = peg.getRoom(roomId);
        if (!room) {
            return <li key={roomId}>{roomId}</li>;
        }
        const tombstone = room.getStateEvents("m.room.tombstone", "");
        if (tombstone) {
            return null;
        }
        return <li key={roomId}>
            <RoomTile
                onClick={this.onRoomTileClick.bind(undefined, [roomId])}
                room={room}
                collapsed={false}
                unread={false}
                highlight={false}
                transparent={true}
                isInvite={false}
                incomingCall={false}
            />
        </li>;
    }

    render(): React.ReactNode {
        let content;
        if (this.state.roomIds && this.state.roomIds.length > 0) {
            content = <ul>
                {this.state.roomIds.map((roomId) => this.renderRoomTile(roomId))}
            </ul>;
        } else if (this.state.roomIds) {
            content = <p> {_t("You share no rooms in common with this user.")} </p>;
        } else if (this.state.error) {
            content = <p> {_t("There was an error fetching shared rooms with this user.")} </p>;
        } else {
            // We're still loading
            content = <Spinner/>;
        }
        return <div className="mx_UserInfoSharedRooms mx_UserInfo_container">
            <h3>{ _t("Shared Rooms") }</h3>
            <ul>
                {content}
            </ul>
        </div>;
    }
}