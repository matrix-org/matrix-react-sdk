
import React from 'react';
import { mount } from 'enzyme';

import SecurityRecommendations from '../../../../../src/components/views/settings/devices/SecurityRecommendations';

describe('<SecurityRecommendations />', () => {
    const defaultProps = {};
    const getComponent = (props = {}) =>
        mount(<SecurityRecommendations {...defaultProps} {...props} />);

    it('renders', () => {
        const component = getComponent();
        expect(component).toBeTruthy();
    });
});
