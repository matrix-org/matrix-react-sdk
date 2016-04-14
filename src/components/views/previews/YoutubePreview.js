/*
Copyright 2016 OpenMarket Ltd

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
    displayName: 'YoutubePreview',

    propTypes: {
        link: React.PropTypes.string.isRequired, // the URL being previewed
        onWidgetLoad: React.PropTypes.func, // called when the preview's contents has loaded
    },

    render: function() {
        var embedLink = 'https://www.youtube.com/embed/'+this.props.match[1];

        return (
            <iframe width="420" height="315" src={embedLink} frameborder="0" allowfullscreen>
            </iframe>
        );
    }
});
