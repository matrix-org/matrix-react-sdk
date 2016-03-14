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

var React = require('react');
var sdk = require('../../index');

module.exports = React.createClass({
    displayName: 'Threading',

    _getEventTiles: function() {
        var ret = [];
        for (var eventId = 0; eventId < 100; eventId++) {
            ret.push(<li key={eventId} data-scroll-token={eventId}>event { eventId }</li>);
        }
        return ret;
    },

    render: function() {
        var ScrollPanel = sdk.getComponent("structures.ScrollPanel");

        return(
            <ScrollPanel ref="scrollPanel" className="mx_Threading_messagePanel"
                    onScroll={ this.props.onScroll } 
                    onFillRequest={ this.props.onFillRequest }>
                {this._getEventTiles()}
            </ScrollPanel>
        );
    }
});
