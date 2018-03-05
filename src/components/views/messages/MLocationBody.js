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

import React from 'react';
import PropTypes from 'prop-types';
import { MatrixClient } from 'matrix-js-sdk';

import { _t } from '../../../languageHandler';

module.exports = React.createClass({
    displayName: 'MLocationBody',

    propTypes: {
        /* the MatrixEvent to show */
        mxEvent: React.PropTypes.object.isRequired,

        /* called when the image has loaded */
        onWidgetLoad: React.PropTypes.func.isRequired,
    },

    contextTypes: {
        matrixClient: PropTypes.instanceOf(MatrixClient),
    },

    getInitialState: function() {
        return {
            imgError: false,
        };
    },

    onImageError: function() {
        this.setState({
            imgError: true,
        });
    },

    render: function() {
        const content = this.props.mxEvent.getContent();
        if (!content.geo_uri || !content.body) {
            return (
                <span className="mx_MLocationBody">
                  { _t("This location cannot be displayed.") }
                </span>
            );
        }

        if (this.state.imgError) {
            return (
                <span className="mx_MLocationBody">
                    { _t("Location '%(Body)s' cannot be displayed.", {Body: this.state.body}) }
                </span>
            );
        }

        const parts = content.geo_uri.split(/[:;,]/);
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts[1] + ',' + parts[2])}`;

        let image = null;
        if (content.info && content.info.thumbnail_url) {
          const thumbUrl = this.context.matrixClient.mxcUrlToHttp(content.info.thumbnail_url, 800, 600);
          image = (
            <div className="mx_MLocationBody_thumbnail">
              <img alt={content.body} src={thumbUrl}
                onError={this.onImageError}
                onLoad={this.props.onWidgetLoad} />
            </div>
          );
        }

        return (
            <span className="mx_MLocationBody">
            <span>{ content.body }</span>
            { image }
            <a target="_blank" href={url} className="mx_MLocationBody_link">
              { _t("Click to view location on Google Maps") }
            </a>
            </span>
        );
    },
});
