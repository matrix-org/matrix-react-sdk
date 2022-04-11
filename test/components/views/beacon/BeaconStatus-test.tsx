
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

    it('renders active state without stop buttons', () => {
        // mock for stable snapshot
        jest.spyOn(Date, 'now').mockReturnValue(123456789);
        const beacon = new Beacon(makeBeaconInfoEvent('@user:server', '!room:server', {}, '$1'));
        const component = getComponent({ beacon, displayStatus: BeaconDisplayStatus.Active });
        expect(component).toMatchSnapshot();
    });

    it('renders active state with stop button', () => {
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
});
