/*
Copyright 2018 New Vector Ltd

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
import PropTypes from 'prop-types';
import sdk from '../../../index';
import dis from '../../../dispatcher';
import { _t } from '../../../languageHandler';
import {formatTime} from '../../../DateUtils';
import SettingsStore from "../../../settings/SettingsStore";

module.exports = React.createClass({
    displayName: 'NewThreadBanner',

    propTypes: {
        /* the MatrixEvent to show */
        mxEvent: PropTypes.object.isRequired,
    },

    _onLinkClicked: function(e) {
        e.preventDefault();
        dis.dispatch({
            action: 'view_right_panel_phase',
            phase: 'ThreadPanel',
            mxEvent: this.props.mxEvent,
        });
    },

    getDefaultProps() {
        return {
            isTwelveHour: SettingsStore.getValue("showTwelveHourTimestamps"),
        };
    },

    render: function() {
        const MessageTimestamp = sdk.getComponent("messages.MessageTimestamp");
        const date = new Date(this.props.mxEvent.getTs());
        return <div className="mx_NewThreadBanner">
            <div className="mx_NewThreadBanner_timestamp">{formatTime(date, this.props.isTwelveHour)}</div>
            <div className="mx_NewThreadBanner_message">
                {_t("Received older messages: <link>View messages</link>", {}, {
                    link: s => <a href="#" onClick={this._onLinkClicked}>{s}</a>,
                })}
            </div>
        </div>;
    },
});
