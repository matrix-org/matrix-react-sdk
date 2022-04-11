
import React from 'react';
import { mount } from 'enzyme';

import BeaconStatusChin from '../../../../src/components/views/beacon/BeaconStatusChin';

describe('<BeaconStatusChin />', () => {
    const defaultProps = {};
    const getComponent = (props = {}) =>
        mount(<BeaconStatusChin {...defaultProps} {...props} />);

    it('renders', () => {
        const component = getComponent();
        expect(component).toBeTruthy();
    });
});
