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

import Analytics from '../src/Analytics';
import { DecryptionFailureTracker } from '../src/DecryptionFailureTracker';

class MockDecryptionError extends Error {
    constructor(
        public readonly errcode: string,
        public readonly data: Record<string, unknown> = {},
    ) {
        super();
    }
}

function createFailedDecryptionEvent() {
    const event = new MatrixEvent({
        event_id: "event-id-" + Math.random().toString(16).slice(2),
    });
    // @ts-ignore private properties
    event.setClearData(event.badEncryptedMessage(":("));
    return event;
}

describe('DecryptionFailureTracker', function() {
    const trackEventSpy = jest.spyOn(Analytics, 'trackEvent');

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        jest.spyOn(Analytics, 'trackEvent').mockRestore();
    });

    it('tracks a failed decryption for a visible event', function() {
        const failedDecryptionEvent = createFailedDecryptionEvent();

        const tracker = DecryptionFailureTracker.instance;

        tracker.addVisibleEvent(failedDecryptionEvent);

        const err = new MockDecryptionError('');
        tracker.eventDecrypted(failedDecryptionEvent, err);

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);

        // Immediately track the newest failures
        tracker.trackFailures();

        // should track a failure for an event that failed decryption
        expect(trackEventSpy).toHaveBeenCalledTimes(1);
    });

    it('tracks a failed decryption for an event that becomes visible later', function(done) {
        const failedDecryptionEvent = createFailedDecryptionEvent();

        const tracker = DecryptionFailureTracker.instance;

        const err = new MockDecryptionError('');
        tracker.eventDecrypted(failedDecryptionEvent, err);

        tracker.addVisibleEvent(failedDecryptionEvent);

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);

        // Immediately track the newest failures
        tracker.trackFailures();

        // should track a failure for an event that failed decryption
        expect(trackEventSpy).toHaveBeenCalledTimes(1);

        done();
    });

    it('does not track a failed decryption for an event that never becomes visible', function() {
        const failedDecryptionEvent = createFailedDecryptionEvent();

        const tracker = DecryptionFailureTracker.instance;

        const err = new MockDecryptionError('');
        tracker.eventDecrypted(failedDecryptionEvent, err);

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);

        // Immediately track the newest failures
        tracker.trackFailures();

        // should not track a failure for an event that never became visible
        expect(trackEventSpy).not.toHaveBeenCalled();
    });

    it('does not track a failed decryption where the event is subsequently successfully decrypted', () => {
        const decryptedEvent = createFailedDecryptionEvent();
        const tracker = DecryptionFailureTracker.instance;

        tracker.addVisibleEvent(decryptedEvent);

        const err = new MockDecryptionError('');
        tracker.eventDecrypted(decryptedEvent, err);

        // Indicate successful decryption: clear data can be anything where the msgtype is not m.bad.encrypted
        // @ts-ignore private prop
        decryptedEvent.setClearData({});
        tracker.eventDecrypted(decryptedEvent, null);

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);

        // Immediately track the newest failures
        tracker.trackFailures();

        // no tracking occurred
        expect(trackEventSpy).not.toHaveBeenCalled();
    });

    it('does not track a failed decryption where the event is subsequently successfully decrypted ' +
       'and later becomes visible', () => {
        const decryptedEvent = createFailedDecryptionEvent();
        const tracker = DecryptionFailureTracker.instance;

        const err = new MockDecryptionError('');
        tracker.eventDecrypted(decryptedEvent, err);

        // Indicate successful decryption: clear data can be anything where the msgtype is not m.bad.encrypted
        // @ts-ignore private property
        decryptedEvent.setClearData({});
        tracker.eventDecrypted(decryptedEvent, null);

        tracker.addVisibleEvent(decryptedEvent);

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);

        // Immediately track the newest failures
        tracker.trackFailures();
        expect(trackEventSpy).not.toHaveBeenCalled();
    });

    it('only tracks a single failure per error code, despite multiple failed decryptions for multiple events', () => {
        const decryptedEvent = createFailedDecryptionEvent();
        const decryptedEvent2 = createFailedDecryptionEvent();

        const tracker = DecryptionFailureTracker.instance;

        tracker.addVisibleEvent(decryptedEvent);

        // Arbitrary number of failed decryptions for both events
        const err = new MockDecryptionError('');
        tracker.eventDecrypted(decryptedEvent, err);
        tracker.eventDecrypted(decryptedEvent, err);
        tracker.eventDecrypted(decryptedEvent, err);
        tracker.eventDecrypted(decryptedEvent, err);
        tracker.eventDecrypted(decryptedEvent, err);
        tracker.eventDecrypted(decryptedEvent2, err);
        tracker.eventDecrypted(decryptedEvent2, err);
        tracker.addVisibleEvent(decryptedEvent2);
        tracker.eventDecrypted(decryptedEvent2, err);

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);

        // Simulated polling of `trackFailures`, an arbitrary number ( > 2 ) times
        tracker.trackFailures();
        tracker.trackFailures();
        tracker.trackFailures();
        tracker.trackFailures();

        expect(trackEventSpy).toHaveBeenCalledTimes(1);
    });

    it('should not track a failure for an event that was tracked previously', (done) => {
        const decryptedEvent = createFailedDecryptionEvent();

        const tracker = DecryptionFailureTracker.instance;

        tracker.addVisibleEvent(decryptedEvent);

        // Indicate decryption
        const err = new MockDecryptionError('');
        tracker.eventDecrypted(decryptedEvent, err);

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);

        tracker.trackFailures();

        // Indicate a second decryption, after having tracked the failure
        tracker.eventDecrypted(decryptedEvent, err);

        tracker.trackFailures();

        // should only track a single failure per event
        expect(trackEventSpy).toHaveBeenCalledTimes(1);

        done();
    });

    it('should count different error codes separately for multiple failures with different error codes', () => {
        const tracker = DecryptionFailureTracker.instance;

        const decryptedEvent1 = createFailedDecryptionEvent();
        const decryptedEvent2 = createFailedDecryptionEvent();
        const decryptedEvent3 = createFailedDecryptionEvent();

        const error1 = new MockDecryptionError('UnknownError');
        const error2 = new MockDecryptionError('MEGOLM_UNKNOWN_INBOUND_SESSION_ID');

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

        // called once for each error type
        expect(trackEventSpy).toHaveBeenCalledTimes(2);
        expect(trackEventSpy).toHaveBeenCalledWith('E2E', 'Decryption failure', 'UnknownError', '1');
        expect(trackEventSpy).toHaveBeenCalledWith('E2E', 'Decryption failure', 'OlmKeysNotSentError', '2');
    });

    it('should aggregate error codes correctly', () => {
        const tracker = DecryptionFailureTracker.instance;

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

        expect(trackEventSpy).toHaveBeenCalledTimes(3);
        expect(trackEventSpy.mock.calls).toEqual(
            [['E2E', 'Decryption failure', 'UnknownError', '1'],
            ['E2E', 'Decryption failure', 'UnknownError', '1'],
            ['E2E', 'Decryption failure', 'UnknownError', '1']]
        );
    });

    it('should remap error codes correctly', () => {
        const tracker = DecryptionFailureTracker.instance;

        const decryptedEvent = createFailedDecryptionEvent();

        const error = new MockDecryptionError('MEGOLM_UNKNOWN_INBOUND_SESSION_ID');

        tracker.addVisibleEvent(decryptedEvent);

        tracker.eventDecrypted(decryptedEvent, error);

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);

        tracker.trackFailures();

        // MEGOLM_UNKNOWN_INBOUND_SESSION_ID maps to OlmKeysNotSentError
        expect(trackEventSpy).toHaveBeenCalledWith('E2E', 'Decryption failure', 'OlmKeysNotSentError', '1');
    });
});
