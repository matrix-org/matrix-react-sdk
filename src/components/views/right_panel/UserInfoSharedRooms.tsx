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
import { Room } from "matrix-js-sdk/src/models/room";

import { MatrixClientPeg } from '../../../MatrixClientPeg';
import Spinner from "../elements/Spinner";
import { _t } from '../../../languageHandler';
import AccessibleButton from '../../views/elements/AccessibleButton';
import { SetRightPanelPhasePayload } from '../../../dispatcher/payloads/SetRightPanelPhasePayload';
import { defaultDispatcher } from '../../../dispatcher/dispatcher';
import { Action } from '../../../dispatcher/actions';
import { RightPanelPhases } from '../../../stores/RightPanelStorePhases';

interface IProps {
    userId: string;
}

interface IState {
    sharedRoomCount?: number;
    error: boolean;
}

export default class UserInfoSharedRooms extends React.PureComponent<IProps, IState> {
    public static async getSharedRoomsForUser(userId: string): Promise<Room[]> {
        const peg = MatrixClientPeg.get();

        const roomIds = await MatrixClientPeg.get()._unstable_getSharedRooms(userId);
        return roomIds.map(roomId => peg.getRoom(roomId)).filter(room => {
            if (room === null) {
                return false;
            }
            const tombstone = room.currentState.getStateEvents("m.room.tombstone", "");
            if (tombstone) {
                return false;
            }
            return true;
        });
    }

    constructor(props: IProps) {
        super(props);
        this.state = {
            error: false,
        };
    }

    componentDidMount() {
        return this.componentDidUpdate();
    }

    async componentDidUpdate(prevProps?: IProps) {
        if (prevProps && prevProps.userId === this.props.userId) {
            // Nothing to update.
            return;
        }

        // Reset because this is a new user
        this.setState({
            error: false,
            sharedRoomCount: undefined,
        });

        try {
            this.setState({
                sharedRoomCount: (await UserInfoSharedRooms.getSharedRoomsForUser(this.props.userId)).length,
            });
        } catch (ex) {
            console.log(`Failed to get shared rooms for ${this.props.userId}`, ex);
            this.setState({ error: true });
        }
    }

    private onShowClicked = () => {
        defaultDispatcher.dispatch<SetRightPanelPhasePayload>({
            action: Action.SetRightPanelPhase,
            phase: RightPanelPhases.SharedRoomsList,
            userId: this.props.userId,
        });
    };

    render(): React.ReactNode {
        const { sharedRoomCount } = this.state;

        if (this.state.error) {
            return <p>{ _t("There was an error fetching shared rooms with this user.") }</p>;
        } else if (sharedRoomCount === 0) {
            return <p>{ _t("You share no rooms in common with this user.") }</p>;
        } else if (typeof sharedRoomCount === "number") {
            return <AccessibleButton className="mx_BaseCard_Button" onClick={this.onShowClicked}>
                { _t("%(count)s rooms in common", { count: sharedRoomCount }) }
            </AccessibleButton>;
        } else {
            return <Spinner />;
        }
    }
}
