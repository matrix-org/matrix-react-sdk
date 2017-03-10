/*
Copyright 2017 Vector Creations Ltd.

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

const React = require('react');

import sdk from '../../../index';
import Matrix from 'matrix-js-sdk';
import WhoIsTyping from '../../../WhoIsTyping';
import MatrixClientPeg from '../../../MatrixClientPeg';
import Velocity from 'velocity-vector';
import classNames from 'classnames';

module.exports = React.createClass({
    displayName: 'TypingEventTile',

    props: {
        limit: React.PropTypes.number.isRequired,
        room: React.PropTypes.object.isRequired,
        recentSender: React.PropTypes.string,
        onSizeChanged: React.PropTypes.func.isRequired,
    },

    getInitialState: function() {
        return {
            members: [],
            messageReceivedRecently: false,
        }
    },

    componentWillMount: function() {
        MatrixClientPeg.get().on("RoomMember.typing", this.onRoomMemberTyping);
        MatrixClientPeg.get().on('Room.timeline', (e) => {
            if (e.getRoomId() !== this.props.room.roomId) {
                return;
            }
            // Hide the ellipsis now that a message has been received, wait a bit before
            // allowing the "new" typing notification to appear by velocity animation
            this.setState({
                messageReceivedRecently: true,
            }, () => {
                setTimeout(() => {
                    // XXX: Set the state after the first frame of animation?
                    this.setState({
                        messageReceivedRecently: false,
                    }, () => {
                        Velocity(this.refs.tile, { maxHeight: 50 },
                            {
                                duration: 200,
                                progress: () => {
                                    // Required to notify the scroll panel to update its
                                    // scroll position
                                    this.props.onSizeChanged();
                                }
                            }
                        );
                    });
                }, 2000);
            })
        });
    },

    componentWillUnmount: function() {
        var client = MatrixClientPeg.get();
        if (client) {
            client.removeListener("RoomMember.typing", this.onRoomMemberTyping);
        }
    },

    onRoomMemberTyping: function(ev, member) {
        const typers = WhoIsTyping.usersTypingApartFromMe(this.props.room);
        setTimeout(()=> {
            this.setState({
                members: typers,
            }, () => {
                this.props.onSizeChanged();
            });
            // If no one is typing now, wait a bit before reflecting that to allow a
            // potentially sent message to arrive and take the position of the ellipsis
        }, typers.length === 0 ? 1000 : 0);
    },

    _renderAvatars: function (members, limit) {
        const MemberAvatar = sdk.getComponent('views.avatars.MemberAvatar');
        let othersCount = 0;
        if (members.length > limit) {
            othersCount = members.length - limit + 1;
            members = members.slice(0, limit - 1);
        }

        const avatars = members.map((member) => {
            return (
                <span key={member.userId} style={{zIndex: 2, position: 'relative'}}>
                    <MemberAvatar
                        member={member}
                        width={30}
                        height={30}
                        resizeMethod="crop"
                    />
                </span>
            );
        });

        if (othersCount > 0) {
            avatars.push(
                <span className="mx_RoomStatusBar_typingIndicatorRemaining" key="others">
                    +{othersCount}
                </span>
            );
        }

        return avatars;
    },

    _renderTypingDescription: function(members, limit) {
        const EmojiText = sdk.getComponent('elements.EmojiText');
        const typingString = WhoIsTyping.whoIsTypingString(members, limit);
        if (typingString) {
            return (
                <EmojiText>{typingString}</EmojiText>
            );
        }
        return null;
    },

    render: function() {
        const members = this.state.messageReceivedRecently ? [] : this.state.members;
        console.info('Just sent: ', this.state.messageReceivedRecently, ' number of members', this.state.members);
        if (members.length === 0) {
            return (
                <div>
                    {this.props.children}
                </div>
            );
        }

        const isContinuation = this.props.recentSender &&
            members[0] && this.props.recentSender === members[0].userId;

        const eventTileClasses = classNames({
            "mx_EventTile": true,
            "mx_EventTile_sending": true,
            "mx_EventTile_continuation": isContinuation,
        });

        return (
            <div>
                <div>
                    {this.props.children}
                </div>
                <div className={ eventTileClasses } ref="tile" style={{'overflow':'hidden'}}>
                    <div className="mx_EventTile_line">
                        {isContinuation ? null : (
                            <span className="mx_RoomStatusBar_typingIndicatorAvatars" style={{position:"absolute", left:"0px"}}>
                                {this._renderAvatars(members, this.props.limit)}
                            </span>)}
                        {isContinuation ? null : (
                            <span className="mx_SenderProfile">
                                {this._renderTypingDescription(members, this.props.limit)}
                            </span>
                        )}
                        <span className="mx_MTextBody mx_EventTile_content">
                            <span className="mx_EventTile_body">
                                ...
                            </span>
                        </span>
                    </div>
                </div>
            </div>
        );
    },
});


