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

import React from "react";
import { MatrixEvent, Room, RoomStateEvent, EventType } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import { MatrixClientPeg } from "../../../MatrixClientPeg";
import { _t } from "../../../languageHandler";
import dis from "../../../dispatcher/dispatcher";
import Modal from "../../../Modal";
import { isValid3pidInvite } from "../../../RoomInvite";
import RoomAvatar from "../avatars/RoomAvatar";
import RoomName from "../elements/RoomName";
import ErrorDialog from "../dialogs/ErrorDialog";
import AccessibleButton from "../elements/AccessibleButton";

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
    private readonly room: Room | null;

    public constructor(props: IProps) {
        super(props);

        this.room = MatrixClientPeg.safeGet().getRoom(this.props.event.getRoomId());
        const me = this.room?.getMember(MatrixClientPeg.safeGet().getSafeUserId());
        const powerLevels = this.room?.currentState.getStateEvents("m.room.power_levels", "");
        const senderId = this.props.event.getSender()!;

        let kickLevel = powerLevels ? powerLevels.getContent().kick : 50;
        if (typeof kickLevel !== "number") kickLevel = 50;

        const sender = this.room?.getMember(senderId);

        this.state = {
            stateKey: this.props.event.getStateKey()!,
            roomId: this.props.event.getRoomId()!,
            displayName: this.props.event.getContent().display_name,
            invited: true,
            canKick: me ? me.powerLevel > kickLevel : false,
            senderName: sender?.name ?? senderId,
        };
    }

    public componentDidMount(): void {
        MatrixClientPeg.safeGet().on(RoomStateEvent.Events, this.onRoomStateEvents);
    }

    public componentWillUnmount(): void {
        const client = MatrixClientPeg.get();
        if (client) {
            client.removeListener(RoomStateEvent.Events, this.onRoomStateEvents);
        }
    }

    public onRoomStateEvents = (ev: MatrixEvent): void => {
        if (ev.getType() === EventType.RoomThirdPartyInvite && ev.getStateKey() === this.state.stateKey) {
            const newDisplayName = ev.getContent().display_name;
            const isInvited = isValid3pidInvite(ev);

            const newState = { invited: isInvited } as IState;
            if (newDisplayName) newState["displayName"] = newDisplayName;
            this.setState(newState);
        }
    };

    public onCancel = (): void => {
        dis.dispatch({
            action: "view_3pid_invite",
            event: null,
        });
    };

    public onKickClick = (): void => {
        MatrixClientPeg.safeGet()
            .sendStateEvent(this.state.roomId, "m.room.third_party_invite", {}, this.state.stateKey)
            .catch((err) => {
                logger.error(err);

                // Revert echo because of error
                this.setState({ invited: true });

                Modal.createDialog(ErrorDialog, {
                    title: _t("user_info|error_revoke_3pid_invite_title"),
                    description: _t("user_info|error_revoke_3pid_invite_description"),
                });
            });

        // Local echo
        this.setState({ invited: false });
    };

    public render(): React.ReactNode {
        let adminTools: JSX.Element | undefined;
        if (this.state.canKick && this.state.invited) {
            adminTools = (
                <div className="mx_MemberInfo_container">
                    <h3>{_t("user_info|admin_tools_section")}</h3>
                    <AccessibleButton className="mx_MemberInfo_field" onClick={this.onKickClick}>
                        {_t("user_info|revoke_invite")}
                    </AccessibleButton>
                </div>
            );
        }

        let scopeHeader: JSX.Element | undefined;
        if (this.room?.isSpaceRoom()) {
            scopeHeader = (
                <div className="mx_RightPanel_scopeHeader">
                    <RoomAvatar room={this.room} size="32px" />
                    <RoomName room={this.room} />
                </div>
            );
        }

        // We shamelessly rip off the MemberInfo styles here.
        return (
            <div className="mx_MemberInfo" role="tabpanel">
                {scopeHeader}
                <div className="mx_MemberInfo_name">
                    <AccessibleButton
                        className="mx_MemberInfo_cancel"
                        onClick={this.onCancel}
                        title={_t("action|close")}
                    />
                    <h2>{this.state.displayName}</h2>
                </div>
                <div className="mx_MemberInfo_container mx_MemberInfo_container--profile">
                    {_t("user_info|invited_by", { sender: this.state.senderName })}
                </div>
                {adminTools}
            </div>
        );
    }
}
