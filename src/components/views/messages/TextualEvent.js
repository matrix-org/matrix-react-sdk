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

var TextForEvent = require('../../../TextForEvent');
import sdk from '../../../index';

module.exports = React.createClass({
    displayName: 'TextualEvent',

    propTypes: {
        /* the MatrixEvent to show */
        mxEvent: React.PropTypes.object.isRequired,
    },
    
    render: function() {
        const EmojiText = sdk.getComponent('elements.EmojiText');
        var text = TextForEvent.textForEvent(this.props.mxEvent);
        if (text == null || text.length === 0) return null;
        return (
            <EmojiText element="div" className="mx_TextualEvent">{text}</EmojiText>
        );
    },
});
