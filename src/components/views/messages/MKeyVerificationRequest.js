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

function userLabel(name, userId) {
    if (name) {
        return _t("%(name)s (%(userId)s)", {name, userId});
    } else {
        return userId;
    }
}

export default class MKeyVerificationRequest extends React.Component {
    constructor(props) {
        super(props);
        this.keyVerificationState = new KeyVerificationStateObserver(this.props.mxEvent, MatrixClientPeg.get(), () => {
            this.setState({
                accepted: this.keyVerificationState.accepted,
                done: this.keyVerificationState.done,
                cancelled: this.keyVerificationState.cancelled,
            });
        });
        this.state = {
            accepted: this.keyVerificationState.accepted,
            done: this.keyVerificationState.done,
            cancelled: this.keyVerificationState.cancelled,
        };
    }

    componentDidMount() {
        this.keyVerificationState.attach();
    }

    componentWillUnmount() {
        this.keyVerificationState.detach();
    }

    // we should only show this tile if we are the sender, or if we are in content.to

    // listen on mxEvent."Event.relationsCreated"
    // listen on relations for adding and removing relations:

    _onAcceptClicked = () => {
        const IncomingSasDialog = sdk.getComponent('views.dialogs.IncomingSasDialog');
        // todo: validate event, for example if it has sas in the methods.
        const verifier = MatrixClientPeg.get().acceptVerificationDM(this.props.mxEvent, verificationMethods.SAS);
        Modal.createTrackedDialog('Incoming Verification', '', IncomingSasDialog, {
            verifier,
        });
    };

    render() {
        const {mxEvent} = this.props;
        const client = MatrixClientPeg.get();
        const myUserId = client.getUserId();
        const roomId = mxEvent.getRoomId();
        const room = client.getRoom(roomId);
        const fromUserId = mxEvent.getSender();
        const fromName = mxEvent.sender && mxEvent.sender.name;
        const fromLabel = userLabel(fromName, fromUserId);
        const content = mxEvent.getContent();
        const toUserId = content.to;
        const toMember = room.getMember(toUserId);
        const toName = toMember && toMember.name;
        const toLabel = userLabel(toName, toUserId);
        const isOwn = fromUserId === myUserId;

        if (toUserId === myUserId) {
            if (this.state.accepted || this.state.cancelled || this.state.done) {
                return (<div>{_t("%(fromLabel)s wants to verify you.", {fromLabel})}</div>);
            } else {
                return (<div>{_t("%(fromLabel)s wants to verify you. If you expected this, you can <button>start verification</button>.",
                    {fromLabel}, {button: label => <button onClick={this._onAcceptClicked}>{label}</button>})}</div>);
            }
        } else if (isOwn) {
            return (<div>{_t("You sent a verification request to %(toLabel)s",
                {toLabel})}</div>);
        }
    }
}

MKeyVerificationRequest.propTypes = {
    /* the MatrixEvent to show */
    mxEvent: PropTypes.object.isRequired,
};
