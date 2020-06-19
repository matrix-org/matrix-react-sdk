/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017, 2018 New Vector Ltd

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
import PropTypes from 'prop-types';
import { _t } from '../../../languageHandler';
import {MatrixClientPeg} from '../../../MatrixClientPeg';
import * as sdk from '../../../index';
import dis from '../../../dispatcher/dispatcher';
import RoomViewStore from '../../../stores/RoomViewStore';
import { makeRoomPermalink } from '../../../utils/permalinks/Permalinks';
import E2EIcon from './E2EIcon';
import MessageActions from "./MessageActions";
import SettingsStore from "../../../settings/SettingsStore";

function ComposerAvatar(props) {
    const MemberStatusMessageAvatar = sdk.getComponent('avatars.MemberStatusMessageAvatar');
    return <div className="mx_MessageComposer_avatar">
        <MemberStatusMessageAvatar member={props.me} width={24} height={24} />
    </div>;
}

ComposerAvatar.propTypes = {
    me: PropTypes.object.isRequired,
};

export default class MessageComposer extends React.Component {
    constructor(props) {
        super(props);
        this.onInputStateChanged = this.onInputStateChanged.bind(this);
        this._onRoomStateEvents = this._onRoomStateEvents.bind(this);
        this._onRoomViewStoreUpdate = this._onRoomViewStoreUpdate.bind(this);
        this._onTombstoneClick = this._onTombstoneClick.bind(this);
        this.renderPlaceholderText = this.renderPlaceholderText.bind(this);

        this.state = {
            isQuoting: Boolean(RoomViewStore.getQuotingEvent()),
            tombstone: this._getRoomTombstone(),
            canSendMessages: this.props.room.maySendMessage(),
            showCallButtons: SettingsStore.getValue("showCallButtonsInComposer"),
        };
    }

    componentDidMount() {
        MatrixClientPeg.get().on("RoomState.events", this._onRoomStateEvents);
        this._roomStoreToken = RoomViewStore.addListener(this._onRoomViewStoreUpdate);
        this._waitForOwnMember();
    }

    _waitForOwnMember() {
        // if we have the member already, do that
        const me = this.props.room.getMember(MatrixClientPeg.get().getUserId());
        if (me) {
            this.setState({me});
            return;
        }
        // Otherwise, wait for member loading to finish and then update the member for the avatar.
        // The members should already be loading, and loadMembersIfNeeded
        // will return the promise for the existing operation
        this.props.room.loadMembersIfNeeded().then(() => {
            const me = this.props.room.getMember(MatrixClientPeg.get().getUserId());
            this.setState({me});
        });
    }

    componentWillUnmount() {
        if (MatrixClientPeg.get()) {
            MatrixClientPeg.get().removeListener("RoomState.events", this._onRoomStateEvents);
        }
        if (this._roomStoreToken) {
            this._roomStoreToken.remove();
        }
    }

    _onRoomStateEvents(ev, state) {
        if (ev.getRoomId() !== this.props.room.roomId) return;

        if (ev.getType() === 'm.room.tombstone') {
            this.setState({tombstone: this._getRoomTombstone()});
        }
        if (ev.getType() === 'm.room.power_levels') {
            this.setState({canSendMessages: this.props.room.maySendMessage()});
        }
    }

    _getRoomTombstone() {
        return this.props.room.currentState.getStateEvents('m.room.tombstone', '');
    }

    _onRoomViewStoreUpdate() {
        const isQuoting = Boolean(RoomViewStore.getQuotingEvent());
        if (this.state.isQuoting === isQuoting) return;
        this.setState({ isQuoting });
    }

    onInputStateChanged(inputState) {
        // Merge the new input state with old to support partial updates
        inputState = Object.assign({}, this.state.inputState, inputState);
        this.setState({inputState});
    }

