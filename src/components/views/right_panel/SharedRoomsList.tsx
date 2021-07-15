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

import React from 'react';
import { RecentAlgorithm } from '../../../stores/room-list/algorithms/tag-sorting/RecentAlgorithm';
import { DefaultTagID } from '../../../stores/room-list/models';
import BaseCard from './BaseCard';
import UserInfoSharedRooms from './UserInfoSharedRooms';
import { Room } from "matrix-js-sdk/src/models/room";
import Spinner from "../elements/Spinner";
import TruncatedList from "../elements/TruncatedList";
import UserInfoRoomTile from '../elements/UserInfoRoomTile';
import { _t } from "../../../languageHandler";

interface IProps {
    onClose: () => void;
    userId: string;
}

interface IState {
    rooms?: Room[];
    error: boolean;
}

const TRUNCATE_AT = 30;

/*
 * Component which shows the global notification list using a TimelinePanel
 */
export default class SharedRoomList extends React.PureComponent<IProps, IState> {
    algorithm: RecentAlgorithm;
    constructor(props: IProps) {
        super(props);
        this.state = {
            error: false,
        };
        this.algorithm = new RecentAlgorithm();
    }

    async componentDidMount() {
        try {
            const rooms = await UserInfoSharedRooms.getSharedRoomsForUser(this.props.userId);
            const sortedRooms = await this.algorithm.sortRooms(rooms, DefaultTagID.Untagged);
            this.setState({ rooms: sortedRooms });
        } catch (ex) {
            console.log("Error fetching shared rooms for user", ex);
            this.setState({ error: true });
        }
    }

    private makeRoomTiles() {
        return this.state.rooms.map(r => <UserInfoRoomTile key={r.roomId} room={r} />);
    }

    private renderContent() {
        if (this.state.error) {
            // In theory this shouldn't happen, because the button for this view
            // validates that the client can fetch shared rooms for this user.
            return <p>{ _t("Could not fetch shared rooms for user.") }</p>;
        }
        if (!this.state.rooms) {
            return <Spinner />;
        }
        return <TruncatedList className="mx_SharedRoomList" truncateAt={TRUNCATE_AT}>
            { this.makeRoomTiles() }
        </TruncatedList>;
    }

    render() {
        return <BaseCard
            // We don't know the right refire args for this :(
            // previousPhase={RightPanelPhases.RoomMemberInfo}
            onClose={this.props.onClose}>
            { this.renderContent() }
        </BaseCard>;
    }
}
