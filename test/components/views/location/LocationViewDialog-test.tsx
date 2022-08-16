/*
Copyright 2022 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import React from 'react';
// eslint-disable-next-line deprecate/import
import { mount } from 'enzyme';
import { RoomMember } from 'matrix-js-sdk/src/matrix';
import { LocationAssetType } from 'matrix-js-sdk/src/@types/location';
import maplibregl from 'maplibre-gl';

import LocationViewDialog from '../../../../src/components/views/location/LocationViewDialog';
import { TILE_SERVER_WK_KEY } from '../../../../src/utils/WellKnownUtils';
import { getMockClientWithEventEmitter, makeLocationEvent } from '../../../test-utils';

describe('<LocationViewDialog />', () => {
    const roomId = '!room:server';
    const userId = '@user:server';
    const mockClient = getMockClientWithEventEmitter({
        getClientWellKnown: jest.fn().mockReturnValue({
            [TILE_SERVER_WK_KEY.name]: { map_style_url: 'maps.com' },
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

    beforeAll(() => {
        maplibregl.AttributionControl = jest.fn();
    });

    it('renders map correctly', () => {
        const component = getComponent();
        expect(component.find('Map')).toMatchSnapshot();
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
