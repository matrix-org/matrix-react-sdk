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

import { logger } from "matrix-js-sdk/src/logger";

import {
    GeolocationError,
    getGeoUri,
    mapGeolocationError,
    mapGeolocationPositionToTimedGeo,
    watchPosition,
} from "../../../src/utils/beacon";
import { makeGeolocationPosition, mockGeolocation } from "../../test-utils/beacon";

describe('geolocation utilities', () => {
    let geolocation;
    const defaultPosition = makeGeolocationPosition({});

    // https://developer.mozilla.org/en-US/docs/Web/API/GeolocationPositionError
    const getMockGeolocationPositionError = (code, message) => ({
        code, message,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
    });

    beforeEach(() => {
        geolocation = mockGeolocation();
    });

    afterEach(() => {
        jest.spyOn(logger, 'error').mockRestore();
    });

    describe('getGeoUri', () => {
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

    describe('mapGeolocationError', () => {
        beforeEach(() => {
            // suppress expected errors from test log
            jest.spyOn(logger, 'error').mockImplementation(() => { });
        });

        it('returns default for other error', () => {
            const error = new Error('oh no..');
            expect(mapGeolocationError(error)).toEqual(GeolocationError.Default);
        });

        it('returns unavailable for unavailable error', () => {
            const error = new Error(GeolocationError.Unavailable);
            expect(mapGeolocationError(error)).toEqual(GeolocationError.Unavailable);
        });

        it('maps geo error permissiondenied correctly', () => {
            const error = getMockGeolocationPositionError(1, 'message');
            expect(mapGeolocationError(error)).toEqual(GeolocationError.PermissionDenied);
        });

        it('maps geo position unavailable error correctly', () => {
            const error = getMockGeolocationPositionError(2, 'message');
            expect(mapGeolocationError(error)).toEqual(GeolocationError.PositionUnavailable);
        });

        it('maps geo timeout error correctly', () => {
            const error = getMockGeolocationPositionError(3, 'message');
            expect(mapGeolocationError(error)).toEqual(GeolocationError.Timeout);
        });
    });

    describe('mapGeolocationPositionToTimedGeo()', () => {
        it('maps geolocation position correctly', () => {
            expect(mapGeolocationPositionToTimedGeo(defaultPosition)).toEqual({
                timestamp: 1647256791840, geoUri: 'geo:54.001927,-8.253491;u=1',
            });
        });
    });

    describe('watchPosition()', () => {
        it('throws with unavailable error when geolocation is not available', () => {
            // suppress expected errors from test log
            jest.spyOn(logger, 'error').mockImplementation(() => { });

            // remove the mock we added
            // @ts-ignore illegal assignment to readonly property
            navigator.geolocation = undefined;

            const positionHandler = jest.fn();
            const errorHandler = jest.fn();

            expect(() => watchPosition(positionHandler, errorHandler)).toThrow(GeolocationError.Unavailable);
        });

        it('sets up position handler with correct options', () => {
            const positionHandler = jest.fn();
            const errorHandler = jest.fn();
            watchPosition(positionHandler, errorHandler);

            const [, , options] = geolocation.watchPosition.mock.calls[0];
            expect(options).toEqual({
                maximumAge: 1000,
                timeout: 5000,
            });
        });

        it('returns clearWatch function', () => {
            const watchId = 1;
            geolocation.watchPosition.mockReturnValue(watchId);
            const positionHandler = jest.fn();
            const errorHandler = jest.fn();
            const clearWatch = watchPosition(positionHandler, errorHandler);

            clearWatch();

            expect(geolocation.clearWatch).toHaveBeenCalledWith(watchId);
        });

        it('calls position handler with position', () => {
            const positionHandler = jest.fn();
            const errorHandler = jest.fn();
            watchPosition(positionHandler, errorHandler);

            expect(positionHandler).toHaveBeenCalledWith(defaultPosition);
        });

        it('maps geolocation position error and calls error handler', () => {
            // suppress expected errors from test log
            jest.spyOn(logger, 'error').mockImplementation(() => { });
            geolocation.watchPosition.mockImplementation(
                (_callback, error) => error(getMockGeolocationPositionError(1, 'message')),
            );
            const positionHandler = jest.fn();
            const errorHandler = jest.fn();
            watchPosition(positionHandler, errorHandler);

            expect(errorHandler).toHaveBeenCalledWith(GeolocationError.PermissionDenied);
        });
    });
});
