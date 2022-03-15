import EventEmitter from "events";
import { MethodKeysOf, mocked, MockedObject, MockInstance } from "jest-mock";

import { MatrixClient } from "matrix-js-sdk/src/matrix";
import { MatrixClientPeg } from "../../src/MatrixClientPeg";

/**
 * Mock client with real event emitter
 * useful for testing code that listens 
 * to MatrixClient events
 */
export class MockClientWithEventEmitter extends EventEmitter {
    constructor(mockProperties: Partial<Record<MethodKeysOf<MatrixClient>, unknown>> = {}) {
        super();

        Object.assign(this, mockProperties);
    }
}

/**
 * - make a mock client
 * - cast the type to mocked(MatrixClient)
 * - spy on MatrixClientPeg.get to return the mock
 * eg
 * ```
 * const mockClient = getMockClientWithEventEmitter({
        getUserId: jest.fn().mockReturnValue(aliceId),
    });
 * ```
 */
export const getMockClientWithEventEmitter = (mockProperties: Partial<Record<MethodKeysOf<MatrixClient>, unknown>>): MatrixClient => {
    const mock = mocked(new MockClientWithEventEmitter(mockProperties) as unknown as MatrixClient);

    jest.spyOn(MatrixClientPeg, 'get').mockReturnValue(mock);
    return mock;
}

