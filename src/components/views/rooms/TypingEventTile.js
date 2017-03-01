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

module.exports = React.createClass({
    displayName: 'TypingEventTile',

    props: {
        limit: React.PropTypes.number.isRequired,
        room: React.PropTypes.object.isRequired,
        onSizeChanged: React.PropTypes.func.isRequired,
    },

    getInitialState: function() {
        return {
            members: [],
            recentOffMembers: [],
        }
    },

    componentWillMount: function() {
        MatrixClientPeg.get().on("RoomMember.typing", this.onRoomMemberTyping);
        setInterval(() => {
            this.props.onSizeChanged();
        }, 10);
    },

    componentWillUnmount: function() {
        var client = MatrixClientPeg.get();
        if (client) {
            client.removeListener("RoomMember.typing", this.onRoomMemberTyping);
        }
    },

    onRoomMemberTyping: function(ev, member) {
        if (!member.typing && this.state.members.indexOf(member) !== -1) {
            this.setState({
                recentOffMembers: this.state.recentOffMembers.concat(member),
            });
            setTimeout(() => {
                this.setState({
                    recentOffMembers: this.state.recentOffMembers.filter( m => m.userId !== member.userId),
                });
            }, 3000);
        }
        this.setState({
            members: WhoIsTyping.usersTypingApartFromMe(this.props.room),
        }, () => {
            this.props.onSizeChanged();
        });
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
                <div>
                    <EmojiText>{typingString}</EmojiText>
                </div>
            );
        }
        return null;
    },

    render: function() {
        const members = Array.from(new Set(this.state.members.concat(this.state.recentOffMembers)));
        console.info('Rendering',members)
        if (members.length === 0) {
            return (
                <div>
                    {this.props.children}
                </div>
            );
        }

        return (
            <div>
                <div className="mx_animated_event_tile_adding">
                    {this.props.children}
                </div>
                <div className="mx_EventTile mx_EventTile_sending">
                    <span className="mx_RoomStatusBar_typingIndicatorAvatars" style={{position:"absolute", left:"0px"}}>
                        {this._renderAvatars(members, this.props.limit)}
                    </span>
                    <span className="mx_SenderProfile">
                        {this._renderTypingDescription(members, this.props.limit)}
                    </span>
                    <div className="mx_EventTile_line">
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


