/*
Copyright 2016 OpenMarket Ltd
Copyright 2017 Vector Creations Ltd
Copyright 2019 New Vector Ltd

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
import request from 'browser-request';
import { _t } from '../../languageHandler';
import sanitizeHtml from 'sanitize-html';
import sdk from '../../index';
import { MatrixClient } from 'matrix-js-sdk';
import classnames from 'classnames';

export default class EmbeddedPage extends React.PureComponent {
    static propTypes = {
        // URL to request embedded page content from
        url: PropTypes.string,
        // Class name prefix to apply for a given instance
        className: PropTypes.string,
        // Whether to wrap the page in a scrollbar
        scrollbar: PropTypes.bool,
    };

    static contextTypes = {
        matrixClient: PropTypes.instanceOf(MatrixClient),
    };

    constructor(props) {
        super(props);

        this.state = {
            page: '',
        };
    }

    translate(s) {
        // default implementation - skins may wish to extend this
        return sanitizeHtml(_t(s));
    }

    componentWillMount() {
        this._unmounted = false;

        if (!this.props.url) {
            return;
        }

        // we use request() to inline the page into the react component
        // so that it can inherit CSS and theming easily rather than mess around
        // with iframes and trying to synchronise document.stylesheets.

        request(
            { method: "GET", url: this.props.url },
            (err, response, body) => {
                if (this._unmounted) {
                    return;
                }

                if (err || response.status < 200 || response.status >= 300) {
                    console.warn(`Error loading page: ${err}`);
                    this.setState({ page: _t("Couldn't load page") });
                    return;
                }

                body = body.replace(/_t\(['"]([\s\S]*?)['"]\)/mg, (match, g1)=>this.translate(g1));
                this.setState({ page: body });
            },
        );
    }

    componentWillUnmount() {
        this._unmounted = true;
    }

    render() {
        const client = this.context.matrixClient;
        const isGuest = client ? client.isGuest() : true;
        const className = this.props.className;
        const classes = classnames({
            [className]: true,
            [`${className}_guest`]: isGuest,
        });

        const content = <div className={`${className}_body`}
            dangerouslySetInnerHTML={{ __html: this.state.page }}
        >
        </div>;

        if (this.props.scrollbar) {
            const GeminiScrollbarWrapper = sdk.getComponent("elements.GeminiScrollbarWrapper");
            return <GeminiScrollbarWrapper autoshow={true} className={classes}>
                {content}
            </GeminiScrollbarWrapper>;
        } else {
            return <div className={classes}>
                {content}
            </div>;
        }
    }
}
