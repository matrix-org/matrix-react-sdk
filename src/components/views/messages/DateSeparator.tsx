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

import React from 'react';

import { _t } from '../../../languageHandler';
import { formatFullDateNoTime } from '../../../DateUtils';
import { replaceableComponent } from "../../../utils/replaceableComponent";
import { MatrixClientPeg } from '../../../MatrixClientPeg';
import { Direction } from 'matrix-js-sdk/src/models/event-timeline';
import dis from '../../../dispatcher/dispatcher';
import { Action } from '../../../dispatcher/actions';

import Field from "../elements/Field";
import Modal from '../../../Modal';
import ErrorDialog from '../dialogs/ErrorDialog';
import AccessibleButton from "../elements/AccessibleButton";
import { contextMenuBelow } from '../rooms/RoomTile';
import { ContextMenuTooltipButton } from "../../structures/ContextMenu";
import IconizedContextMenu, {
    IconizedContextMenuOption,
    IconizedContextMenuOptionList,
    IconizedContextMenuRadio,
} from "../context_menus/IconizedContextMenu";

interface CustomInputProps {
    onChange?: (event: Event) => void;
    onInput?: (event: Event) => void;
}
/**
 * This component restores the native 'onChange' and 'onInput' behavior of
 * JavaScript. via https://stackoverflow.com/a/62383569/796832 and
 * https://github.com/facebook/react/issues/9657#issuecomment-643970199
 *
 * See:
 * - https://reactjs.org/docs/dom-elements.html#onchange
 * - https://github.com/facebook/react/issues/3964
 * - https://github.com/facebook/react/issues/9657
 * - https://github.com/facebook/react/issues/14857
 *
 * We use this for the <input type="date"> date picker so we can distinguish
 * from a final date picker selection vs navigating the months in the date
 * picker which trigger an `input`(and `onChange` in React).
 */
class CustomInput extends React.Component<Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'onInput' | 'ref'> & CustomInputProps> {
    private readonly registerCallbacks  = (element: HTMLInputElement | null) => {
        if (element) {
            element.onchange = this.props.onChange ? this.props.onChange : null;
            element.oninput = this.props.onInput ? this.props.onInput : null;
        }
    };

    public render() {
        return <input ref={this.registerCallbacks} {...this.props} onChange={() => {}} onInput={() => {}} />;
    }
}

function getDaysArray(): string[] {
    return [
        _t('Sunday'),
        _t('Monday'),
        _t('Tuesday'),
        _t('Wednesday'),
        _t('Thursday'),
        _t('Friday'),
        _t('Saturday'),
    ];
}

interface IProps {
    roomId: string,
    ts: number;
    forExport?: boolean;
}

interface IState {
    dateValue: string,
    // Whether or not to automatically navigate to the given date after someone
    // selects a day in the date picker. We want to disable this after someone
    // starts manually typing in the input instead of picking.
    navigateOnDatePickerSelection: boolean,
    contextMenuPosition?: DOMRect
}

