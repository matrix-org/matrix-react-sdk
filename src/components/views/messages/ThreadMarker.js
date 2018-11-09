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
const sdk = require('../../../index');

module.exports = React.createClass({
    displayName: 'ThreadMarker',

    propTypes: {
        /* the MatrixEvent to show */
        mxEvent: PropTypes.object.isRequired,
    },

    getEventTileOps: function() {
        return null;
    },

    render: function() {
        const id = this.props.mxEvent.getContent().thread_id;
        const text = this.props.mxEvent.getType() === "m.thread.start" ?
            `Start of thread ${id}` :
            `End of thread ${id}`;
        const style = {border: "1px solid red", padding: "10px"};
        return <div style={style}>{text}</div>
    },
});
