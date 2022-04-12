
import React from 'react';
import { mount } from 'enzyme';

import OwnBeaconStatus from '../../../../src/components/views/location/OwnBeaconStatus';

describe('<OwnBeaconStatus />', () => {
    const defaultProps = {};
    const getComponent = (props = {}) =>
        mount(<OwnBeaconStatus {...defaultProps} {...props} />);

    it('renders', () => {
        const component = getComponent();
        expect(component).toBeTruthy();
    });
});
