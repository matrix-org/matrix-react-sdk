/*
Copyright 2017 Michael Telatynski <7t3chguy@gmail.com>

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

import React from 'react';
import YouTube from 'react-youtube';
import getYouTubeId from 'get-youtube-id';

export default class YoutubePreviewWidget extends React.Component {
    static parse(url) {
        return getYouTubeId(url, { fuzzy: false });
    }

    static PropTypes = {
        videoId: React.PropTypes.string.isRequired, // the URL being previewed
        onCancelClick: React.PropTypes.func, // called when the preview's cancel ('hide') button is clicked
        onWidgetLoad: React.PropTypes.func, // called when the preview's contents has loaded
    };

    state = {
        preview: null,
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return <div className="mx_LinkPreviewWidget" >
            <div className="mx_LinkPreviewWidget_caption">
                <YouTube videoId={this.props.videoId} onReady={this.props.onWidgetLoad} />
            </div>
            <img className="mx_LinkPreviewWidget_cancel" src="img/cancel.svg" width="18" height="18"
                 onClick={ this.props.onCancelClick }/>
        </div>;
    }
}
