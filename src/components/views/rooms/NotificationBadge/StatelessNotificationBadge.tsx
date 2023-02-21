/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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

import React, { MouseEvent } from "react";
import classNames from "classnames";

import { formatCount } from "../../../../utils/FormattingUtils";
import AccessibleButton from "../../elements/AccessibleButton";
import { NotificationColor } from "../../../../stores/notifications/NotificationColor";
import { useSettingValue } from "../../../../hooks/useSettings";

interface Props {
    symbol: string | null;
    count: number;
    color: NotificationColor;
    onClick?: (ev: MouseEvent) => void;
    onMouseOver?: (ev: MouseEvent) => void;
    onMouseLeave?: (ev: MouseEvent) => void;
    children?: React.ReactChildren | JSX.Element;
    label?: string;
}

export function StatelessNotificationBadge({ symbol, count, color, ...props }: Props): JSX.Element {
    const hideBold = useSettingValue("feature_hidebold");

    // Don't show a badge if we don't need to
    if (color === NotificationColor.None || (hideBold && color == NotificationColor.Bold)) {
        return null;
    }

    const hasUnreadCount = color >= NotificationColor.Grey && (!!count || !!symbol);

    const isEmptyBadge = symbol === null && count === 0;

    if (symbol === null && count > 0) {
        symbol = formatCount(count);
    }

    const classes = classNames({
        mx_NotificationBadge: true,
        mx_NotificationBadge_visible: isEmptyBadge ? true : hasUnreadCount,
        mx_NotificationBadge_highlighted: color >= NotificationColor.Red,
        mx_NotificationBadge_dot: isEmptyBadge,
        mx_NotificationBadge_2char: symbol?.length > 0 && symbol?.length < 3,
        mx_NotificationBadge_3char: symbol?.length > 2,
    });

    if (props.onClick) {
        return (
            <AccessibleButton
                aria-label={props.label}
                {...props}
                className={classes}
                onClick={props.onClick}
                onMouseOver={props.onMouseOver}
                onMouseLeave={props.onMouseLeave}
            >
                <span className="mx_NotificationBadge_count">{symbol}</span>
                {props.children}
            </AccessibleButton>
        );
    }

    return (
        <div className={classes}>
            <span className="mx_NotificationBadge_count">{symbol}</span>
        </div>
    );
}
