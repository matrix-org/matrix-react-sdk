/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 Vector Creations Ltd

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

'use strict';

var React = require('react');
var sdk = require('../../../index');
var MatrixClientPeg = require('../../../MatrixClientPeg');

import _t from 'counterpart-riot';

module.exports = React.createClass({
    displayName: 'RoomPreviewBar',

    propTypes: {
        onJoinClick: React.PropTypes.func,
        onRejectClick: React.PropTypes.func,
        onForgetClick: React.PropTypes.func,

        // if inviterName is specified, the preview bar will shown an invite to the room.
        // You should also specify onRejectClick if specifiying inviterName
        inviterName: React.PropTypes.string,

        // If invited by 3rd party invite, the email address the invite was sent to
        invitedEmail: React.PropTypes.string,

        // A standard client/server API error object. If supplied, indicates that the
        // caller was unable to fetch details about the room for the given reason.
        error: React.PropTypes.object,

        canPreview: React.PropTypes.bool,
        spinner: React.PropTypes.bool,
        room: React.PropTypes.object,

        // The alias that was used to access this room, if appropriate
        // If given, this will be how the room is referred to (eg.
        // in error messages).
        roomAlias: React.PropTypes.string,
    },

    getDefaultProps: function() {
        return {
            onJoinClick: function() {},
            canPreview: true,
        };
    },

    getInitialState: function() {
        return {
            busy: false
        };
    },

    componentWillMount: function() {
        // If this is an invite and we've been told what email
        // address was invited, fetch the user's list of 3pids
        // so we can check them against the one that was invited
        if (this.props.inviterName && this.props.invitedEmail) {
            this.setState({busy: true});
            MatrixClientPeg.get().lookupThreePid(
                'email', this.props.invitedEmail
            ).finally(() => {
                this.setState({busy: false});
            }).done((result) => {
                this.setState({invitedEmailMxid: result.mxid});
            }, (err) => {
                this.setState({threePidFetchError: err});
            });
        }
    },

    _roomNameElement: function(fallback) {
        fallback = fallback || 'a room';
        const name = this.props.room ? this.props.room.name : (this.props.room_alias || "");
        return name ? { name } : fallback;
    },

    render: function() {
        var joinBlock, previewBlock;

        if (this.props.spinner || this.state.busy) {
            var Spinner = sdk.getComponent("elements.Spinner");
            return (<div className="mx_RoomPreviewBar">
                <Spinner />
            </div>);
        }

        const myMember = this.props.room ? this.props.room.currentState.members[
            MatrixClientPeg.get().credentials.userId
        ] : null;
        const kicked = (
            myMember &&
            myMember.membership == 'leave' &&
            myMember.events.member.getSender() != MatrixClientPeg.get().credentials.userId
        );
        const banned = myMember && myMember.membership == 'ban';

        if (this.props.inviterName) {
            var emailMatchBlock;
            if (this.props.invitedEmail) {
                if (this.state.threePidFetchError) {
                    emailMatchBlock = <div className="error">
                        Unable to ascertain that the address this invite was
                        sent to matches one associated with your account.
                    </div>;
                } else if (this.state.invitedEmailMxid != MatrixClientPeg.get().credentials.userId) {
                    emailMatchBlock =
                        <div className="mx_RoomPreviewBar_warning">
                            <div className="mx_RoomPreviewBar_warningIcon">
                                <img src="img/warning.svg" width="24" height="23" title= "/!\\" alt="/!\\" />
                            </div>
                            <div className="mx_RoomPreviewBar_warningText">
                                This invitation was sent to <b><span className="email">{this.props.invitedEmail}</span></b>, which is not associated with this account.<br/>
                                You may wish to login with a different account, or add this email to this account.
                            </div>
                        </div>;
                }
            }
            // TODO: find a way to respect HTML in counterpart!
            joinBlock = (
                <div>
                    <div className="mx_RoomPreviewBar_invite_text">
                        { _t('You have been invited to join this room by %(inviterName)s', {inviterName: this.props.inviterName}) }
                    </div>
                    <div className="mx_RoomPreviewBar_join_text">
                        { _t('Would you like to') } <a onClick={ this.props.onJoinClick }>{ _t('accept') }</a> { _t('or') } <a onClick={ this.props.onRejectClick }>{ _t('decline') }</a> { _t('this invitation?') }
                    </div>
                    {emailMatchBlock}
                </div>
            );

        } else if (kicked || banned) {
            const verb = kicked ? 'kicked' : 'banned';
            const roomName = this._roomNameElement('this room');
            const kickerMember = this.props.room.currentState.getMember(
                myMember.events.member.getSender()
            );
            const kickerName = kickerMember ?
                kickerMember.name : myMember.events.member.getSender();
            let reason;
            if (myMember.events.member.getContent().reason) {
                reason = <div>Reason: {myMember.events.member.getContent().reason}</div>
            }
            let rejoinBlock;
            if (!banned) {
                rejoinBlock = <div><a onClick={ this.props.onJoinClick }><b>Rejoin</b></a></div>;
            }
            joinBlock = (
                <div>
                    <div className="mx_RoomPreviewBar_join_text">
                        You have been {verb} from {roomName} by {kickerName}.<br />
                        {reason}
                        {rejoinBlock}
                        <a onClick={ this.props.onForgetClick }><b>Forget</b></a>
                    </div>
                </div>
            );
        } else if (this.props.error) {
            var name = this.props.roomAlias || "This room";
            var error;
            if (this.props.error.errcode == 'M_NOT_FOUND') {
                error = name + " does not exist";
            } else {
                error = name + " is not accessible at this time";
            }
            joinBlock = (
                <div>
                    <div className="mx_RoomPreviewBar_join_text">
                        { error }
                    </div>
                </div>
            );
        } else {
            const name = this._roomNameElement();
            joinBlock = (
                <div>
                    <div className="mx_RoomPreviewBar_join_text">
                        { _t('You are trying to access %(roomName)s', {roomName: name}) }.<br/>
                        <a onClick={ this.props.onJoinClick }><b>{ _t('Click here') }</b></a> { _t('to join the discussion') }!
                    </div>
                </div>
            );
        }

        if (this.props.canPreview) {
            previewBlock = (
                <div className="mx_RoomPreviewBar_preview_text">
                    { _t('This is a preview of this room. Room interactions have been disabled') }.
                </div>
            );
        }

        return (
            <div className="mx_RoomPreviewBar">
                <div className="mx_RoomPreviewBar_wrapper">
                    { joinBlock }
                    { previewBlock }
                </div>
            </div>
        );
    }
});
