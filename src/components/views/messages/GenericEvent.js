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
var sdk = require('../../../index');

module.exports = React.createClass({
    displayName: 'GenericEvent',

    statics: {
        needsSenderProfile: function() {
            return true;
        }
    },

    propTypes: {
        /* the MatrixEvent to show */
        mxEvent: React.PropTypes.object.isRequired,

        /* a list of words to highlight */
        highlights: React.PropTypes.array,

        /* link URL for the highlights */
        highlightLink: React.PropTypes.string,

        /* callback called when dynamic content in events are loaded */
        onWidgetLoad: React.PropTypes.func,
    },

    render: function() {
    	var body = "";
    	var event = this.props.mxEvent
    	if (event) {
	    	body = {
    		  "origin_server_ts": event.getTs(),
    		  "sender": event.getSender(),
    		  "event_id": event.getId(),
    		  "age": event.getAge(),
    		  "content": event.getContent(),
    		  "room_id": event.getRoomId()
	    	};
	    	body = JSON.stringify(body, null, 2);
    	}
        return 	<span ref="content" className="mx_MNoticeBody mx_EventTile_content">
        			<h4>{ event.getType() }</h4>
        			<pre>
        				{ body }
        			</pre>
        		</span>;
    }
});
