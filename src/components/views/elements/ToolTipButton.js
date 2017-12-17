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
import sdk from '../../../index';

module.exports = React.createClass({
    displayName: 'ToolTipButton',

    getInitialState: function() {
        return {
            hover: false,
        };
    },

    onMouseOver: function() {
        this.setState({
            hover: true,
        });
    },

    onMouseOut: function() {
        this.setState({
            hover: false,
        });
    },

    render: function() {
        const RoomTooltip = sdk.getComponent("rooms.RoomTooltip");
        const tip = this.state.hover ? <RoomTooltip
            className="mx_ToolTipButton_container"
            tooltipClassName="mx_ToolTipButton_helpText"
            label={this.props.helpText}
        /> : <div />;
        return (
            <div className="mx_ToolTipButton" onMouseOver={this.onMouseOver} onMouseOut={this.onMouseOut} >
                ?
                { tip }
            </div>
        );
    },
});
