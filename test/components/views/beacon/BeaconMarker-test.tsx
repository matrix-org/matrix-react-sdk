
import React from 'react';
import { mount } from 'enzyme';

import BeaconMarker from '../../../../src/components/views/beacon/BeaconMarker';

describe('<BeaconMarker />', () => {
    const defaultProps = {};
    const getComponent = (props = {}) =>
        mount(<BeaconMarker {...defaultProps} {...props} />);

    it('renders', () => {
        const component = getComponent();
        expect(component).toBeTruthy();
    });
});
