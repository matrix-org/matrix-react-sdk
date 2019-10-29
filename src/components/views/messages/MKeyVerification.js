/*
Copyright 2015, 2016 OpenMarket Ltd

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
import createReactClass from 'create-react-class';
import MatrixClientPeg from '../../../MatrixClientPeg';
import {verificationMethods} from 'matrix-js-sdk/lib/crypto';
import sdk from '../../../index';
import Modal from "../../../Modal";
import { _t } from '../../../languageHandler';

function userLabel(name, userId) {
    if (name) {
        return _t("%(name)s (%(userId)s)", {name, userId});
    } else {
        return userId;
    }
}

export default class MKeyVerification extends React.Component {
    constructor(props) {
        super(props);
        this.state = this._calculateVerificationRequestState();
    }

    componentDidMount() {
        this.props.mxEvent.on("Event.relationsCreated", this._onRelationsCreated);
    }

    _onRelationsCreated = (relationType, eventType) => {
        if (relationType !== "m.reference") {
            return;
        }
        if (
            eventType !== "m.key.verification.start" &&
            eventType !== "m.key.verification.cancel" &&
            eventType !== "m.key.verification.done"
        ) {
            return;
        }

        this.setState(this._calculateVerificationRequestState());

        const {mxEvent} = this.props;
        const client = MatrixClientPeg.get();
        const roomId = mxEvent.getRoomId();
        const room = client.getRoom(roomId);
        const relations = room.getUnfilteredTimelineSet()
            .getRelationsForEvent(mxEvent.getId(), relationType, eventType);

        relations.on("Relations.add", this._onRelationsUpdated);
        relations.on("Relations.remove", this._onRelationsUpdated);
        relations.on("Relations.redaction", this._onRelationsUpdated);
    };

    _onRelationsUpdated = (event) => {
        this.setState(this._calculateVerificationRequestState());
    };

    componentWillUnmount() {
        const {mxEvent} = this.props;
        const client = MatrixClientPeg.get();
        const roomId = mxEvent.getRoomId();
        const room = client.getRoom(roomId);

        for (const phaseName of ["start", "cancel", "done"]) {
            const relations = room.getUnfilteredTimelineSet()
                .getRelationsForEvent(mxEvent.getId(), "m.reference", `m.key.verification.${phaseName}`);
            if (relations) {
                relations.removeListener("Relations.add", this._onRelationsUpdated);
                relations.removeListener("Relations.remove", this._onRelationsUpdated);
                relations.removeListener("Relations.redaction", this._onRelationsUpdated);
            }
        }
        mxEvent.removeListener("Event.relationsCreated", this._onRelationsCreated);
    }

    _calculateVerificationRequestState() {
        const {mxEvent} = this.props;
        const client = MatrixClientPeg.get();
        const roomId = mxEvent.getRoomId();
        const room = client.getRoom(roomId);
        const timelineSet = room.getUnfilteredTimelineSet();
        const fromUserId = mxEvent.getSender();
        const content = mxEvent.getContent();
        const toUserId = content.to;

        let cancelled = false;
        let finished = false;
        let accepted = false;

        const startRelations = timelineSet.getRelationsForEvent(
            mxEvent.getId(), "m.reference", "m.key.verification.start");
        if (startRelations) {
            for (const startEvent of startRelations.getRelations()) {
                if (startEvent.getSender() === toUserId) {
                    accepted = true;
                }
            }
        }

        const doneRelations = timelineSet.getRelationsForEvent(
            mxEvent.getId(), "m.reference", "m.key.verification.done");
        if (doneRelations) {
            let senderDone = false;
            let receiverDone = false;
            for (const doneEvent of doneRelations.getRelations()) {
                if (doneEvent.getSender() === toUserId) {
                    receiverDone = true;
                } else if (doneEvent.getSender() === fromUserId) {
                    senderDone = true;
                }
            }
            if (senderDone && receiverDone) {
                finished = true;
            }
        }

        if (!finished) {
            const cancelRelations = timelineSet.getRelationsForEvent(
                mxEvent.getId(), "m.reference", "m.key.verification.cancel");

            if (cancelRelations) {
                for (const cancelEvent of cancelRelations.getRelations()) {
                    if (cancelEvent.getSender() === toUserId) {
                        cancelled = true;
                    }
                }
            }
        }

        return {finished, cancelled, accepted};
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

        if (this.state.finished) {
            const otherLabel = myUserId === fromUserId ? toLabel : fromLabel;

            return (<div>{_t("You have successfully verified %(otherLabel)s.",
                {otherLabel})}</div>);
        } else if (this.state.cancelled) {
            if (toUserId === myUserId) {
                return (<div>{_t("You declined the verification request from %(fromLabel)s.",
                    {fromLabel})}</div>);
            } else if (isOwn) {
                return (<div>{_t("%(toLabel)s has declined your verification request.",
                    {toLabel})}</div>);
            }
        } else if (this.state.accepted) {
            if (toUserId === myUserId) {
                return (<div>{_t("You accepted the verification request from %(fromLabel)s, follow the instructions.",
                    {fromLabel})}</div>);
            } else if (isOwn) {
                return (<div>{_t("%(toLabel)s has accepted your verification request, follow the instructions.",
                    {toLabel})}</div>);
            }
        } else {
            if (toUserId === myUserId) {
                return (<div>{_t("%(fromLabel)s wants to verify you. If you expected this, you can <button>start verification</button>.",
                    {fromLabel}, {button: label => <button onClick={this._onAcceptClicked}>{label}</button>})}</div>);
            } else if (isOwn) {
                return (<div>{_t("You sent a verification request to %(toLabel)s",
                    {toLabel})}</div>);
            }
        }
    }
}

MKeyVerification.propTypes = {
    /* the MatrixEvent to show */
    mxEvent: PropTypes.object.isRequired,
};
