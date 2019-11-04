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
import { _t } from '../../../languageHandler';
import KeyVerificationStateObserver from '../../../utils/KeyVerificationStateObserver';

function userLabel(name, userId) {
    if (name) {
        return _t("%(name)s (%(userId)s)", {name, userId});
    } else {
        return userId;
    }
}

export default class MKeyVerificationConclusion extends React.Component {
    constructor(props) {
        super(props);
        this.keyVerificationState = null;
        this.state = {
            done: false,
            cancelled: false,
        };
        const rel = this.props.mxEvent.getRelation();
        if (rel) {
            const client = MatrixClientPeg.get();
            const room = client.getRoom(this.props.mxEvent.getRoomId());
            const requestEvent = room.findEventById(rel.event_id);
            // console.log("related event for MKeyVerificationConclusion is", requestEvent);
            if (requestEvent) {
                // console.log("requestEvent for MKeyVerificationConclusion", rel.event_id, requestEvent);
                this._createStateObserver(requestEvent, client);
            } else {
                // console.warn("MKeyVerificationConclusion: Did not find my reference event!");
                const findEvent = event => {
                    if (event.getId() === rel.event_id) {
                        // console.log("relation for MKeyVerificationConclusion found now!", event);
                        this._createStateObserver(event, client);
                        room.removeListener("Room.timeline", findEvent);
                    }
                };
                room.on("Room.timeline", findEvent);
            }
        }
    }

    _createStateObserver(requestEvent, client) {
        this.keyVerificationState = new KeyVerificationStateObserver(requestEvent, client, () => {
            this.setState(this._copyState());
        });
        this.state = this._copyState();
    }

    _copyState() {
        const {done, cancelled, otherPartyUserId, cancelPartyUserId} = this.keyVerificationState;
        return {done, cancelled, otherPartyUserId, cancelPartyUserId};
    }

    componentDidMount() {
        if (this.keyVerificationState) {
            this.keyVerificationState.attach();
        }
    }

    componentWillUnmount() {
        if (this.keyVerificationState) {
            this.keyVerificationState.detach();
        }
    }

    render() {
        const {mxEvent} = this.props;
        const client = MatrixClientPeg.get();
        const roomId = mxEvent.getRoomId();
        const room = client.getRoom(roomId);
        const otherMember = room.getMember(this.state.otherPartyUserId);
        const otherName = otherMember && otherMember.name;
        const otherLabel = userLabel(otherName, this.state.otherPartyUserId);

        if (this.state.done) {
            return (<div className="mx_MKeyVerificationConclusion">{
                _t("You have successfully verified %(otherLabel)s.",
                {otherLabel})}</div>);
        } else if (this.state.cancelled) {
            if (this.state.cancelPartyUserId === client.getUserId()) {
                return (<div className="mx_MKeyVerificationConclusion">{
                    _t("You declined the verification request.")}</div>);
            } else if (this.state.cancelPartyUserId === this.state.otherPartyUserId) {
                return (<div className="mx_MKeyVerificationConclusion">{
                    _t("%(otherLabel)s declined the verification request.", {otherLabel})}</div>);
            }
        }
        return null;
    }
}

MKeyVerificationConclusion.propTypes = {
    /* the MatrixEvent to show */
    mxEvent: PropTypes.object.isRequired,
};
