
import React from 'react';
import { mount } from 'enzyme';

import '../../../skinned-sdk';
import ShareType, { LocationShareType } from '../../../../src/components/views/location/ShareType';
import MatrixClientContext from '../../../../src/contexts/MatrixClientContext';

jest.mock('../../../../src/stores/OwnProfileStore', () => ({
    OwnProfileStore: {
        instance: {
            displayName: 'Ernie',
            getHttpAvatarUrl: jest.fn().mockReturnValue('image.com/img'),
        },
    },
}));

describe('<ShareType />', () => {
    const userId = '@ernie:server.org';
    const mockClient = {
        on: jest.fn(),
        getUserId: jest.fn().mockReturnValue(userId),
        getClientWellKnown: jest.fn().mockResolvedValue({
            map_style_url: 'maps.com',
        }),
    };

    const defaultProps = {
        setShareType: jest.fn(),
        enabledShareTypes: [
            LocationShareType.Own,
            LocationShareType.Pin,
        ],
    };
    const getComponent = (props = {}) =>
        mount(<ShareType {...defaultProps} {...props} />, {
            wrappingComponent: MatrixClientContext.Provider,
            wrappingComponentProps: { value: mockClient },
        });

    it('renders', () => {
        const component = getComponent();
        expect(component).toBeTruthy();
    });
});
