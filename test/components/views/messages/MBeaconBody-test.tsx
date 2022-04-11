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
import { mount } from 'enzyme';
import { act } from 'react-dom/test-utils';
import maplibregl from 'maplibre-gl';
import {
    BeaconEvent,
    Room,
    getBeaconInfoIdentifier,
} from 'matrix-js-sdk/src/matrix';

import MBeaconBody from '../../../../src/components/views/messages/MBeaconBody';
import { getMockClientWithEventEmitter, makeBeaconEvent, makeBeaconInfoEvent } from '../../../test-utils';
import { RoomPermalinkCreator } from '../../../../src/utils/permalinks/Permalinks';
import { MediaEventHelper } from '../../../../src/utils/MediaEventHelper';
import MatrixClientContext from '../../../../src/contexts/MatrixClientContext';

describe('<MBeaconBody />', () => {
    // 14.03.2022 16:15
    const now = 1647270879403;
    // stable date for snapshots
    jest.spyOn(global.Date, 'now').mockReturnValue(now);
    const roomId = '!room:server';
    const aliceId = '@alice:server';

    const mockMap = new maplibregl.Map();
    const mockMarker = new maplibregl.Marker();

    const mockClient = getMockClientWithEventEmitter({
        getClientWellKnown: jest.fn().mockReturnValue({
            "m.tile_server": { map_style_url: 'maps.com' },
        }),
        getUserId: jest.fn().mockReturnValue(aliceId),
        getRoom: jest.fn(),
    });

    // make fresh rooms every time
    // as we update room state
    const makeRoomWithStateEvents = (stateEvents = []): Room => {
        const room1 = new Room(roomId, mockClient, aliceId);

        room1.currentState.setStateEvents(stateEvents);
        mockClient.getRoom.mockReturnValue(room1);

        return room1;
    };

    const defaultEvent = makeBeaconInfoEvent(aliceId,
        roomId,
        { isLive: true },
        '$alice-room1-1',
    );

    const defaultProps = {
        mxEvent: defaultEvent,
        highlights: [],
        highlightLink: '',
        onHeightChanged: jest.fn(),
        onMessageAllowed: jest.fn(),
        // we dont use these and they pollute the snapshots
        permalinkCreator: {} as unknown as RoomPermalinkCreator,
        mediaEventHelper: {} as unknown as MediaEventHelper,
    };

    const getComponent = (props = {}) =>
        mount(<MBeaconBody {...defaultProps} {...props} />, {
            wrappingComponent: MatrixClientContext.Provider,
            wrappingComponentProps: { value: mockClient },
        });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders stopped beacon UI for an explicitly stopped beacon', () => {
        const beaconInfoEvent = makeBeaconInfoEvent(aliceId,
            roomId,
            { isLive: false },
            '$alice-room1-1',
        );
        makeRoomWithStateEvents([beaconInfoEvent]);
        const component = getComponent({ mxEvent: beaconInfoEvent });
        expect(component.find('Map').length).toBeFalsy();
    });

    it('renders stopped beacon UI for an expired beacon', () => {
        const beaconInfoEvent = makeBeaconInfoEvent(aliceId,
            roomId,
            // puts this beacons live period in the past
            { isLive: true, timestamp: now - 600000, timeout: 500 },
            '$alice-room1-1',
        );
        makeRoomWithStateEvents([beaconInfoEvent]);
        const component = getComponent({ mxEvent: beaconInfoEvent });
        expect(component.find('Map').length).toBeFalsy();
    });

    it('renders stopped UI when a beacon event is not the latest beacon for a user', () => {
        const aliceBeaconInfo1 = makeBeaconInfoEvent(
            aliceId,
            roomId,
            // this one is a little older
            { isLive: true, timestamp: now - 500 },
            '$alice-room1-1',
        );
        aliceBeaconInfo1.event.origin_server_ts = now - 500;
        const aliceBeaconInfo2 = makeBeaconInfoEvent(
            aliceId,
            roomId,
            { isLive: true },
            '$alice-room1-2',
        );

        makeRoomWithStateEvents([aliceBeaconInfo1, aliceBeaconInfo2]);

        const component = getComponent({ mxEvent: aliceBeaconInfo1 });
        // beacon1 has been superceded by beacon2
        expect(component.find('Map').length).toBeFalsy();
    });

    it('renders stopped UI when a beacon event is replaced', () => {
        const aliceBeaconInfo1 = makeBeaconInfoEvent(
            aliceId,
            roomId,
            // this one is a little older
            { isLive: true, timestamp: now - 500 },
            '$alice-room1-1',
        );
        aliceBeaconInfo1.event.origin_server_ts = now - 500;
        const aliceBeaconInfo2 = makeBeaconInfoEvent(
            aliceId,
            roomId,
            { isLive: true },
            '$alice-room1-2',
        );

        const room = makeRoomWithStateEvents([aliceBeaconInfo1]);
        const component = getComponent({ mxEvent: aliceBeaconInfo1 });

        const beaconInstance = room.currentState.beacons.get(getBeaconInfoIdentifier(aliceBeaconInfo1));
        // update alice's beacon with a new edition
        // beacon instance emits
        act(() => {
            beaconInstance.update(aliceBeaconInfo2);
        });

        component.setProps({});

        // beacon1 has been superceded by beacon2
        expect(component.find('Map').length).toBeFalsy();
    });

    describe('on liveness change', () => {
        it('renders stopped UI when a beacon stops being live', () => {
            const aliceBeaconInfo = makeBeaconInfoEvent(
                aliceId,
                roomId,
                { isLive: true },
                '$alice-room1-1',
            );

            const room = makeRoomWithStateEvents([aliceBeaconInfo]);
            const beaconInstance = room.currentState.beacons.get(getBeaconInfoIdentifier(aliceBeaconInfo));
            const component = getComponent({ mxEvent: aliceBeaconInfo });

            act(() => {
                // @ts-ignore cheat to force beacon to not live
                beaconInstance._isLive = false;
                beaconInstance.emit(BeaconEvent.LivenessChange, false, beaconInstance);
            });

            component.setProps({});

            // stopped UI
            expect(component.find('Map').length).toBeFalsy();
        });
    });

    describe('latestLocationState', () => {
        const aliceBeaconInfo = makeBeaconInfoEvent(
            aliceId,
            roomId,
            { isLive: true },
            '$alice-room1-1',
        );

        const location1 = makeBeaconEvent(
            aliceId, { beaconInfoId: aliceBeaconInfo.getId(), geoUri: 'geo:51,41', timestamp: now + 1 },
        );
        const location2 = makeBeaconEvent(
            aliceId, { beaconInfoId: aliceBeaconInfo.getId(), geoUri: 'geo:52,42', timestamp: now + 10000 },
        );

        it('renders a live beacon without a location correctly', () => {
            makeRoomWithStateEvents([aliceBeaconInfo]);
            const component = getComponent({ mxEvent: aliceBeaconInfo });

            expect(component.find('Spinner').length).toBeTruthy();
        });

        it('updates latest location', () => {
            const room = makeRoomWithStateEvents([aliceBeaconInfo]);
            const component = getComponent({ mxEvent: aliceBeaconInfo });

            const beaconInstance = room.currentState.beacons.get(getBeaconInfoIdentifier(aliceBeaconInfo));
            act(() => {
                beaconInstance.addLocations([location1]);
                component.setProps({});
            });

            expect(mockMap.setCenter).toHaveBeenCalledWith({ lat: 51, lon: 41 });
            expect(mockMarker.setLngLat).toHaveBeenCalledWith({ lat: 51, lon: 41 });

            act(() => {
                beaconInstance.addLocations([location2]);
                component.setProps({});
            });

            expect(mockMap.setCenter).toHaveBeenCalledWith({ lat: 52, lon: 42 });
            expect(mockMarker.setLngLat).toHaveBeenCalledWith({ lat: 52, lon: 42 });
        });
    });
});
