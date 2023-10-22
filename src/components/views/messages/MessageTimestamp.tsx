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

import React, { ReactNode } from "react";
import { Tooltip } from "@vector-im/compound-web";

import { formatFullDate, formatTime, formatFullTime, formatRelativeTime } from "../../../DateUtils";
import { _t } from "../../../languageHandler";
import { Icon as LateIcon } from "../../../../res/img/sensor.svg";

interface IProps {
    ts: number;
    /**
     * If specified will render both the sent-at and received-at timestamps in the tooltip
     */
    receivedTs?: number;
    showTwelveHour?: boolean;
    showFullDate?: boolean;
    showSeconds?: boolean;
    showRelative?: boolean;
}

export default class MessageTimestamp extends React.Component<IProps> {
    public render(): React.ReactNode {
        const date = new Date(this.props.ts);
        let timestamp: string;
        if (this.props.showRelative) {
            timestamp = formatRelativeTime(date, this.props.showTwelveHour);
        } else if (this.props.showFullDate) {
            timestamp = formatFullDate(date, this.props.showTwelveHour, this.props.showSeconds);
        } else if (this.props.showSeconds) {
            timestamp = formatFullTime(date, this.props.showTwelveHour);
        } else {
            timestamp = formatTime(date, this.props.showTwelveHour);
        }

        let label = formatFullDate(date, this.props.showTwelveHour);
        let caption: string | undefined;
        let icon: ReactNode | undefined;
        if (this.props.receivedTs !== undefined) {
            label = _t("timeline|message_timestamp_sent_at", { dateTime: label });
            const receivedDate = new Date(this.props.receivedTs);
            caption = _t("timeline|message_timestamp_received_at", {
                dateTime: formatFullDate(receivedDate, this.props.showTwelveHour),
            });
            icon = <LateIcon className="mx_MessageTimestamp_lateIcon" width="16" height="16" />;
        }

        return (
            <Tooltip label={label} caption={caption}>
                <span className="mx_MessageTimestamp" aria-hidden={true} aria-live="off">
                    {icon}
                    {timestamp}
                </span>
            </Tooltip>
        );
    }
}
