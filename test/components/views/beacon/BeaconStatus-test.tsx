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

import React from 'react';
import { mount } from 'enzyme';
import { Beacon } from 'matrix-js-sdk/src/matrix';
import { act } from 'react-dom/test-utils';

import BeaconStatus from '../../../../src/components/views/beacon/BeaconStatus';
import { BeaconDisplayStatus } from '../../../../src/components/views/beacon/displayStatus';
import { findByTestId, makeBeaconInfoEvent } from '../../../test-utils';

describe('<BeaconStatus />', () => {
    const defaultProps = {
        displayStatus: BeaconDisplayStatus.Loading,
    };
    const getComponent = (props = {}) =>
        mount(<BeaconStatus {...defaultProps} {...props} />);

    it('renders loading state', () => {
        const component = getComponent({ displayStatus: BeaconDisplayStatus.Loading });
        expect(component).toMatchSnapshot();
    });

    it('renders stopped state', () => {
        const component = getComponent({ displayStatus: BeaconDisplayStatus.Stopped });
        expect(component).toMatchSnapshot();
    });

    describe('active state', () => {
        it('renders without stop buttons', () => {
            // mock for stable snapshot
            jest.spyOn(Date, 'now').mockReturnValue(123456789);
            const beacon = new Beacon(makeBeaconInfoEvent('@user:server', '!room:server', {}, '$1'));
            const component = getComponent({ beacon, displayStatus: BeaconDisplayStatus.Active });
            expect(component).toMatchSnapshot();
        });

        it('renders with stop button', () => {
            const stopBeacon = jest.fn();
            const beacon = new Beacon(makeBeaconInfoEvent('@user:server', '!room:sever'));
            const component = getComponent({
                beacon,
                stopBeacon,
                displayStatus: BeaconDisplayStatus.Active,
            });
            expect(findByTestId(component, 'beacon-status-stop-beacon')).toMatchSnapshot();

            act(() => {
                findByTestId(component, 'beacon-status-stop-beacon').at(0).simulate('click');
            });

            expect(stopBeacon).toHaveBeenCalled();
        });

        it('renders static remaining time when displayLiveTimeRemaining is falsy', () => {
            // mock for stable snapshot
            jest.spyOn(Date, 'now').mockReturnValue(123456789);
            const beacon = new Beacon(makeBeaconInfoEvent('@user:server', '!room:server', {}, '$1'));
            const component = getComponent({ beacon, displayStatus: BeaconDisplayStatus.Active });
            expect(component.text().includes('Live until 11:17')).toBeTruthy();
        });

        it('renders live time remaining when displayLiveTimeRemaining is truthy', () => {
            // mock for stable snapshot
            jest.spyOn(Date, 'now').mockReturnValue(123456789);
            const beacon = new Beacon(makeBeaconInfoEvent('@user:server', '!room:server', {}, '$1'));
            const component = getComponent({
                beacon, displayStatus: BeaconDisplayStatus.Active,
                displayLiveTimeRemaining: true,
            });
            expect(component.text().includes('1h left')).toBeTruthy();
        });
    });
});
