
import React from 'react';
import { mount } from 'enzyme';

import SortedDeviceList from '../../../../../src/components/views/settings/devices/SortedDeviceList';

describe('<SortedDeviceList />', () => {
    const defaultProps = {};
    const getComponent = (props = {}) =>
        mount(<SortedDeviceList {...defaultProps} {...props} />);

    it('renders', () => {
        const component = getComponent();
        expect(component).toBeTruthy();
    });
});
