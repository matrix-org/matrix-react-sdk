
import React from 'react';
import { mount } from 'enzyme';

import { FilterTabGroup } from '../../../../../src/components/views/dialogs/polls/FilterTabGroup';

describe('<FilterTabSwitch />', () => {
    const defaultProps = {};
    const getComponent = (props = {}) =>
        mount(<FilterTabSwitch {...defaultProps} {...props} />);

    it('renders', () => {
        const component = getComponent();
        expect(component).toBeTruthy();
    });
});
