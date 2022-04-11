
import React from 'react';
import { mount } from 'enzyme';
import { RoomMember } from 'matrix-js-sdk/src/matrix';
import { LocationAssetType } from 'matrix-js-sdk/src/@types/location';

import LocationViewDialog from '../../../../src/components/views/location/LocationViewDialog';
import { getMockClientWithEventEmitter, makeLocationEvent } from '../../../test-utils';

describe('<LocationViewDialog />', () => {
    const roomId = '!room:server';
    const userId = '@user:server';
    const mockClient = getMockClientWithEventEmitter({
        getClientWellKnown: jest.fn().mockReturnValue({
            "m.tile_server": { map_style_url: 'maps.com' },
        }),
        isGuest: jest.fn().mockReturnValue(false),
    });
    const defaultEvent = makeLocationEvent("geo:51.5076,-0.1276", LocationAssetType.Pin);
    const defaultProps = {
        matrixClient: mockClient,
        mxEvent: defaultEvent,
        onFinished: jest.fn(),
    };
    const getComponent = (props = {}) =>
        mount(<LocationViewDialog {...defaultProps} {...props} />);

    it('renders map correctly', () => {
        const component = getComponent();
        expect(component).toMatchSnapshot();
    });

    it('renders marker correctly for self share', () => {
        const selfShareEvent = makeLocationEvent("geo:51.5076,-0.1276", LocationAssetType.Self);
        const member = new RoomMember(roomId, userId);
        // @ts-ignore cheat assignment to property
        selfShareEvent.sender = member;
        const component = getComponent({ mxEvent: selfShareEvent });
        expect(component.find('SmartMarker').props()['roomMember']).toEqual(member);
    });
});
