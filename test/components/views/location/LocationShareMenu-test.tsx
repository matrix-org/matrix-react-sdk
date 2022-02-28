
import React from 'react';
import { mount } from 'enzyme';
import { RoomMember } from 'matrix-js-sdk';

import '../../../skinned-sdk';
import LocationShareMenu from '../../../../src/components/views/location/LocationShareMenu';
import MatrixClientContext from '../../../../src/contexts/MatrixClientContext';
import { ChevronFace } from '../../../../src/components/structures/ContextMenu';

describe('<LocationShareMenu />', () => {
    const mockClient = {
        on: jest.fn(),
    };

    const defaultProps = {
        menuPosition: {
            top: 1, left: 1,
            chevronFace: ChevronFace.Bottom,
        },
        onFinished: jest.fn(),
        openMenu: jest.fn(),
        roomId: '!room:server.org',
        sender: { id: '@ernie:server.org' } as unknown as RoomMember,
    };
    const getComponent = (props = {}) =>
        mount(<LocationShareMenu {...defaultProps} {...props} />, {
            wrappingComponent: MatrixClientContext.Provider,
            wrappingComponentProps: { value: mockClient },
        });

    it('renders', () => {
        const component = getComponent();
        expect(component).toMatchSnapshot();
    });
});
