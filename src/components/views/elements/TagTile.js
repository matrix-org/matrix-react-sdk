/*
Copyright 2017 New Vector Ltd.

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
import classNames from 'classnames';
import { MatrixClient } from 'matrix-js-sdk';
import sdk from '../../../index';
import dis from '../../../dispatcher';
import { isOnlyCtrlOrCmdIgnoreShiftKeyEvent } from '../../../Keyboard';

import FlairStore from '../../../stores/FlairStore';

// A class for a child of TagPanel (possibly wrapped in a DNDTagTile) that represents
// a thing to click on for the user to filter the visible rooms in the RoomList to:
//  - Rooms that are part of the group
//  - Direct messages with members of the group
// with the intention that this could be expanded to arbitrary tags in future.
export default React.createClass({
    displayName: 'TagTile',

    propTypes: {
        // A string tag such as "m.favourite" or a group ID such as "+groupid:domain.bla"
        // For now, only group IDs are handled.
        tag: PropTypes.string,
    },

    contextTypes: {
        matrixClient: PropTypes.instanceOf(MatrixClient).isRequired,
    },

    getInitialState() {
        return {
            // Whether the mouse is over the tile
            hover: false,
            // The profile data of the group if this.props.tag is a group ID
            profile: null,
        };
    },

    componentWillMount() {
        this.unmounted = false;
        if (this.props.tag[0] === '+') {
            FlairStore.getGroupProfileCached(
                this.context.matrixClient,
                this.props.tag,
            ).then((profile) => {
                if (this.unmounted) return;
                this.setState({profile});
            }).catch((err) => {
                console.warn('Could not fetch group profile for ' + this.props.tag, err);
            });
        }
    },

    componentWillUnmount() {
        this.unmounted = true;
    },

    onClick: function(e) {
        e.preventDefault();
        e.stopPropagation();
        dis.dispatch({
            action: 'select_tag',
            tag: this.props.tag,
            ctrlOrCmdKey: isOnlyCtrlOrCmdIgnoreShiftKeyEvent(e),
            shiftKey: e.shiftKey,
        });
    },

    onMouseOver: function() {
        this.setState({hover: true});
    },

    onMouseOut: function() {
        this.setState({hover: false});
    },

    render: function() {
        const BaseAvatar = sdk.getComponent('avatars.BaseAvatar');
        const AccessibleButton = sdk.getComponent('elements.AccessibleButton');
        const RoomTooltip = sdk.getComponent('rooms.RoomTooltip');
        const profile = this.state.profile || {};
        const name = profile.name || this.props.tag;
        const avatarHeight = 35;

        const httpUrl = profile.avatarUrl ? this.context.matrixClient.mxcUrlToHttp(
            profile.avatarUrl, avatarHeight, avatarHeight, "crop",
        ) : null;

        const className = classNames({
            mx_TagTile: true,
            mx_TagTile_selected: this.props.selected,
        });

        const tip = this.state.hover ?
            <RoomTooltip className="mx_TagTile_tooltip" label={name} /> :
            <div />;
        return <AccessibleButton className={className} onClick={this.onClick}>
            <div className="mx_TagTile_avatar" onMouseOver={this.onMouseOver} onMouseOut={this.onMouseOut}>
                <BaseAvatar name={name} url={httpUrl} width={avatarHeight} height={avatarHeight} />
                { tip }
            </div>
        </AccessibleButton>;
    },
});
