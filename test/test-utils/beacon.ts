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

import { makeBeaconInfoContent, makeBeaconContent } from "matrix-js-sdk/src/content-helpers";
import { MatrixEvent } from "matrix-js-sdk/src/matrix";
import { M_BEACON, M_BEACON_INFO } from "matrix-js-sdk/src/@types/beacon";
import { LocationAssetType } from "matrix-js-sdk/src/@types/location";
import { MockedObject } from "jest-mock";

type InfoContentProps = {
    timeout: number;
    isLive?: boolean;
    assetType?: LocationAssetType;
    description?: string;
    timestamp?: number;
};
const DEFAULT_INFO_CONTENT_PROPS: InfoContentProps = {
    timeout: 3600000,
};

let count = 1;

/**
 * Create an m.beacon_info event
 * all required properties are mocked
 * override with contentProps
 */
export const makeBeaconInfoEvent = (
    sender: string,
    roomId: string,
    contentProps: Partial<InfoContentProps> = {},
    eventId?: string,
    eventTypeSuffix?: string,
): MatrixEvent => {
    const {
        timeout,
        isLive,
        description,
        assetType,
        timestamp,
    } = {
        ...DEFAULT_INFO_CONTENT_PROPS,
        ...contentProps,
    };
    const event = new MatrixEvent({
        type: `${M_BEACON_INFO.name}.${sender}.${eventTypeSuffix || ++count}`,
        room_id: roomId,
        state_key: sender,
        content: makeBeaconInfoContent(timeout, isLive, description, assetType, timestamp),
    });

    // live beacons use the beacon_info event id
    // set or default this
    event.replaceLocalEventId(eventId || `$${Math.random()}-${Math.random()}`);

    return event;
};

type ContentProps = {
    geoUri: string;
    timestamp: number;
    beaconInfoId: string;
    description?: string;
};
const DEFAULT_CONTENT_PROPS: ContentProps = {
    geoUri: 'geo:-36.24484561954707,175.46884959563613;u=10',
    timestamp: 123,
    beaconInfoId: '$123',
};

/**
 * Create an m.beacon event
 * all required properties are mocked
 * override with contentProps
 */
export const makeBeaconEvent = (
    sender: string,
    contentProps: Partial<ContentProps> = {},
): MatrixEvent => {
    const { geoUri, timestamp, beaconInfoId, description } = {
        ...DEFAULT_CONTENT_PROPS,
        ...contentProps,
    };

    return new MatrixEvent({
        type: M_BEACON.name,
        sender,
        content: makeBeaconContent(geoUri, timestamp, beaconInfoId, description),
    });
};

/**
 * Create a mock geolocation position
 * defaults all required properties
 */
export const makeGeolocationPosition = (
    { timestamp, coords }:
        { timestamp?: number, coords?: Partial<GeolocationCoordinates> },
): GeolocationPosition => ({
    timestamp: timestamp ?? 1647256791840,
    coords: {
        accuracy: 1,
        latitude: 54.001927,
        longitude: -8.253491,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        ...coords,
    },
});

/**
 * Creates a basic mock of Geolocation
 * sets navigator.geolocation to the mock
 * and returns mock
 */
export const mockGeolocation = (): MockedObject<Geolocation> => {
    const mockGeolocation = {
        clearWatch: jest.fn(),
        getCurrentPosition: jest.fn().mockImplementation(callback => callback(makeGeolocationPosition({}))),
        watchPosition: jest.fn().mockImplementation(callback => callback(makeGeolocationPosition({}))),
    } as unknown as MockedObject<Geolocation>;

    // jest jsdom does not provide geolocation
    // @ts-ignore illegal assignment to readonly property
    navigator.geolocation = mockGeolocation;

    return mockGeolocation;
};

/**
 * Creates a mock watchPosition implementation
 * that calls success callback at the provided delays
 * ```
 * geolocation.watchPosition.mockImplementation([0, 1000, 5000, 50])
 * ```
 * will call the provided handler with a mock position at
 * next tick, 1000ms, 6000ms, 6050ms
 */
export const watchPositionMockImplementation = (delays: number[]) => {
    return (callback: PositionCallback) => {
        const position = makeGeolocationPosition({});

        let totalDelay = 0;
        delays.map(delayMs => {
            totalDelay += delayMs;
            const timeout = setTimeout(() => {
                callback({ ...position, timestamp: position.timestamp + totalDelay });
            }, totalDelay);
            return timeout;
        });
    };
};
