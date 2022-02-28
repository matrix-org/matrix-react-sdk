
import React from 'react';
import { mount } from 'enzyme';

import '../../../skinned-sdk';
import ShareType from '../../../../src/components/views/location/ShareType';

describe('<ShareType />', () => {
    const defaultProps = {};
    const getComponent = (props = {}) =>
        mount(<ShareType {...defaultProps} {...props} />);

    it('renders', () => {
        const component = getComponent();
        expect(component).toBeTruthy();
    });
});