    _onTombstoneClick(ev) {
        ev.preventDefault();

        const replacementRoomId = this.state.tombstone.getContent()['replacement_room'];
        const replacementRoom = MatrixClientPeg.get().getRoom(replacementRoomId);
        let createEventId = null;
        if (replacementRoom) {
            const createEvent = replacementRoom.currentState.getStateEvents('m.room.create', '');
            if (createEvent && createEvent.getId()) createEventId = createEvent.getId();
        }

        const viaServers = [this.state.tombstone.getSender().split(':').splice(1).join(':')];
        dis.dispatch({
            action: 'view_room',
            highlighted: true,
            event_id: createEventId,
            room_id: replacementRoomId,
            auto_join: true,

            // Try to join via the server that sent the event. This converts @something:example.org
            // into a server domain by splitting on colons and ignoring the first entry ("@something").
            via_servers: viaServers,
            opts: {
                // These are passed down to the js-sdk's /join call
                viaServers: viaServers,
            },
        });
    }

    renderPlaceholderText() {
        if (this.state.isQuoting) {
            if (this.props.e2eStatus) {
                return _t('Send an encrypted reply…');
            } else {
                return _t('Send a reply…');
            }
        } else {
            if (this.props.e2eStatus) {
                return _t('Send an encrypted message…');
            } else {
                return _t('Send a message…');
            }
        }
    }

    render() {
        const controls = [
            this.state.me ? <ComposerAvatar key="controls_avatar" me={this.state.me} /> : null,
            this.props.e2eStatus ?
                <E2EIcon key="e2eIcon" status={this.props.e2eStatus} className="mx_MessageComposer_e2eIcon" /> :
                null,
        ];

        if (!this.state.tombstone && this.state.canSendMessages) {
            // This also currently includes the call buttons. Really we should
            // check separately for whether we can call, but this is slightly
            // complex because of conference calls.

            const SendMessageComposer = sdk.getComponent("rooms.SendMessageComposer");

            controls.push(
                <SendMessageComposer
                    ref={(c) => this.messageComposerInput = c}
                    key="controls_input"
                    room={this.props.room}
                    placeholder={this.renderPlaceholderText()}
                    permalinkCreator={this.props.permalinkCreator} />,
                <MessageActions
                    key="message_actions"
                    callState={this.props.callState}
                    room={this.props.room}
                    showCallButtons={this.state.showCallButtons} />,
            );
        } else if (this.state.tombstone) {
            const replacementRoomId = this.state.tombstone.getContent()['replacement_room'];

            const continuesLink = replacementRoomId ? (
                <a href={makeRoomPermalink(replacementRoomId)}
                    className="mx_MessageComposer_roomReplaced_link"
                    onClick={this._onTombstoneClick}
                >
                    {_t("The conversation continues here.")}
                </a>
            ) : '';

            controls.push(<div className="mx_MessageComposer_replaced_wrapper" key="room_replaced">
                <div className="mx_MessageComposer_replaced_valign">
                    <img className="mx_MessageComposer_roomReplaced_icon" src={require("../../../../res/img/room_replaced.svg")} />
                    <span className="mx_MessageComposer_roomReplaced_header">
                        {_t("This room has been replaced and is no longer active.")}
                    </span><br />
                    { continuesLink }
                </div>
            </div>);
        } else {
            controls.push(
                <div key="controls_error" className="mx_MessageComposer_noperm_error">
                    { _t('You do not have permission to post to this room') }
                </div>,
            );
        }

        return (
            <div className="mx_MessageComposer mx_GroupLayout">
                <div className="mx_MessageComposer_wrapper">
                    <div className="mx_MessageComposer_row">
                        { controls }
                    </div>
                </div>
            </div>
        );
    }
}

MessageComposer.propTypes = {
    // js-sdk Room object
    room: PropTypes.object.isRequired,

    // string representing the current voip call state
    callState: PropTypes.string,

    // string representing the current room app drawer state
    showApps: PropTypes.bool,
};
