/*
Copyright 2019-2021 The Matrix.org Foundation C.I.C.

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
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { Room } from "matrix-js-sdk/src/models/room";
import { logger } from "matrix-js-sdk/src/logger";
import { RoomStateEvent } from "matrix-js-sdk/src/models/room-state";
import { EventType } from "matrix-js-sdk/src/@types/event";

import { MatrixClientPeg } from "../../../MatrixClientPeg";
import { _t } from "../../../languageHandler";
import dis from "../../../dispatcher/dispatcher";
import Modal from "../../../Modal";
import { isValid3pidInvite } from "../../../RoomInvite";
import RoomAvatar from "../avatars/RoomAvatar";
import RoomName from "../elements/RoomName";
import ErrorDialog from '../dialogs/ErrorDialog';
import AccessibleButton from '../elements/AccessibleButton';

interface IProps {
    event: MatrixEvent;
}

interface IState {
    stateKey: string;
    roomId: string;
    displayName: string;
    invited: boolean;
    canKick: boolean;
    senderName: string;
}

export default class ThirdPartyMemberInfo extends React.Component<IProps, IState> {
    private room: Room;

    constructor(props) {
        super(props);

        this.room = MatrixClientPeg.get().getRoom(this.props.event.getRoomId());
        const me = this.room.getMember(MatrixClientPeg.get().getUserId());
        const powerLevels = this.room.currentState.getStateEvents("m.room.power_levels", "");

        let kickLevel = powerLevels ? powerLevels.getContent().kick : 50;
        if (typeof(kickLevel) !== 'number') kickLevel = 50;

        const sender = this.room.getMember(this.props.event.getSender());

        this.state = {
            stateKey: this.props.event.getStateKey(),
            roomId: this.props.event.getRoomId(),
            displayName: this.props.event.getContent().display_name,
            invited: true,
            canKick: me ? me.powerLevel > kickLevel : false,
            senderName: sender ? sender.name : this.props.event.getSender(),
        };
    }

    componentDidMount(): void {
        MatrixClientPeg.get().on(RoomStateEvent.Events, this.onRoomStateEvents);
    }

    componentWillUnmount(): void {
        const client = MatrixClientPeg.get();
        if (client) {
            client.removeListener(RoomStateEvent.Events, this.onRoomStateEvents);
        }
    }

    onRoomStateEvents = (ev: MatrixEvent) => {
        if (ev.getType() === EventType.RoomThirdPartyInvite && ev.getStateKey() === this.state.stateKey) {
            const newDisplayName = ev.getContent().display_name;
            const isInvited = isValid3pidInvite(ev);

            const newState = { invited: isInvited };
            if (newDisplayName) newState['displayName'] = newDisplayName;
            this.setState(newState);
        }
    };

    onCancel = () => {
        dis.dispatch({
            action: "view_3pid_invite",
            event: null,
        });
    };

    onKickClick = () => {
        MatrixClientPeg.get().sendStateEvent(this.state.roomId, "m.room.third_party_invite", {}, this.state.stateKey)
            .catch((err) => {
                logger.error(err);

                // Revert echo because of error
                this.setState({ invited: true });

                Modal.createDialog(ErrorDialog, {
                    title: _t("Failed to revoke invite"),
                    description: _t(
                        "Could not revoke the invite. The server may be experiencing a temporary problem or " +
                        "you do not have sufficient permissions to revoke the invite.",
                    ),
                });
            });

        // Local echo
        this.setState({ invited: false });
    };

    render() {
        let adminTools = null;
        if (this.state.canKick && this.state.invited) {
            adminTools = (
                <div className="mx_MemberInfo_container">
                    <h3>{ _t("Admin Tools") }</h3>
                    <div className="mx_MemberInfo_buttons">
                        <AccessibleButton className="mx_MemberInfo_field" onClick={this.onKickClick}>
                            { _t("Revoke invite") }
                        </AccessibleButton>
                    </div>
                </div>
            );
        }

        let scopeHeader;
        if (this.room.isSpaceRoom()) {
            scopeHeader = <div className="mx_RightPanel_scopeHeader">
                <RoomAvatar room={this.room} height={32} width={32} />
                <RoomName room={this.room} />
            </div>;
        }

        // We shamelessly rip off the MemberInfo styles here.
        return (
            <div className="mx_MemberInfo" role="tabpanel">
                { scopeHeader }
                <div className="mx_MemberInfo_name">
                    <AccessibleButton className="mx_MemberInfo_cancel"
                        onClick={this.onCancel}
                        title={_t('Close')}
                    />
                    <h2>{ this.state.displayName }</h2>
                </div>
                <div className="mx_MemberInfo_container">
                    <div className="mx_MemberInfo_profile">
                        <div className="mx_MemberInfo_profileField">
                            { _t("Invited by %(sender)s", { sender: this.state.senderName }) }
                        </div>
                    </div>
                </div>
                { adminTools }
            </div>
        );
    }
}
