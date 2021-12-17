/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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
import { mount } from "enzyme";

import sdk from "../../../skinned-sdk";
import * as TestUtils from "../../../test-utils";
import { formatFullDateNoTime } from "../../../../src/DateUtils";

const _DateSeparator = sdk.getComponent("views.messages.DateSeparator");
const DateSeparator = TestUtils.wrapInMatrixClientContext(_DateSeparator);

describe("DateSeparator", () => {
    const HOUR_MS = 3600000;
    const DAY_MS = HOUR_MS * 24;
    // Friday Dec 17 2021, 9:09am
    const now = new Date('Fri Dec 17 2021 09:09:00 GMT+0100 (Central European Standard Time)');
    const defaultProps = {
        ts: now.getTime(),
        now,
    };
    const getComponent = (props = {}) =>
        mount(<DateSeparator {...defaultProps} {...props} />);

    type TestCase = [string, number, string];
    const testCases: TestCase[] = [
        ['the exact same moment', now.getTime(), 'Today'],
        ['same day as current day', now.getTime() - HOUR_MS, 'Today'],
        ['day before the current day', now.getTime() - (HOUR_MS * 12), 'Yesterday'],
        ['2 days ago', now.getTime() - DAY_MS * 2, 'Wednesday'],
        ['144 hours ago', now.getTime() - HOUR_MS * 144, 'Sat, Dec 11 2021'],
        [
            '6 days ago, but less than 144h',
            new Date('Saturday Dec 11 2021 23:59:00 GMT+0100 (Central European Standard Time)').getTime(),
            'Saturday',
        ],
    ];

    it('renders the date separator correctly', () => {
        const component = getComponent();
        expect(component).toMatchSnapshot();
    });

    it.each(testCases)('formats date correctly when current time is %s', (_d, ts, result) => {
        expect(getComponent({ ts, forExport: false }).text()).toEqual(result);
    });

    describe('when forExport is true', () => {
        it.each(testCases)('formats date in full when current time is %s', (_d, ts) => {
            expect(getComponent({ ts, forExport: true }).text()).toEqual(formatFullDateNoTime(new Date(ts)));
        });
    });
});
