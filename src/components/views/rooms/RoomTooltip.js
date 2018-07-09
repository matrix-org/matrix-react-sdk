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
import ReactDOM from 'react-dom';
import dis from '../../../dispatcher';
import classNames from 'classnames';

const MIN_TOOLTIP_HEIGHT = 25;

module.exports = React.createClass({
    displayName: 'RoomTooltip',

    propTypes: {
        // Class applied to the element used to position the tooltip
        className: React.PropTypes.string.isRequired,
        // Class applied to the tooltip itself
        tooltipClassName: React.PropTypes.string,
        // The tooltip is derived from either the room name or a label
        room: React.PropTypes.object,
        label: React.PropTypes.node,
    },

    // Create a wrapper for the tooltip outside the parent and attach it to the body element
    componentDidMount: function() {
        this.tooltipContainer = document.createElement("div");
        this.tooltipContainer.className = "mx_RoomTileTooltip_wrapper";
        document.body.appendChild(this.tooltipContainer);
        window.addEventListener('scroll', this._renderTooltip, true);

        this.parent = ReactDOM.findDOMNode(this).parentNode;

        this._renderTooltip();
    },

    componentDidUpdate: function() {
        this._renderTooltip();
    },

    // Remove the wrapper element, as the tooltip has finished using it
    componentWillUnmount: function() {
        dis.dispatch({
            action: 'view_tooltip',
            tooltip: null,
            parent: null,
        });

        ReactDOM.unmountComponentAtNode(this.tooltipContainer);
        document.body.removeChild(this.tooltipContainer);
        window.removeEventListener('scroll', this._renderTooltip, true);
    },

    _updatePosition(style) {
        const parentBox = this.parent.getBoundingClientRect();
        let offset = 0;
        if (parentBox.height > MIN_TOOLTIP_HEIGHT) {
            offset = Math.floor((parentBox.height - MIN_TOOLTIP_HEIGHT) / 2);
        }
        style.top = (parentBox.top - 2) + window.pageYOffset + offset;
        style.left = 6 + parentBox.right + window.pageXOffset;
        return style;
    },

    _renderTooltip: function() {
        // Add the parent's position to the tooltips, so it's correctly
        // positioned, also taking into account any window zoom
        // NOTE: The additional 6 pixels for the left position, is to take account of the
        // tooltips chevron
        const parent = ReactDOM.findDOMNode(this).parentNode;
        let style = {};
        style = this._updatePosition(style);
        style.display = "block";

        const tooltipClasses = classNames("mx_RoomTooltip", this.props.tooltipClassName);

        const tooltip = (
            <div className={tooltipClasses} style={style}>
                <div className="mx_RoomTooltip_chevron" />
                { this.props.label }
            </div>
        );

        // Render the tooltip manually, as we wish it not to be rendered within the parent
        this.tooltip = ReactDOM.render(tooltip, this.tooltipContainer);

        // Tell the roomlist about us so it can manipulate us if it wishes
        dis.dispatch({
            action: 'view_tooltip',
            tooltip: this.tooltip,
            parent: parent,
        });
    },

    render: function() {
        // Render a placeholder
        return (
            <div className={this.props.className} >
            </div>
        );
    },
});
