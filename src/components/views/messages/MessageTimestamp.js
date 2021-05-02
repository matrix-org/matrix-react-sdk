/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2018 Michael Telatynski <7t3chguy@gmail.com>

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
import {formatFullDate, formatTime, formatFullTime} from '../../../DateUtils';
import {replaceableComponent} from "../../../utils/replaceableComponent";

@replaceableComponent("views.messages.MessageTimestamp")
export default class MessageTimestamp extends React.Component {
    static propTypes = {
        ts: PropTypes.number.isRequired,
        showTwelveHour: PropTypes.bool,
        showFullDate: PropTypes.bool,
        showSeconds: PropTypes.bool,
    };

    render() {
        const date = new Date(this.props.ts);
        let timestamp;
        if (this.props.showFullDate) {
            timestamp = formatFullDate(date, this.props.showTwelveHour, this.props.showSeconds);
        } else if (this.props.showSeconds) {
            timestamp = formatFullTime(date, this.props.showTwelveHour);
        } else {
            timestamp = formatTime(date, this.props.showTwelveHour);
        }

        return (
            <span className="mx_MessageTimestamp" title={formatFullDate(date, this.props.showTwelveHour)} aria-hidden={true}>
                {timestamp}
            </span>
        );
    }
}