@replaceableComponent("views.messages.DateSeparator")
export default class DateSeparator extends React.Component<IProps, IState> {
    constructor(props, context) {
        super(props, context);
        this.state = {
            dateValue: this.getDefaultDateValue(),
            navigateOnDatePickerSelection: true
        };
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
            contextMenuPosition: null,
        });
    };

    private getLabel(): string {
        const date = new Date(this.props.ts);

        // During the time the archive is being viewed, a specific day might not make sense, so we return the full date
        if (this.props.forExport) return formatFullDateNoTime(date);

        const today = new Date();
        const yesterday = new Date();
        const days = getDaysArray();
        yesterday.setDate(today.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return _t('Today');
        } else if (date.toDateString() === yesterday.toDateString()) {
            return _t('Yesterday');
        } else if (today.getTime() - date.getTime() < 6 * 24 * 60 * 60 * 1000) {
            return days[date.getDay()];
        } else {
            return formatFullDateNoTime(date);
        }
    }

    private getDefaultDateValue(): string {
        const date = new Date(this.props.ts);
        const year = date.getFullYear();
        const month = `${date.getMonth() + 1}`.padStart(2, "0")
        const day = `${date.getDate()}`.padStart(2, "0")

        return `${year}-${month}-${day}`
    }

    private pickDate = async (inputTimestamp): Promise<void> => {
        console.log('pickDate', inputTimestamp)

        const unixTimestamp = new Date(inputTimestamp).getTime();

        const cli = MatrixClientPeg.get();
        try {
            const roomId = this.props.roomId
            const { event_id, origin_server_ts } = await cli.timestampToEvent(
                roomId,
                unixTimestamp,
                Direction.Forward
            );
            console.log(`/timestamp_to_event: found ${event_id} (${origin_server_ts}) for timestamp=${unixTimestamp}`)

            dis.dispatch({
                action: Action.ViewRoom,
                event_id,
                highlighted: true,
                room_id: roomId,
            });
        } catch (e) {
            const code = e.errcode || e.statusCode;
            // only show the dialog if failing for something other than a network error
            // (e.g. no errcode or statusCode) as in that case the redactions end up in the
            // detached queue and we show the room status bar to allow retry
            if (typeof code !== "undefined") {
                // display error message stating you couldn't delete this.
                Modal.createTrackedDialog('Unable to find event at that date', '', ErrorDialog, {
                    title: _t('Error'),
                    description: _t('Unable to find event at that date. (%(code)s)', { code }),
                });
            }
        }
    };

    // Since we're using CustomInput with native JavaScript behavior, this
    // tracks the date value changes as they come in.
    private onDateValueInput = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>): void => {
        console.log('onDateValueInput')
        this.setState({ dateValue: e.target.value });
    };

    // Since we're using CustomInput with native JavaScript behavior, the change
    // event listener will trigger when a date is picked from the date picker
    // or when the text is fully filled out. In order to not trigger early
    // as someone is typing out a date, we need to disable when we see keydowns.
    private onDateValueChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>): void => {
        console.log('onDateValueChange')
        this.setState({ dateValue: e.target.value });

        // Don't auto navigate if they were manually typing out a date
        if(this.state.navigateOnDatePickerSelection) {
            this.pickDate(this.state.dateValue);
            this.closeMenu();
        }
    };

    private onDateInputKeyDown = (e: React.KeyboardEvent): void => {
        // Ignore the tab key which is probably just navigating focus around
        // with the keyboard
        if(e.key === "Tab") {
            return;
        }

        // Go and navigate if they submitted
        if(e.key === "Enter") {
            this.pickDate(this.state.dateValue);
            this.closeMenu();
            return;
        }

        // When we see someone manually typing out a date, disable the auto
        // submit on change.
        this.setState({ navigateOnDatePickerSelection: false });
    };

    private onLastWeekClicked = (): void => {
        const date = new Date();
        // This just goes back 7 days.
        // FIXME: Do we want this to go back to the last Sunday? https://upokary.com/how-to-get-last-monday-or-last-friday-or-any-last-day-in-javascript/
        date.setDate(date.getDate() - 7);
        this.pickDate(date);
        this.closeMenu();
    }

    private onLastMonthClicked = (): void => {
        const date = new Date();
        // Month numbers are 0 - 11 and `setMonth` handles the negative rollover
        date.setMonth(date.getMonth() - 1, 1);
        this.pickDate(date);
        this.closeMenu();
    }

    private onTheBeginningClicked = (): void => {
        const date = new Date(0);
        this.pickDate(date);
        this.closeMenu();
    }

    private onJumpToDateSubmit = (): void => {
        console.log('onJumpToDateSubmit')
        this.pickDate(this.state.dateValue);
        this.closeMenu();
    }

    private renderNotificationsMenu(): React.ReactElement {
        let contextMenu: JSX.Element;
        if (this.state.contextMenuPosition) {
            contextMenu = <IconizedContextMenu
                {...contextMenuBelow(this.state.contextMenuPosition)}
                compact
                onFinished={this.onContextMenuCloseClick}
            >
                <IconizedContextMenuOptionList first>
                    <IconizedContextMenuOption
                        label={_t("Last week")}
                        onClick={this.onLastWeekClicked}
                    />
                    <IconizedContextMenuOption
                        label={_t("Last month")}
                        onClick={this.onLastMonthClicked}
                    />
                    <IconizedContextMenuOption
                        label={_t("The beginning of the room")}
                        onClick={this.onTheBeginningClicked}
                    />
                </IconizedContextMenuOptionList>

                <IconizedContextMenuOptionList>
                    <IconizedContextMenuOption
                        className="mx_DateSeparator_jumpToDateMenuOption"
                        label={_t("Jump to date")}
                        onClick={() => {}}
                    >
                        <form className="mx_DateSeparator_datePickerForm" onSubmit={this.onJumpToDateSubmit}>
                            <Field
                                element={CustomInput}
                                type="date"
                                onChange={this.onDateValueChange}
                                onInput={this.onDateValueInput}
                                onKeyDown={this.onDateInputKeyDown}
                                value={this.state.dateValue}
                                className="mx_DateSeparator_datePicker"
                                label={_t("Pick a date to jump to")}
                                autoFocus={true}
                            />
                            <AccessibleButton
                                kind="primary"
                                className="mx_DateSeparator_datePickerSubmitButton"
                                onClick={this.onJumpToDateSubmit}
                            >
                                { _t("Go") }
                            </AccessibleButton>
                        </form>
                    </IconizedContextMenuOption>
                </IconizedContextMenuOptionList>
            </IconizedContextMenu>;
        }

        return (
            <ContextMenuTooltipButton
                className="mx_DateSeparator_jumpToDateMenu"
                onClick={this.onContextMenuOpenClick}
                isExpanded={!!this.state.contextMenuPosition}
                title={_t("Jump to date")}
            >
                <div aria-hidden="true">{ this.getLabel() }</div>
                <div className="mx_DateSeparator_chevron" />
                { contextMenu }
            </ContextMenuTooltipButton>
        );
    }

    render() {
        // ARIA treats <hr/>s as separators, here we abuse them slightly so manually treat this entire thing as one
        // tab-index=-1 to allow it to be focusable but do not add tab stop for it, primarily for screen readers
        return <h2 className="mx_DateSeparator" role="separator" aria-label={this.getLabel()}>
            <hr role="none" />
            { this.renderNotificationsMenu() }
            <hr role="none" />
        </h2>;
    }
}
