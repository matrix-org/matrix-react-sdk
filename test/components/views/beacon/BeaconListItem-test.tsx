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
import {
    Beacon,
    RoomMember,
    MatrixEvent,
} from 'matrix-js-sdk/src/matrix';
import { LocationAssetType } from 'matrix-js-sdk/src/@types/location';
import { act } from 'react-dom/test-utils';

import BeaconListItem from '../../../../src/components/views/beacon/BeaconListItem';
import MatrixClientContext from '../../../../src/contexts/MatrixClientContext';
import {
    findByTestId,
    getMockClientWithEventEmitter,
    makeBeaconEvent,
    makeBeaconInfoEvent,
    makeRoomWithBeacons,
} from '../../../test-utils';

describe('<BeaconListItem />', () => {
    // 14.03.2022 16:15
    const now = 1647270879403;
    // go back in time to create beacons and locations in the past
    jest.spyOn(global.Date, 'now').mockReturnValue(now - 600000);
    const roomId = '!room:server';
    const aliceId = '@alice:server';

    const mockClient = getMockClientWithEventEmitter({
        getUserId: jest.fn().mockReturnValue(aliceId),
        getRoom: jest.fn(),
        isGuest: jest.fn().mockReturnValue(false),
    });

    const aliceBeaconEvent = makeBeaconInfoEvent(aliceId,
        roomId,
        { isLive: true },
        '$alice-room1-1',
    );
    const alicePinBeaconEvent = makeBeaconInfoEvent(aliceId,
        roomId,
        { isLive: true, assetType: LocationAssetType.Pin, description: "Alice's car" },
        '$alice-room1-1',
    );
    const pinBeaconWithoutDescription = makeBeaconInfoEvent(aliceId,
        roomId,
        { isLive: true, assetType: LocationAssetType.Pin },
        '$alice-room1-1',
    );

    const aliceLocation1 = makeBeaconEvent(
        aliceId, { beaconInfoId: aliceBeaconEvent.getId(), geoUri: 'geo:51,41', timestamp: now - 1 },
    );
    const aliceLocation2 = makeBeaconEvent(
        aliceId, { beaconInfoId: aliceBeaconEvent.getId(), geoUri: 'geo:52,42', timestamp: now - 500000 },
    );

    const defaultProps = {
        beacon: new Beacon(aliceBeaconEvent),
    };

    const getComponent = (props = {}) =>
        mount(<BeaconListItem {...defaultProps} {...props} />, {
            wrappingComponent: MatrixClientContext.Provider,
            wrappingComponentProps: { value: mockClient },
        });

    const setupRoomWithBeacons = (beaconInfoEvents: MatrixEvent[], locationEvents?: MatrixEvent[]): Beacon[] => {
        const beacons = makeRoomWithBeacons(roomId, mockClient, beaconInfoEvents, locationEvents);

        const member = new RoomMember(roomId, aliceId);
        member.name = `Alice`;
        const room = mockClient.getRoom(roomId);
        jest.spyOn(room, 'getMember').mockReturnValue(member);

        return beacons;
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(Date, 'now').mockReturnValue(now);
    });

    it('renders null when beacon is not live', () => {
        const notLiveBeacon = makeBeaconInfoEvent(aliceId,
            roomId,
            { isLive: false },
        );
        const [beacon] = setupRoomWithBeacons([notLiveBeacon]);
        const component = getComponent({ beacon });
        expect(component.html()).toBeNull();
    });

    it('renders null when beacon has no location', () => {
        const [beacon] = setupRoomWithBeacons([aliceBeaconEvent]);
        const component = getComponent({ beacon });
        expect(component.html()).toBeNull();
    });

    describe('when a beacon is live and has locations', () => {
        it('renders beacon info', () => {
            const [beacon] = setupRoomWithBeacons([alicePinBeaconEvent], [aliceLocation1]);
            const component = getComponent({ beacon });
            expect(component.html()).toMatchSnapshot();
        });

        describe('non-self beacons', () => {
            it('uses beacon description as beacon name', () => {
                const [beacon] = setupRoomWithBeacons([alicePinBeaconEvent], [aliceLocation1]);
                const component = getComponent({ beacon });
                expect(component.find('BeaconStatus').props().label).toEqual("Alice's car");
            });

            it('uses beacon owner mxid as beacon name for a beacon without description', () => {
                const [beacon] = setupRoomWithBeacons([pinBeaconWithoutDescription], [aliceLocation1]);
                const component = getComponent({ beacon });
                expect(component.find('BeaconStatus').props().label).toEqual(aliceId);
            });

            it('renders location icon', () => {
                const [beacon] = setupRoomWithBeacons([alicePinBeaconEvent], [aliceLocation1]);
                const component = getComponent({ beacon });
                expect(component.find('StyledLiveBeaconIcon').length).toBeTruthy();
            });
        });

        describe('self locations', () => {
            it('renders beacon owner avatar', () => {
                const [beacon] = setupRoomWithBeacons([aliceBeaconEvent], [aliceLocation1]);
                const component = getComponent({ beacon });
                expect(component.find('MemberAvatar').length).toBeTruthy();
            });

            it('uses beacon owner name as beacon name', () => {
                const [beacon] = setupRoomWithBeacons([aliceBeaconEvent], [aliceLocation1]);
                const component = getComponent({ beacon });
                expect(component.find('BeaconStatus').props().label).toEqual('Alice');
            });
        });

        describe('on location updates', () => {
            it('updates last updated time on location updated', () => {
                const [beacon] = setupRoomWithBeacons([aliceBeaconEvent], [aliceLocation2]);
                const component = getComponent({ beacon });

                expect(component.find('.mx_BeaconListItem_lastUpdated').text()).toEqual('Updated 9 minutes ago');

                // update to a newer location
                act(() => {
                    beacon.addLocations([aliceLocation1]);
                    component.setProps({});
                });

                expect(component.find('.mx_BeaconListItem_lastUpdated').text()).toEqual('Updated a few seconds ago');
            });
        });

        describe('interactions', () => {
            it('does not call onClick handler when clicking share button', () => {
                const [beacon] = setupRoomWithBeacons([alicePinBeaconEvent], [aliceLocation1]);
                const onClick = jest.fn();
                const component = getComponent({ beacon, onClick });

                act(() => {
                    findByTestId(component, 'open-location-in-osm').at(0).simulate('click');
                });
                expect(onClick).not.toHaveBeenCalled();
            });

            it('calls onClick handler when clicking outside of share buttons', () => {
                const [beacon] = setupRoomWithBeacons([alicePinBeaconEvent], [aliceLocation1]);
                const onClick = jest.fn();
                const component = getComponent({ beacon, onClick });

                act(() => {
                    // click the beacon name
                    component.find('.mx_BeaconStatus_description').simulate('click');
                });
                expect(onClick).toHaveBeenCalled();
            });
        });
    });
});
