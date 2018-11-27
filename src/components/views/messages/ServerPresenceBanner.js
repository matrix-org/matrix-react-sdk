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
import classNames from "classnames";

module.exports = React.createClass({
    displayName: 'ServerPresenceBanner',

    propTypes: {
        /* the MatrixEvent to show */
        mxEvent: PropTypes.object,
        /* the aggregated events, see SPEA */
        events: PropTypes.array,
    },

    getDefaultProps() {
        return {
            isTwelveHour: SettingsStore.getValue("showTwelveHourTimestamps"),
        };
    },

    render: function() {
        const e = this.props.mxEvent;// || this.props.events[0];
        const state = e.getContent().state;
        const disconnected = state === "disconnected";
        const connected = state === "connected";
        const server = e.getStateKey();

        const classes = classNames({
            "mx_ServerPresenceBanner": true,
            "mx_ServerPresenceBanner_connected": connected,
            "mx_ServerPresenceBanner_disconnected": disconnected,
        });
        const label = disconnected ?
            _t("Lost connection to server %(server)s", {server}) :
            _t("Reconnected to server %(server)s", {server});
        const date = new Date(e.getTs());
        return <div className={classes}>
            <div className="mx_ServerPresenceBanner_timestamp">{formatTime(date, this.props.isTwelveHour)}</div>
            <div className="mx_ServerPresenceBanner_message">{label}</div>
        </div>;
    },
});
