/*
Copyright 2020 The Matrix.org Foundation C.I.C.

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
import SettingsStore from "../../../../settings/SettingsStore";
import AccessibleButton from "../../elements/AccessibleButton";
import { XOR } from "../../../../@types/common";
import { NotificationState, NotificationStateEvents } from "../../../../stores/notifications/NotificationState";
import Tooltip from "../../elements/Tooltip";
import { _t } from "../../../../languageHandler";
import { NotificationColor } from "../../../../stores/notifications/NotificationColor";

interface IProps {
    notification: NotificationState;

    /**
     * If true, the badge will show a count if at all possible. This is typically
     * used to override the user's preference for things like room sublists.
     */
    forceCount?: boolean;

    /**
     * The room ID, if any, the badge represents.
     */
    roomId?: string;
}

interface IClickableProps extends IProps, React.InputHTMLAttributes<Element> {
    showUnsentTooltip?: boolean;
    /**
     * If specified will return an AccessibleButton instead of a div.
     */
    onClick?(ev: React.MouseEvent);
}

interface IState {
    showCounts: boolean; // whether or not to show counts. Independent of props.forceCount
    showTooltip: boolean;
}

export default class NotificationBadge extends React.PureComponent<XOR<IProps, IClickableProps>, IState> {
    private countWatcherRef: string;

    constructor(props: IProps) {
        super(props);
        this.props.notification.on(NotificationStateEvents.Update, this.onNotificationUpdate);

        this.state = {
            showCounts: SettingsStore.getValue("Notifications.alwaysShowBadgeCounts", this.roomId),
            showTooltip: false,
        };

        this.countWatcherRef = SettingsStore.watchSetting(
            "Notifications.alwaysShowBadgeCounts", this.roomId,
            this.countPreferenceChanged,
        );
    }

    private get roomId(): string {
        // We should convert this to null for safety with the SettingsStore
        return this.props.roomId || null;
    }

    public componentWillUnmount() {
        SettingsStore.unwatchSetting(this.countWatcherRef);
        this.props.notification.off(NotificationStateEvents.Update, this.onNotificationUpdate);
    }

    public componentDidUpdate(prevProps: Readonly<IProps>) {
        if (prevProps.notification) {
            prevProps.notification.off(NotificationStateEvents.Update, this.onNotificationUpdate);
        }

        this.props.notification.on(NotificationStateEvents.Update, this.onNotificationUpdate);
    }

    private countPreferenceChanged = () => {
        this.setState({ showCounts: SettingsStore.getValue("Notifications.alwaysShowBadgeCounts", this.roomId) });
    };

    private onNotificationUpdate = () => {
        this.forceUpdate(); // notification state changed - update
    };

    private onMouseOver = (e: MouseEvent) => {
        e.stopPropagation();
        this.setState({
            showTooltip: true,
        });
    };

    private onMouseLeave = () => {
        this.setState({
            showTooltip: false,
        });
    };

    public render(): React.ReactElement {
        /* eslint @typescript-eslint/no-unused-vars: ["error", { "ignoreRestSiblings": true }] */
        const { notification, showUnsentTooltip, onClick } = this.props;

        let label: string;
        let tooltip: JSX.Element;
        if (showUnsentTooltip && this.state.showTooltip && notification.color === NotificationColor.Unsent) {
            label = _t("Message didn't send. Click for info.");
            tooltip = <Tooltip className="mx_RoleButton_tooltip" label={label} />;
        }

        return <StatelessNotificationBadge
            label={label}
            symbol={notification.symbol}
            count={notification.count}
            color={notification.color}
            onClick={onClick}
            onMouseOver={this.onMouseOver}
            onMouseLeave={this.onMouseLeave}
        >
            { tooltip }
        </StatelessNotificationBadge>;
    }
}

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

export function StatelessNotificationBadge({
    symbol,
    count,
    color,
    ...props }: Props) {
    // Don't show a badge if we don't need to
    if (color === NotificationColor.None) return null;

    const hasUnreadCount = color >= NotificationColor.Grey && (!!count || !!symbol);

    const isEmptyBadge = symbol === null && count === 0;

    if (symbol === null && count > 0) {
        symbol = formatCount(count);
    }

    const classes = classNames({
        'mx_NotificationBadge': true,
        'mx_NotificationBadge_visible': isEmptyBadge ? true : hasUnreadCount,
        'mx_NotificationBadge_highlighted': color === NotificationColor.Red,
        'mx_NotificationBadge_dot': isEmptyBadge,
        'mx_NotificationBadge_2char': symbol?.length > 0 && symbol?.length < 3,
        'mx_NotificationBadge_3char': symbol?.length > 2,
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
                <span className="mx_NotificationBadge_count">{ symbol }</span>
                { props.children }
            </AccessibleButton>
        );
    }

    return (
        <div className={classes}>
            <span className="mx_NotificationBadge_count">{ symbol }</span>
        </div>
    );
}
