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

var React = require('react');

var MatrixClientPeg = require('../../../MatrixClientPeg');
var sdk = require('../../../index');


var PRESENCE_CLASS = {
    "offline": "mx_EntityTile_offline",
    "online": "mx_EntityTile_online",
    "unavailable": "mx_EntityTile_unavailable"
};

module.exports = React.createClass({
    displayName: 'EntityTile',

    propTypes: {
        name: React.PropTypes.string,
        title: React.PropTypes.string,
        avatarJsx: React.PropTypes.any, // <BaseAvatar />
        className: React.PropTypes.string,
        presenceState: React.PropTypes.string,
        presenceActiveAgo: React.PropTypes.number,
        showInviteButton: React.PropTypes.bool,
        shouldComponentUpdate: React.PropTypes.func,
        onClick: React.PropTypes.func,
        suppressOnHover: React.PropTypes.bool
    },

    getDefaultProps: function() {
        return {
            shouldComponentUpdate: function(nextProps, nextState) { return true; },
            onClick: function() {},
            presenceState: "offline",
            presenceActiveAgo: -1,
            showInviteButton: false,
            suppressOnHover: false
        };
    },

    getInitialState: function() {
        return {
            hover: false
        };
    },

    shouldComponentUpdate: function(nextProps, nextState) {
        if (this.state.hover !== nextState.hover) return true;
        return this.props.shouldComponentUpdate(nextProps, nextState);
    },

    mouseEnter: function(e) {
        this.setState({ 'hover': true });
    },

    mouseLeave: function(e) {
        this.setState({ 'hover': false });
    },

    render: function() {
        var presenceClass = PRESENCE_CLASS[this.props.presenceState] || "mx_EntityTile_offline";
        var mainClassName = "mx_EntityTile ";
        mainClassName += presenceClass + (this.props.className ? (" " + this.props.className) : "");
        var nameEl;

        if (this.state.hover && !this.props.suppressOnHover) {
            mainClassName += " mx_EntityTile_hover";
            var PresenceLabel = sdk.getComponent("rooms.PresenceLabel");
            nameEl = (
                <div className="mx_EntityTile_details">
                    <img className="mx_EntityTile_chevron" src="img/member_chevron.png" width="8" height="12"/>
                    <div className="mx_EntityTile_name_hover">{ this.props.name }</div>
                    <PresenceLabel activeAgo={this.props.presenceActiveAgo}
                        presenceState={this.props.presenceState} />
                </div>
            );
        }
        else {
            nameEl = (
                <div className="mx_EntityTile_name">
                    { this.props.name }
                </div>
            );
        }

        var inviteButton;
        if (this.props.showInviteButton) {
            inviteButton = (
                <div className="mx_EntityTile_invite">
                    <img src="img/plus.svg" width="16" height="16" />
                </div>
            );
        }

        var power;
        var powerLevel = this.props.powerLevel;
        if (powerLevel >= 50 && powerLevel < 99) {
            power = <img src="img/mod.svg" className="mx_EntityTile_power" width="16" height="17" alt="Mod"/>;
        }
        if (powerLevel >= 99) {
            power = <img src="img/admin.svg" className="mx_EntityTile_power" width="16" height="17" alt="Admin"/>;
        }


        var MemberAvatar = sdk.getComponent('avatars.MemberAvatar');
        var BaseAvatar = sdk.getComponent('avatars.BaseAvatar');

        var av = this.props.avatarJsx || <BaseAvatar name={this.props.name} width={36} height={36} />;

        return (
            <div className={mainClassName} title={ this.props.title }
                    onClick={ this.props.onClick } onMouseEnter={ this.mouseEnter }
                    onMouseLeave={ this.mouseLeave }>
                <div className="mx_EntityTile_avatar">
                    { av }
                    { power }
                </div>
                { nameEl }
                { inviteButton }
            </div>
        );
    }
});
