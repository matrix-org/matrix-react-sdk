
import React from 'react';
import { mount } from 'enzyme';

import BeaconViewDialog from '../../../../src/components/views/beacon/BeaconViewDialog';

describe('<BeaconViewDialog />', () => {
    const defaultProps = {};
    const getComponent = (props = {}) =>
        mount(<BeaconViewDialog {...defaultProps} {...props} />);

    it('renders', () => {
        const component = getComponent();
        expect(component).toBeTruthy();
    });
});
