
import React from 'react';
import { mount } from 'enzyme';

import '../../../skinned-sdk';
import ShareDialogButtons from '../../../../src/components/views/location/ShareDialogButtons';

describe('<ShareDialogButtons />', () => {
    const defaultProps = {};
    const getComponent = (props = {}) =>
        mount(<ShareDialogButtons {...defaultProps} {...props} />);

    it('renders', () => {
        const component = getComponent();
        expect(component).toBeTruthy();
    });
});
