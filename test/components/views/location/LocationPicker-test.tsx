/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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
import maplibregl from "maplibre-gl";
import { mount } from "enzyme";
import { act } from 'react-dom/test-utils';
import { RoomMember } from "matrix-js-sdk/src/models/room-member";
import { MatrixClient } from 'matrix-js-sdk/src/client';
import { mocked } from 'jest-mock';
import { logger } from 'matrix-js-sdk/src/logger';

import "../../../skinned-sdk"; // Must be first for skinning to work
import LocationPicker, { getGeoUri } from "../../../../src/components/views/location/LocationPicker";
import { LocationShareType } from "../../../../src/components/views/location/shareLocation";
import MatrixClientContext from '../../../../src/contexts/MatrixClientContext';
import { MatrixClientPeg } from '../../../../src/MatrixClientPeg';
import { findByTestId } from '../../../test-utils';
import { findMapStyleUrl } from '../../../../src/components/views/location/findMapStyleUrl';
import { LocationShareError } from '../../../../src/components/views/location/LocationShareErrors';

jest.mock('../../../../src/components/views/location/findMapStyleUrl', () => ({
    findMapStyleUrl: jest.fn().mockReturnValue('tileserver.com'),
}));

describe("LocationPicker", () => {
    describe("getGeoUri", () => {
        it("Renders a URI with only lat and lon", () => {
            const pos = {
                latitude: 43.2,
                longitude: 12.4,
                altitude: undefined,
                accuracy: undefined,

                timestamp: 12334,
            };
            expect(getGeoUri(pos)).toEqual("geo:43.2,12.4");
        });

        it("Nulls in location are not shown in URI", () => {
            const pos = {
                latitude: 43.2,
                longitude: 12.4,
                altitude: null,
                accuracy: null,

                timestamp: 12334,
            };
            expect(getGeoUri(pos)).toEqual("geo:43.2,12.4");
        });

        it("Renders a URI with 3 coords", () => {
            const pos = {
                latitude: 43.2,
                longitude: 12.4,
                altitude: 332.54,
                accuracy: undefined,
                timestamp: 12334,
            };
            expect(getGeoUri(pos)).toEqual("geo:43.2,12.4,332.54");
        });

        it("Renders a URI with accuracy", () => {
            const pos = {
                latitude: 43.2,
                longitude: 12.4,
                altitude: undefined,
                accuracy: 21,
                timestamp: 12334,
            };
            expect(getGeoUri(pos)).toEqual("geo:43.2,12.4;u=21");
        });

        it("Renders a URI with accuracy and altitude", () => {
            const pos = {
                latitude: 43.2,
                longitude: 12.4,
                altitude: 12.3,
                accuracy: 21,
                timestamp: 12334,
            };
            expect(getGeoUri(pos)).toEqual("geo:43.2,12.4,12.3;u=21");
        });
    });

    describe('<LocationPicker />', () => {
        const roomId = '!room:server.org';
        const userId = '@user:server.org';
        const sender = new RoomMember(roomId, userId);
        const defaultProps = {
            sender,
            shareType: LocationShareType.Own,
            onChoose: jest.fn(),
            onFinished: jest.fn(),
        };
        const mockClient = {
            on: jest.fn(),
            off: jest.fn(),
            isGuest: jest.fn(),
            getClientWellKnown: jest.fn(),
        };
        const getComponent = (props = {}) => mount(<LocationPicker {...defaultProps} {...props} />, {
            wrappingComponent: MatrixClientContext.Provider,
            wrappingComponentProps: { value: mockClient },
        });

        const mockMap = new maplibregl.Map();
        const mockGeolocate = new maplibregl.GeolocateControl();
        const mockMarker = new maplibregl.Marker();

        const mockGeolocationPosition = {
            coords: {
                latitude: 43.2,
                longitude: 12.4,
                altitude: 12.3,
                accuracy: 21,
            },
            timestamp: 123,
        };
        const mockClickEvent = {
            lngLat: {
                lat: 43.2,
                lng: 12.4,
            },
        };

        beforeEach(() => {
            jest.spyOn(logger, 'error').mockRestore();
            jest.spyOn(MatrixClientPeg, 'get').mockReturnValue(mockClient as unknown as MatrixClient);
            jest.clearAllMocks();
            mocked(mockMap).addControl.mockReset();
            mocked(findMapStyleUrl).mockReturnValue('tileserver.com');
        });

        it('displays error when map emits an error', () => {
            // suppress expected error log
            jest.spyOn(logger, 'error').mockImplementation(() => { });
            const wrapper = getComponent();

            act(() => {
                // @ts-ignore
                mocked(mockMap).emit('error', { error: 'Something went wrong' });
                wrapper.setProps({});
            });

            expect(findByTestId(wrapper, 'location-picker-error').find('p').text()).toEqual(
                "This homeserver is not configured correctly to display maps, "
                + "or the configured map server may be unreachable.",
            );
        });

        it('displays error when map display is not configured properly', () => {
            // suppress expected error log
            jest.spyOn(logger, 'error').mockImplementation(() => { });
            mocked(findMapStyleUrl).mockImplementation(() => {
                throw new Error(LocationShareError.MapStyleUrlNotConfigured);
            });

            const wrapper = getComponent();
            wrapper.setProps({});

            expect(findByTestId(wrapper, 'location-picker-error').find('p').text()).toEqual(
                "This homeserver is not configured to display maps.",
            );
        });

        it('displays error when map setup throws', () => {
            // suppress expected error log
            jest.spyOn(logger, 'error').mockImplementation(() => { });

            // throw an error
            mocked(mockMap).addControl.mockImplementation(() => { throw new Error('oups'); });

            const wrapper = getComponent();
            wrapper.setProps({});

            expect(findByTestId(wrapper, 'location-picker-error').find('p').text()).toEqual(
                "This homeserver is not configured correctly to display maps, "
                + "or the configured map server may be unreachable.",
            );
        });

        it('initiates map with geolocation', () => {
            getComponent();

            expect(mockMap.addControl).toHaveBeenCalledWith(mockGeolocate);
            act(() => {
                // @ts-ignore
                mocked(mockMap).emit('load');
            });

            expect(mockGeolocate.trigger).toHaveBeenCalled();
        });

        const testUserLocationShareTypes = (shareType: LocationShareType.Own | LocationShareType.Live) => {
            describe(`for ${shareType} location share type`, () => {
                it('closes and displays error when geolocation errors', () => {
                    // suppress expected error log
                    jest.spyOn(logger, 'error').mockImplementation(() => { });
                    const onFinished = jest.fn();
                    getComponent({ onFinished, shareType });

                    expect(mockMap.addControl).toHaveBeenCalledWith(mockGeolocate);
                    act(() => {
                        // @ts-ignore
                        mockMap.emit('load');
                        // @ts-ignore
                        mockGeolocate.emit('error', {});
                    });

                    // dialog is closed on error
                    expect(onFinished).toHaveBeenCalled();
                });

                it('sets position on geolocate event', () => {
                    const wrapper = getComponent({ shareType });
                    act(() => {
                        // @ts-ignore
                        mocked(mockGeolocate).emit('geolocate', mockGeolocationPosition);
                        wrapper.setProps({});
                    });

                    // marker added
                    expect(maplibregl.Marker).toHaveBeenCalled();
                    expect(mockMarker.setLngLat).toHaveBeenCalledWith(new maplibregl.LngLat(
                        12.4, 43.2,
                    ));
                    // submit button is enabled when position is truthy
                    expect(findByTestId(wrapper, 'location-picker-submit-button').at(0).props().disabled).toBeFalsy();
                    expect(wrapper.find('MemberAvatar').length).toBeTruthy();
                });

                it('submits location', () => {
                    const onChoose = jest.fn();
                    const wrapper = getComponent({ onChoose, shareType });
                    act(() => {
                        // @ts-ignore
                        mocked(mockGeolocate).emit('geolocate', mockGeolocationPosition);
                        // make sure button is enabled
                        wrapper.setProps({});
                    });

                    act(() => {
                        findByTestId(wrapper, 'location-picker-submit-button').at(0).simulate('click');
                    });

                    // content of this call is tested in LocationShareMenu-test
                    expect(onChoose).toHaveBeenCalled();
                });
            });
        };

        testUserLocationShareTypes(LocationShareType.Own);
        testUserLocationShareTypes(LocationShareType.Live);

        describe('for Pin drop location share type', () => {
            const shareType = LocationShareType.Pin;
            it('initiates map with geolocation', () => {
                getComponent({ shareType });

                expect(mockMap.addControl).toHaveBeenCalledWith(mockGeolocate);
                act(() => {
                    // @ts-ignore
                    mocked(mockMap).emit('load');
                });

                expect(mockGeolocate.trigger).toHaveBeenCalled();
            });

            it('removes geolocation control on geolocation error', () => {
                // suppress expected error log
                jest.spyOn(logger, 'error').mockImplementation(() => { });
                const onFinished = jest.fn();
                getComponent({ onFinished, shareType });
                act(() => {
                    // @ts-ignore
                    mockMap.emit('load');
                    // @ts-ignore
                    mockGeolocate.emit('error', {});
                });

                expect(mockMap.removeControl).toHaveBeenCalledWith(mockGeolocate);
                // dialog is not closed
                expect(onFinished).not.toHaveBeenCalled();
            });

            it('does not set position on geolocate event', () => {
                getComponent({ shareType });
                act(() => {
                    // @ts-ignore
                    mocked(mockGeolocate).emit('geolocate', mockGeolocationPosition);
                });

                // marker added
                expect(maplibregl.Marker).not.toHaveBeenCalled();
            });

            it('sets position on click event', () => {
                const wrapper = getComponent({ shareType });
                act(() => {
                    // @ts-ignore
                    mocked(mockMap).emit('click', mockClickEvent);
                    wrapper.setProps({});
                });

                // marker added
                expect(maplibregl.Marker).toHaveBeenCalled();
                expect(mockMarker.setLngLat).toHaveBeenCalledWith(new maplibregl.LngLat(
                    12.4, 43.2,
                ));

                // marker is set, icon not avatar
                expect(wrapper.find('.mx_MLocationBody_markerIcon').length).toBeTruthy();
            });

            it('submits location', () => {
                const onChoose = jest.fn();
                const wrapper = getComponent({ onChoose, shareType });
                act(() => {
                    // @ts-ignore
                    mocked(mockMap).emit('click', mockClickEvent);
                    wrapper.setProps({});
                });

                act(() => {
                    findByTestId(wrapper, 'location-picker-submit-button').at(0).simulate('click');
                });

                // content of this call is tested in LocationShareMenu-test
                expect(onChoose).toHaveBeenCalled();
            });
        });
    });
});
