
import React from 'react';
import { mount } from 'enzyme';

import '../../../skinned-sdk';
import Map from '../../../../src/components/views/location/Map';

describe('<Map />', () => {
    const defaultProps = {};
    const getComponent = (props = {}) =>
        mount(<Map {...defaultProps} {...props} />);

    it('renders', () => {
        const component = getComponent();
        expect(component).toBeTruthy();
    });
});
