/*
Copyright 2018 New Vector Ltd

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

import { MatrixEvent } from 'matrix-js-sdk/src/matrix';

import { DecryptionFailureTracker } from '../src/DecryptionFailureTracker';
import defaultDispatcher from "../src/dispatcher/dispatcher";

expect.extend({
    setContaining(received, expected) {
        if (received.has(expected)) {
            return {
                message: () => `expected ${received} not to contain ${expected}`,
                pass: true,
            };
        } else {
            return {
                message: () => `expected ${received} to contain ${expected}`,
                pass: false,
            };
        }
    },
});

class MockDecryptionError extends Error {
    public readonly errcode: string;

    constructor(code?: string) {
        super();

        this.errcode = code || 'MOCK_DECRYPTION_ERROR';
    }
}

function createFailedDecryptionEvent() {
    const event = new MatrixEvent({
        event_id: "event-id-" + Math.random().toString(16).slice(2),
    });
    // @ts-ignore - private
    event.setClearData(event.badEncryptedMessage(":("));
    return event;
}

describe('DecryptionFailureTracker', function() {
    const spyDispatcher = jest.spyOn(defaultDispatcher, "dispatch");
    beforeEach(() => {
        spyDispatcher.mockReset();
    });

    it('tracks a failed decryption for a visible event', function(done) {
        const failedDecryptionEvent = createFailedDecryptionEvent();

        let count = 0;
        // @ts-ignore - private constructor
        const tracker = new DecryptionFailureTracker((total: number) => count += total, () => "UnknownError");

        tracker.addVisibleEvent(failedDecryptionEvent);

        const err = new MockDecryptionError();
        tracker.eventDecrypted(failedDecryptionEvent, err);

        expect(spyDispatcher).toHaveBeenCalledWith({
            action: 'update_visible_decryption_failures',
            // @ts-ignore - jest expect.extend is weird with TS
            eventIds: expect.setContaining(failedDecryptionEvent.getId()),
        });

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);

        // Immediately track the newest failures
        tracker.trackFailures();

        expect(count).not.toBe(0);

        done();
    });

    it('tracks a failed decryption for an event that becomes visible later', function(done) {
        const failedDecryptionEvent = createFailedDecryptionEvent();

        let count = 0;
        // @ts-ignore - private constructor
        const tracker = new DecryptionFailureTracker((total: number) => count += total, () => "UnknownError");

        const err = new MockDecryptionError();
        tracker.eventDecrypted(failedDecryptionEvent, err);

        tracker.addVisibleEvent(failedDecryptionEvent);

        expect(spyDispatcher).toHaveBeenCalledWith({
            action: 'update_visible_decryption_failures',
            // @ts-ignore - jest expect.extend is weird with TS
            eventIds: expect.setContaining(failedDecryptionEvent.getId()),
        });

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);

        // Immediately track the newest failures
        tracker.trackFailures();

        expect(count).not.toBe(0);

        done();
    });

    it('does not track a failed decryption for an event that never becomes visible', function(done) {
        const failedDecryptionEvent = createFailedDecryptionEvent();

        let count = 0;
        // @ts-ignore - private constructor
        const tracker = new DecryptionFailureTracker((total: number) => count += total, () => "UnknownError");

        const err = new MockDecryptionError();
        tracker.eventDecrypted(failedDecryptionEvent, err);

        expect(spyDispatcher).not.toHaveBeenCalledWith(expect.objectContaining({
            action: 'update_visible_decryption_failures',
        }));

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);

        // Immediately track the newest failures
        tracker.trackFailures();

        expect(count).toBe(0);

        done();
    });

    it("detects a failed decryption where the event is subsequently successfully decrypted, "
        + "but doesn't report it in analytics", (done) => {
        const decryptedEvent = createFailedDecryptionEvent();

        // @ts-ignore - private constructor
        const tracker = new DecryptionFailureTracker((_total: number) => {
            expect(true).toBe(false);
        }, () => "UnknownError");

        tracker.addVisibleEvent(decryptedEvent);

        const err = new MockDecryptionError();
        tracker.eventDecrypted(decryptedEvent, err);

        expect(spyDispatcher).toHaveBeenCalledWith({
            action: 'update_visible_decryption_failures',
            // @ts-ignore - jest expect.extend is weird with TS
            eventIds: expect.setContaining(decryptedEvent.getId()),
        });

        // Indicate successful decryption: clear data can be anything where the msgtype is not m.bad.encrypted
        // @ts-ignore - private event
        decryptedEvent.setClearData({});
        tracker.eventDecrypted(decryptedEvent, null);

        expect(spyDispatcher).toHaveBeenCalledWith({
            action: 'update_visible_decryption_failures',
            // @ts-ignore - jest expect.extend is weird with TS
            eventIds: expect.not.setContaining(decryptedEvent.getId()),
        });

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);

        // Immediately track the newest failures
        tracker.trackFailures();
        done();
    });

    it('does not track a failed decryption where the event is subsequently successfully decrypted ' +
       'and later becomes visible', (done) => {
        const decryptedEvent = createFailedDecryptionEvent();
        // @ts-ignore - private method
        const tracker = new DecryptionFailureTracker((_total: number) => {
            expect(true).toBe(false);
        }, () => "UnknownError");

        const err = new MockDecryptionError();
        tracker.eventDecrypted(decryptedEvent, err);

        // Indicate successful decryption: clear data can be anything where the msgtype is not m.bad.encrypted
        // @ts-ignore
        decryptedEvent.setClearData({});
        tracker.eventDecrypted(decryptedEvent, null);

        tracker.addVisibleEvent(decryptedEvent);

        expect(spyDispatcher).not.toHaveBeenCalledWith(expect.objectContaining({
            action: 'update_visible_decryption_failures',
        }));

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);

        // Immediately track the newest failures
        tracker.trackFailures();
        done();
    });

    it('only tracks a single failure per event, despite multiple failed decryptions for multiple events', (done) => {
        const decryptedEvent = createFailedDecryptionEvent();
        const decryptedEvent2 = createFailedDecryptionEvent();

        let count = 0;
        // @ts-ignore
        const tracker = new DecryptionFailureTracker((total: number) => count += total, () => "UnknownError");

        tracker.addVisibleEvent(decryptedEvent);

        // Arbitrary number of failed decryptions for both events
        const err = new MockDecryptionError();
        tracker.eventDecrypted(decryptedEvent, err);
        tracker.eventDecrypted(decryptedEvent, err);
        tracker.eventDecrypted(decryptedEvent, err);
        tracker.eventDecrypted(decryptedEvent, err);
        tracker.eventDecrypted(decryptedEvent, err);
        tracker.eventDecrypted(decryptedEvent2, err);
        tracker.eventDecrypted(decryptedEvent2, err);
        tracker.addVisibleEvent(decryptedEvent2);
        tracker.eventDecrypted(decryptedEvent2, err);

        expect(spyDispatcher).toHaveBeenCalledTimes(2);

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);

        // Simulated polling of `trackFailures`, an arbitrary number ( > 2 ) times
        tracker.trackFailures();
        tracker.trackFailures();
        tracker.trackFailures();
        tracker.trackFailures();

        expect(count).toBe(2);

        done();
    });

    it('should not re-report a failure for an event that was already reported to analytics', (done) => {
        const decryptedEvent = createFailedDecryptionEvent();

        let count = 0;
        // @ts-ignore
        const tracker = new DecryptionFailureTracker((total: number) => count += total, () => "UnknownError");

        tracker.addVisibleEvent(decryptedEvent);

        // Indicate decryption
        const err = new MockDecryptionError();
        tracker.eventDecrypted(decryptedEvent, err);

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);

        tracker.trackFailures();

        // Indicate a second decryption, after having tracked the failure
        tracker.eventDecrypted(decryptedEvent, err);

        tracker.trackFailures();

        expect(count).toBe(1);

        done();
    });

    xit('should not track a failure for an event that was tracked in a previous session', (done) => {
        // This test uses localStorage, clear it beforehand
        localStorage.clear();

        const decryptedEvent = createFailedDecryptionEvent();

        let count = 0;
        // @ts-ignore
        const tracker = new DecryptionFailureTracker((total: number) => count += total, () => "UnknownError");

        tracker.addVisibleEvent(decryptedEvent);

        // Indicate decryption
        const err = new MockDecryptionError();
        tracker.eventDecrypted(decryptedEvent, err);

        // Pretend "now" is Infinity
        // NB: This saves to localStorage specific to DFT
        tracker.checkFailures(Infinity);

        tracker.trackFailures();

        // Simulate the browser refreshing by destroying tracker and creating a new tracker
        // @ts-ignore
        const secondTracker = new DecryptionFailureTracker((total: number) => count += total, () => "UnknownError");

        secondTracker.addVisibleEvent(decryptedEvent);

        //secondTracker.loadTrackedEvents();

        secondTracker.eventDecrypted(decryptedEvent, err);
        secondTracker.checkFailures(Infinity);
        secondTracker.trackFailures();

        expect(count).toBe(1);

        done();
    });

    it('should count different error codes separately for multiple failures with different error codes', () => {
        const counts = {};
        // @ts-ignore
        const tracker = new DecryptionFailureTracker(
            (total: number, errorCode: string) => counts[errorCode] = (counts[errorCode] || 0) + total,
            (error: string) => error === "UnknownError" ? "UnknownError" : "OlmKeysNotSentError",
        );

        const decryptedEvent1 = createFailedDecryptionEvent();
        const decryptedEvent2 = createFailedDecryptionEvent();
        const decryptedEvent3 = createFailedDecryptionEvent();

        const error1 = new MockDecryptionError('UnknownError');
        const error2 = new MockDecryptionError('OlmKeysNotSentError');

        tracker.addVisibleEvent(decryptedEvent1);
        tracker.addVisibleEvent(decryptedEvent2);
        tracker.addVisibleEvent(decryptedEvent3);

        // One failure of ERROR_CODE_1, and effectively two for ERROR_CODE_2
        tracker.eventDecrypted(decryptedEvent1, error1);
        tracker.eventDecrypted(decryptedEvent2, error2);
        tracker.eventDecrypted(decryptedEvent2, error2);
        tracker.eventDecrypted(decryptedEvent3, error2);

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);

        tracker.trackFailures();

        //expect(counts['UnknownError']).toBe(1, 'should track one UnknownError');
        expect(counts['OlmKeysNotSentError']).toBe(2);
    });

    it('should aggregate error codes correctly', () => {
        const counts = {};
        // @ts-ignore
        const tracker = new DecryptionFailureTracker(
            (total: number, errorCode: string) => counts[errorCode] = (counts[errorCode] || 0) + total,
            (_errorCode: string) => 'OlmUnspecifiedError',
        );

        const decryptedEvent1 = createFailedDecryptionEvent();
        const decryptedEvent2 = createFailedDecryptionEvent();
        const decryptedEvent3 = createFailedDecryptionEvent();

        const error1 = new MockDecryptionError('ERROR_CODE_1');
        const error2 = new MockDecryptionError('ERROR_CODE_2');
        const error3 = new MockDecryptionError('ERROR_CODE_3');

        tracker.addVisibleEvent(decryptedEvent1);
        tracker.addVisibleEvent(decryptedEvent2);
        tracker.addVisibleEvent(decryptedEvent3);

        tracker.eventDecrypted(decryptedEvent1, error1);
        tracker.eventDecrypted(decryptedEvent2, error2);
        tracker.eventDecrypted(decryptedEvent3, error3);

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);

        tracker.trackFailures();

        expect(counts['OlmUnspecifiedError']).toBe(3);
    });

    it('should remap error codes correctly', () => {
        const counts = {};
        // @ts-ignore
        const tracker = new DecryptionFailureTracker(
            (total: number, errorCode: string) => counts[errorCode] = (counts[errorCode] || 0) + total,
            (errorCode: string) => Array.from(errorCode).reverse().join(''),
        );

        const decryptedEvent = createFailedDecryptionEvent();

        const error = new MockDecryptionError('ERROR_CODE_1');

        tracker.addVisibleEvent(decryptedEvent);

        tracker.eventDecrypted(decryptedEvent, error);

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);

        tracker.trackFailures();

        expect(counts['1_EDOC_RORRE'])
            .toBe(1);
    });

    it('should continue tracking an event that leaves visibility and then becomes visible again, ' +
        'but should report it to analytics exactly once', () => {
        let count = 0;
        // @ts-ignore
        const tracker = new DecryptionFailureTracker((total: number) => count += total, () => "UnknownError");

        const failedDecryptionEvent = createFailedDecryptionEvent();

        const error = new MockDecryptionError();

        tracker.addVisibleEvent(failedDecryptionEvent);
        tracker.eventDecrypted(failedDecryptionEvent, error);

        expect(spyDispatcher).toHaveBeenCalledWith({
            action: 'update_visible_decryption_failures',
            // @ts-ignore - jest expect.extend is weird with TS
            eventIds: expect.setContaining(failedDecryptionEvent.getId()),
        });

        tracker.removeVisibleEvent(failedDecryptionEvent);

        expect(spyDispatcher).toHaveBeenCalledWith({
            action: 'update_visible_decryption_failures',
            // @ts-ignore - jest expect.extend is weird with TS
            eventIds: expect.not.setContaining(failedDecryptionEvent.getId()),
        });

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);
        tracker.trackFailures();

        tracker.addVisibleEvent(failedDecryptionEvent);

        expect(spyDispatcher).toHaveBeenNthCalledWith(3, {
            action: 'update_visible_decryption_failures',
            // @ts-ignore - jest expect.extend is weird with TS
            eventIds: expect.setContaining(failedDecryptionEvent.getId()),
        });

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);
        tracker.trackFailures();

        expect(count).toBe(1);
    });
});
