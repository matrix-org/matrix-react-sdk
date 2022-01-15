
import React, { useState } from 'react';
import { _t } from '../../../languageHandler';

import Field from "../elements/Field";
import CustomInput from "../elements/CustomInput";
import { RovingAccessibleButton, useRovingTabIndex } from "../../../accessibility/RovingTabIndex";

interface IProps {
    ts: number;
    onDatePicked?: (dateString: string) => void;
}

const JumpToDatePicker: React.FC<IProps> = ({ ts, onDatePicked }: IProps) => {
    const date = new Date(ts);
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0")
    const day = `${date.getDate()}`.padStart(2, "0")
    const dateDefaultValue = `${year}-${month}-${day}`;

    const [dateValue, setDateValue] = useState(dateDefaultValue);
    // Whether or not to automatically navigate to the given date after someone
    // selects a day in the date picker. We want to disable this after someone
    // starts manually typing in the input instead of picking.
    const [navigateOnDatePickerSelection, setNavigateOnDatePickerSelection] = useState(true);

    // Since we're using CustomInput with native JavaScript behavior, this
    // tracks the date value changes as they come in.
    const onDateValueInput = (e: React.ChangeEvent<HTMLInputElement>): void => {
        console.log('onDateValueInput')
        setDateValue(e.target.value);
    };

    // Since we're using CustomInput with native JavaScript behavior, the change
    // event listener will trigger when a date is picked from the date picker
    // or when the text is fully filled out. In order to not trigger early
    // as someone is typing out a date, we need to disable when we see keydowns.
    const onDateValueChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        console.log('onDateValueChange')
        setDateValue(e.target.value);

        // Don't auto navigate if they were manually typing out a date
        if(navigateOnDatePickerSelection) {
            onDatePicked(dateValue);
        }
    };

    const [onFocus, isActive, ref] = useRovingTabIndex<HTMLInputElement>();

    const onDateInputKeyDown = (e: React.KeyboardEvent): void => {
        // Go and navigate if they submitted
        if(e.key === "Enter") {
            onDatePicked(dateValue);
            return;
        }

        // When we see someone manually typing out a date, disable the auto
        // submit on change.
        setNavigateOnDatePickerSelection(false);
    };

    const onJumpToDateSubmit = (): void => {
        onDatePicked(dateValue);
    }

    return (
        <form
            className="mx_JumpToDatePicker_form"
            onSubmit={onJumpToDateSubmit}
        >
            <span className="mx_JumpToDatePicker_label">Jump to date</span>
            <Field
                element={CustomInput}
                type="date"
                onChange={onDateValueChange}
                onInput={onDateValueInput}
                onKeyDown={onDateInputKeyDown}
                value={dateValue}
                className="mx_JumpToDatePicker_datePicker"
                label={_t("Pick a date to jump to")}
                onFocus={onFocus}
                inputRef={ref}
                tabIndex={isActive ? 0 : -1}
            />
            <RovingAccessibleButton
                kind="primary"
                className="mx_JumpToDatePicker_submitButton"
                onClick={onJumpToDateSubmit}
            >
                { _t("Go") }
            </RovingAccessibleButton>
        </form>
    )
};

export default JumpToDatePicker;
