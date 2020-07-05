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
import Pill from '../../views/elements/Pill';
import SpecPermalinkConstructor from '../../../utils/permalinks/SpecPermalinkConstructor';

interface IProps {
    userId: string;
    compact: boolean;
}

interface IState {
    roomIds?: [];
    error: boolean;
}

const COMPACT_VIEW_SHOW_COUNT = 3;

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
        const tombstone = room.currentState.getStateEvents("m.room.tombstone", "");
        if (tombstone) {
            return null;
        }

        if (this.props.compact) {
            // XXX: This is inefficent as we only render COMPACT_VIEW_SHOW_COUNT rooms at a time, the other pills are wasted.
            const alias = room.getCanonicalAlias();
            if (!alias) {
                // Without an alias, we get ugly room_ids.
                return null;
            }
            return <a href={`#/room/${alias}`}><Pill
                key={roomId}
                type={Pill.TYPE_ROOM_MENTION}
                room={room}
                url={new SpecPermalinkConstructor().forRoom(alias)}
                inMessage={false}
                shouldShowPillAvatar={true}
                isSelected={false}
            /></a>;
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
            content = this.state.roomIds.map((roomId) => this.renderRoomTile(roomId));
        } else if (this.state.roomIds) {
            content = <p> {_t("You share no rooms in common with this user.")} </p>;
        } else if (this.state.error) {
            content = <p> {_t("There was an error fetching shared rooms with this user.")} </p>;
        } else {
            // We're still loading
            content = <Spinner/>;
        }
        
        // Compact view: Show as a single line.
        if (this.props.compact && content.length) {
            if (content.length <= COMPACT_VIEW_SHOW_COUNT) {
                return <p> {_t("You are both participating in <rooms></rooms>", {}, {rooms: content})} </p>   
            } else {
                return <p> {_t("You are both participating in <rooms></rooms> and %(hidden)s more", {
                    hidden: content.length - COMPACT_VIEW_SHOW_COUNT,
                }, {
                    rooms: content.slice(0, COMPACT_VIEW_SHOW_COUNT)
                })}</p>   
            }
        } else if (this.props.compact) {
            return content;
        }
        
        // Normal view: Show as a list with a header
        return <div className="mx_UserInfoSharedRooms mx_UserInfo_container">
            <h3>{ _t("Shared Rooms") }</h3>
            <ul>
                {content}
            </ul>
        </div>;
    }
}