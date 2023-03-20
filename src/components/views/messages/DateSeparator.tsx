/*
Copyright 2018 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2015 - 2021 The Matrix.org Foundation C.I.C.

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

import React from "react";
import { Direction } from "matrix-js-sdk/src/models/event-timeline";
import { logger } from "matrix-js-sdk/src/logger";

import { _t } from "../../../languageHandler";
import { formatFullDateNoDay, formatFullDateNoTime } from "../../../DateUtils";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import dis from "../../../dispatcher/dispatcher";
import { Action } from "../../../dispatcher/actions";
import SettingsStore from "../../../settings/SettingsStore";
import { UIFeature } from "../../../settings/UIFeature";
import Modal from "../../../Modal";
import ErrorDialog from "../dialogs/ErrorDialog";
import { contextMenuBelow } from "../rooms/RoomTile";
import { ContextMenuTooltipButton } from "../../structures/ContextMenu";
import IconizedContextMenu, {
    IconizedContextMenuOption,
    IconizedContextMenuOptionList,
} from "../context_menus/IconizedContextMenu";
import JumpToDatePicker from "./JumpToDatePicker";
import { ViewRoomPayload } from "../../../dispatcher/payloads/ViewRoomPayload";
import { SdkContextClass } from "../../../contexts/SDKContext";

function getDaysArray(): string[] {
    return [_t("Sunday"), _t("Monday"), _t("Tuesday"), _t("Wednesday"), _t("Thursday"), _t("Friday"), _t("Saturday")];
}

interface IProps {
    roomId: string;
    ts: number;
    forExport?: boolean;
}

interface IState {
    contextMenuPosition?: DOMRect;
    jumpToDateEnabled: boolean;
}

export default class DateSeparator extends React.Component<IProps, IState> {
    private settingWatcherRef?: string;

    public constructor(props: IProps) {
        super(props);
        this.state = {
            jumpToDateEnabled: SettingsStore.getValue("feature_jump_to_date"),
        };

        // We're using a watcher so the date headers in the timeline are updated
        // when the lab setting is toggled.
        this.settingWatcherRef = SettingsStore.watchSetting(
            "feature_jump_to_date",
            null,
            (settingName, roomId, level, newValAtLevel, newVal) => {
                this.setState({ jumpToDateEnabled: newVal });
            },
        );
    }

    public componentWillUnmount(): void {
        if (this.settingWatcherRef) SettingsStore.unwatchSetting(this.settingWatcherRef);
    }

    private onContextMenuOpenClick = (e: React.MouseEvent): void => {
        e.preventDefault();
        e.stopPropagation();
        const target = e.target as HTMLButtonElement;
        this.setState({ contextMenuPosition: target.getBoundingClientRect() });
    };

    private onContextMenuCloseClick = (): void => {
        this.closeMenu();
    };

    private closeMenu = (): void => {
        this.setState({
            contextMenuPosition: undefined,
        });
    };

    private getLabel(): string {
        const date = new Date(this.props.ts);
        const disableRelativeTimestamps = !SettingsStore.getValue(UIFeature.TimelineEnableRelativeDates);

        // During the time the archive is being viewed, a specific day might not make sense, so we return the full date
        if (this.props.forExport || disableRelativeTimestamps) return formatFullDateNoTime(date);

        const today = new Date();
        const yesterday = new Date();
        const days = getDaysArray();
        yesterday.setDate(today.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return _t("Today");
        } else if (date.toDateString() === yesterday.toDateString()) {
            return _t("Yesterday");
        } else if (today.getTime() - date.getTime() < 6 * 24 * 60 * 60 * 1000) {
            return days[date.getDay()];
        } else {
            return formatFullDateNoTime(date);
        }
    }

    private pickDate = async (inputTimestamp: number | string | Date): Promise<void> => {
        const unixTimestamp = new Date(inputTimestamp).getTime();
        const roomIdForJumpRequest = this.props.roomId;

        try {
            const cli = MatrixClientPeg.get();
            const { event_id: eventId, origin_server_ts: originServerTs } = await cli.timestampToEvent(
                roomIdForJumpRequest,
                unixTimestamp,
                Direction.Forward,
            );
            logger.log(
                `/timestamp_to_event: ` +
                    `found ${eventId} (${originServerTs}) for timestamp=${unixTimestamp} (looking forward)`,
            );

            // Only try to navigate to the room if the user is still viewing the same
            // room. We don't want to jump someone back to a room after a slow request
            // if they've already navigated away to another room.
            const roomIdBeforeNavigation = SdkContextClass.instance.roomViewStore.getRoomId();
            if (roomIdBeforeNavigation === roomIdForJumpRequest) {
                dis.dispatch<ViewRoomPayload>({
                    action: Action.ViewRoom,
                    event_id: eventId,
                    highlighted: true,
                    room_id: roomIdBeforeNavigation,
                    metricsTrigger: undefined, // room doesn't change
                });
            }
        } catch (err) {
            logger.error(
                `Error occured while trying to find event in ${roomIdForJumpRequest} ` +
                    `at timestamp=${unixTimestamp}:`,
                err,
            );

            // Only display an error if the user is still viewing the same room. We
            // don't want to worry someone about an error in a room they no longer care
            // about after a slow request if they've already navigated away to another
            // room.
            const roomIdBeforeDisplayingError = SdkContextClass.instance.roomViewStore.getRoomId();
            if (roomIdBeforeDisplayingError === roomIdForJumpRequest) {
                let friendlyErrorMessage = `An error occured while trying to find and jump to the given date.`;
                if (err.errcode === "M_NOT_FOUND") {
                    friendlyErrorMessage = _t(
                        "We were unable to find an event looking forwards from %(dateString)s. " +
                            "Try choosing an earlier date.",
                        { dateString: formatFullDateNoDay(new Date(unixTimestamp)) },
                    );
                }
                if (err.name === "ConnectionError") {
                    friendlyErrorMessage = _t(
                        "Your homeserver was unreachable and was not able to log you in. Please try again. " +
                            "If this continues, please contact your homeserver administrator.",
                    );
                }

                Modal.createDialog(ErrorDialog, {
                    title: _t("Unable to find event at that date"),
                    description: (
                        <>
                            <p>{friendlyErrorMessage}</p>
                            <details>
                                <summary>{_t("Error details")}</summary>

                                <ul>
                                    <li>
                                        {_t("Request status code: %(statusCode)s", {
                                            statusCode: err.httpStatus || _t("HTTP status code not available"),
                                        })}
                                    </li>
                                    <li>
                                        {_t("Error code: %(errorCode)s", {
                                            errorCode: err.errcode || _t("Error code not available"),
                                        })}
                                    </li>
                                </ul>
                                <p>{String(err)}</p>
                            </details>
                        </>
                    ),
                });
            }
        }
    };

    private onLastWeekClicked = (): void => {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        this.pickDate(date);
        this.closeMenu();
    };

    private onLastMonthClicked = (): void => {
        const date = new Date();
        // Month numbers are 0 - 11 and `setMonth` handles the negative rollover
        date.setMonth(date.getMonth() - 1, 1);
        this.pickDate(date);
        this.closeMenu();
    };

    private onTheBeginningClicked = (): void => {
        const date = new Date(0);
        this.pickDate(date);
        this.closeMenu();
    };

    private onDatePicked = (dateString: string): void => {
        this.pickDate(dateString);
        this.closeMenu();
    };

    private renderJumpToDateMenu(): React.ReactElement {
        let contextMenu: JSX.Element | undefined;
        if (this.state.contextMenuPosition) {
            contextMenu = (
                <IconizedContextMenu
                    {...contextMenuBelow(this.state.contextMenuPosition)}
                    onFinished={this.onContextMenuCloseClick}
                >
                    <IconizedContextMenuOptionList first>
                        <IconizedContextMenuOption label={_t("Last week")} onClick={this.onLastWeekClicked} />
                        <IconizedContextMenuOption label={_t("Last month")} onClick={this.onLastMonthClicked} />
                        <IconizedContextMenuOption
                            label={_t("The beginning of the room")}
                            onClick={this.onTheBeginningClicked}
                        />
                    </IconizedContextMenuOptionList>

                    <IconizedContextMenuOptionList>
                        <JumpToDatePicker ts={this.props.ts} onDatePicked={this.onDatePicked} />
                    </IconizedContextMenuOptionList>
                </IconizedContextMenu>
            );
        }

        return (
            <ContextMenuTooltipButton
                className="mx_DateSeparator_jumpToDateMenu mx_DateSeparator_dateContent"
                onClick={this.onContextMenuOpenClick}
                isExpanded={!!this.state.contextMenuPosition}
                title={_t("Jump to date")}
            >
                <h2 className="mx_DateSeparator_dateHeading" aria-hidden="true">
                    {this.getLabel()}
                </h2>
                <div className="mx_DateSeparator_chevron" />
                {contextMenu}
            </ContextMenuTooltipButton>
        );
    }

    public render(): React.ReactNode {
        const label = this.getLabel();

        let dateHeaderContent;
        if (this.state.jumpToDateEnabled) {
            dateHeaderContent = this.renderJumpToDateMenu();
        } else {
            dateHeaderContent = (
                <div className="mx_DateSeparator_dateContent">
                    <h2 className="mx_DateSeparator_dateHeading" aria-hidden="true">
                        {label}
                    </h2>
                </div>
            );
        }

        // ARIA treats <hr/>s as separators, here we abuse them slightly so manually treat this entire thing as one
        // tab-index=-1 to allow it to be focusable but do not add tab stop for it, primarily for screen readers
        return (
            <div className="mx_DateSeparator" role="separator" tabIndex={-1} aria-label={label}>
                <hr role="none" />
                {dateHeaderContent}
                <hr role="none" />
            </div>
        );
    }
}
