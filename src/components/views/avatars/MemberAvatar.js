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

'use strict';

const React = require('react');
import PropTypes from 'prop-types';
const Avatar = require('../../../Avatar');
const sdk = require("../../../index");
const dispatcher = require("../../../dispatcher");

module.exports = React.createClass({
    displayName: 'MemberAvatar',

    propTypes: {
        member: PropTypes.object,
        fallbackUserId: PropTypes.string,
        width: PropTypes.number,
        height: PropTypes.number,
        resizeMethod: PropTypes.string,
        // The onClick to give the avatar
        onClick: PropTypes.func,
        // Whether the onClick of the avatar should be overriden to dispatch 'view_user'
        viewUserOnClick: PropTypes.bool,
        title: PropTypes.string,
    },

    getDefaultProps: function() {
        return {
            width: 40,
            height: 40,
            resizeMethod: 'crop',
            viewUserOnClick: false,
        };
    },

    getInitialState: function() {
        return this._getState(this.props);
    },

    componentWillReceiveProps: function(nextProps) {
        this.setState(this._getState(nextProps));
    },

    _getState: function(props) {
        if (props.member) {
            return {
                name: props.member.name,
                title: props.title || props.member.userId,
                imageUrl: Avatar.avatarUrlForMember(props.member,
                                             props.width,
                                             props.height,
                                             props.resizeMethod),
            };
        } else if (props.fallbackUserId) {
            return {
                name: props.fallbackUserId,
                title: props.fallbackUserId,
            };
        } else {
            console.error("MemberAvatar called somehow with null member or fallbackUserId");
        }
    },

    render: function() {
        const BaseAvatar = sdk.getComponent("avatars.BaseAvatar");

        let {member, fallbackUserId, onClick, viewUserOnClick, ...otherProps} = this.props;
        const userId = member ? member.userId : fallbackUserId;

        if (viewUserOnClick) {
            onClick = () => {
                dispatcher.dispatch({
                    action: 'view_user',
                    member: this.props.member,
                });
            };
        }

        return (
            <BaseAvatar {...otherProps} name={this.state.name} title={this.state.title}
                idName={userId} url={this.state.imageUrl} onClick={onClick} />
        );
    },
});
