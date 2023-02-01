
import React from 'react';
import { mount } from 'enzyme';

import PollListItem from '../../../../../src/components/views/dialogs/polls/PollListItem';

describe('<PollListItem />', () => {
    const defaultProps = {};
    const getComponent = (props = {}) =>
        mount(<PollListItem {...defaultProps} {...props} />);

    it('renders', () => {
        const component = getComponent();
        expect(component).toBeTruthy();
    });
});
