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
import MatrixClientPeg from '../../../MatrixClientPeg';
import dis from '../../../dispatcher';
import { _t } from '../../../languageHandler';

module.exports = React.createClass({
    displayName: 'IncomingCallBox',

    propTypes: {
        incomingCall: PropTypes.object,
    },

    _discardEvent: function(e) {
        e.preventDefault();
        e.stopPropagation();
    },

    onAnswerClick: function(e) {
        dis.dispatch({
            action: 'answer',
            room_id: this.props.incomingCall.roomId,
        });
        e.preventDefault();
        e.stopPropagation();
    },

    onRejectClick: function(e) {
        dis.dispatch({
            action: 'hangup',
            room_id: this.props.incomingCall.roomId,
        });
        e.preventDefault();
        e.stopPropagation();
    },

    render: function() {
        let room = null;
        if (this.props.incomingCall) {
            room = MatrixClientPeg.get().getRoom(this.props.incomingCall.roomId);
        }

        const caller = room ? room.name : _t("unknown caller");

        let incomingCallText = null;
        if (this.props.incomingCall) {
            if (this.props.incomingCall.type === "voice") {
                incomingCallText = _t("Incoming voice call from %(name)s", {name: caller});
            } else if (this.props.incomingCall.type === "video") {
                incomingCallText = _t("Incoming video call from %(name)s", {name: caller});
            } else {
                incomingCallText = _t("Incoming call from %(name)s", {name: caller});
            }
        }

        // Note that we need to discard mousedown events here, otherwise currently (in chrome somewhere
        // 64 < x <= 66) the mousedown event bubbles out of the button and causes a focus toggle on
        // the room list header, which, apart from causing unexpected focus changes, means the buttons
        // don't work because once the focus has changed, they don't get the matching mouseup and therefore
        // don't generate a click event.
        return (
            <div className="mx_IncomingCallBox" id="incomingCallBox">
                <img className="mx_IncomingCallBox_chevron" src="img/chevron-left.png" width="9" height="16" />
                <div className="mx_IncomingCallBox_title">
                    { incomingCallText }
                </div>
                <div className="mx_IncomingCallBox_buttons">
                    <div className="mx_IncomingCallBox_buttons_cell">
                        <div className="mx_IncomingCallBox_buttons_decline" onClick={this.onRejectClick} onMouseDown={this._discardEvent}>
                            { _t("Decline") }
                        </div>
                    </div>
                    <div className="mx_IncomingCallBox_buttons_cell">
                        <div className="mx_IncomingCallBox_buttons_accept" onClick={this.onAnswerClick} onMouseDown={this._discardEvent}>
                            { _t("Accept") }
                        </div>
                    </div>
                </div>
            </div>
        );
    },
});

