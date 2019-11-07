/*
Copyright 2019 The Matrix.org Foundation C.I.C.

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
import MatrixClientPeg from '../../../MatrixClientPeg';
import {verificationMethods} from 'matrix-js-sdk/lib/crypto';
import sdk from '../../../index';
import Modal from "../../../Modal";
import { _t } from '../../../languageHandler';
import KeyVerificationStateObserver from '../../../utils/KeyVerificationStateObserver';

export default class MKeyVerificationRequest extends React.Component {
    constructor(props) {
        super(props);
        this.keyVerificationState = new KeyVerificationStateObserver(this.props.mxEvent, MatrixClientPeg.get(), () => {
            this.setState(this._copyState());
        });
        this.state = this._copyState();
    }

    _copyState() {
        const {accepted, done, cancelled, cancelPartyUserId, otherPartyUserId} = this.keyVerificationState;
        return {accepted, done, cancelled, cancelPartyUserId, otherPartyUserId};
    }

    componentDidMount() {
        this.keyVerificationState.attach();
    }

    componentWillUnmount() {
        this.keyVerificationState.detach();
    }

    _onAcceptClicked = () => {
        const IncomingSasDialog = sdk.getComponent('views.dialogs.IncomingSasDialog');
        // todo: validate event, for example if it has sas in the methods.
        const verifier = MatrixClientPeg.get().acceptVerificationDM(this.props.mxEvent, verificationMethods.SAS);
        Modal.createTrackedDialog('Incoming Verification', '', IncomingSasDialog, {
            verifier,
        });
    };

    _onRejectClicked = () => {
        // todo: validate event, for example if it has sas in the methods.
        const verifier = MatrixClientPeg.get().acceptVerificationDM(this.props.mxEvent, verificationMethods.SAS);
        verifier.cancel("User declined");
    };

    _getName(userId) {
        const roomId = this.props.mxEvent.getRoomId();
        const client = MatrixClientPeg.get();
        const room = client.getRoom(roomId);
        const member = room.getMember(userId);
        return member ? member.name : userId;
    }

    _userLabel(userId) {
        const name = this._getName(userId);
        if (name !== userId) {
            return _t("%(name)s (%(userId)s)", {name, userId});
        } else {
            return userId;
        }
    }

    _acceptedLabel(userId) {
        const client = MatrixClientPeg.get();
        const myUserId = client.getUserId();
        if (userId === myUserId) {
            return _t("You accepted");
        } else {
            return _t("%(name)s accepted", {name: this._getName(userId)});
        }
    }

    _cancelledLabel(userId) {
        const client = MatrixClientPeg.get();
        const myUserId = client.getUserId();
        if (userId === myUserId) {
            return _t("You cancelled");
        } else {
            return _t("%(name)s cancelled", {name: this._getName(userId)});
        }
    }

    render() {
        const {mxEvent} = this.props;
        const fromUserId = mxEvent.getSender();
        const content = mxEvent.getContent();
        const toUserId = content.to;
        const client = MatrixClientPeg.get();
        const myUserId = client.getUserId();
        const isOwn = fromUserId === myUserId;

        let title;
        let subtitle;
        let stateNode;

        if (this.state.accepted || this.state.cancelled) {
            let stateLabel;
            if (this.state.accepted) {
                stateLabel = this._acceptedLabel(toUserId);
            } else if (this.state.cancelled) {
                stateLabel = this._cancelledLabel(this.state.cancelPartyUserId);
            }
            stateNode = (<div className="mx_KeyVerification_state">{stateLabel}</div>);
        }

        if (toUserId === myUserId) { // request sent to us
            title = (<div className="mx_KeyVerification_title">{
                _t("%(name)s wants to verify", {name: this._getName(fromUserId)})}</div>);
            subtitle = (<div className="mx_KeyVerification_subtitle">{
                this._userLabel(fromUserId)}</div>);
            const isResolved = !(this.state.accepted || this.state.cancelled || this.state.done);
            if (isResolved) {
                const AccessibleButton = sdk.getComponent("elements.AccessibleButton");
                stateNode = (<div className="mx_KeyVerification_buttons">
                    <AccessibleButton kind="decline" onClick={this._onRejectClicked}>{_t("Decline")}</AccessibleButton>
                    <AccessibleButton kind="accept" onClick={this._onAcceptClicked}>{_t("Accept")}</AccessibleButton>
                </div>);
            }
        } else if (isOwn) { // request sent by us
            title = (<div className="mx_KeyVerification_title">{
                _t("You sent a verification request")}</div>);
            subtitle = (<div className="mx_KeyVerification_subtitle">{
                this._userLabel(this.state.otherPartyUserId)}</div>);
        }

        if (title) {
            return (<div className="mx_EventTile_bubble mx_KeyVerification mx_KeyVerification_icon">
                {title}
                {subtitle}
                {stateNode}
            </div>);
        }
        return null;
    }
}

MKeyVerificationRequest.propTypes = {
    /* the MatrixEvent to show */
    mxEvent: PropTypes.object.isRequired,
};
