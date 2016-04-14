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
    displayName: 'LinkPreviewWidget',

    propTypes: {
        link: React.PropTypes.string.isRequired, // the URL being previewed
        mxEvent: React.PropTypes.object.isRequired, // the Event associated with the preview
        onCancelClick: React.PropTypes.func, // called when the preview's cancel ('hide') button is clicked
        onWidgetLoad: React.PropTypes.func, // called when the preview's contents has loaded
    },

    render: function() {
        var previewers = [
            [new RegExp('^https?://www.youtube.com/watch\\?v=([A-Za-z0-9]+)$'), 'YoutubePreview'],
        ];

        var previewerName = 'OpenGraphPreview';
        var match = undefined;
        for (var i = 0; i < previewers.length; ++i) {
            match = previewers[i][0].exec(this.props.link);
            if (match !== null) {
                previewerName = previewers[i][1];
            }
        }

        var Previewer = sdk.getComponent('previews.'+previewerName);
        return (
            <div className="mx_LinkPreviewWidget" >
                <Previewer match={match} {...this.props} />
            </div>
        );
    }
});
