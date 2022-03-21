
import React from 'react';
import { mount } from 'enzyme';

import '../../../skinned-sdk';
import StyledLiveBeaconIcon from '../../../../src/components/views/beacon/StyledLiveBeaconIcon';

describe('<StyledLiveBeaconIcon />', () => {
    const defaultProps = {};
    const getComponent = (props = {}) =>
        mount(<StyledLiveBeaconIcon {...defaultProps} {...props} />);

    it('renders', () => {
        const component = getComponent();
        expect(component).toBeTruthy();
    });
});
