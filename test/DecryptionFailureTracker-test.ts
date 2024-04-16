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

import { mocked, Mocked } from "jest-mock";
import { CryptoApi } from "matrix-js-sdk/src/matrix";
import { decryptExistingEvent, mkDecryptionFailureMatrixEvent } from "matrix-js-sdk/src/testing";
import { DecryptionFailureCode } from "matrix-js-sdk/src/crypto-api";

import { DecryptionFailureTracker, ErrorProperties } from "../src/DecryptionFailureTracker";
import { stubClient } from "./test-utils";

class MockDecryptionError extends Error {
    public readonly code: string;

    constructor(code?: string) {
        super();

        this.code = code || "MOCK_DECRYPTION_ERROR";
    }
}

async function createFailedDecryptionEvent(sender: string = "@alice:example.com") {
    return await mkDecryptionFailureMatrixEvent({
        roomId: "!room:id",
        sender: sender,
        code: DecryptionFailureCode.UNKNOWN_ERROR,
        msg: ":(",
    });
}

describe("DecryptionFailureTracker", function () {
    it("tracks a failed decryption for a visible event", async function () {
        const failedDecryptionEvent = await createFailedDecryptionEvent();

        let count = 0;
        // @ts-ignore access to private constructor
        const tracker = new DecryptionFailureTracker(
            () => count++,
            () => "UnknownError",
        );

        tracker.addVisibleEvent(failedDecryptionEvent);

        const err = new MockDecryptionError();
        tracker.eventDecrypted(failedDecryptionEvent, err, Date.now());

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);

        // Immediately track the newest failures
        tracker.trackFailures();

        // should track a failure for an event that failed decryption
        expect(count).not.toBe(0);
    });

    it("tracks a failed decryption with expected raw error for a visible event", async function () {
        const failedDecryptionEvent = await createFailedDecryptionEvent();

        let count = 0;
        let reportedRawCode = "";
        // @ts-ignore access to private constructor
        const tracker = new DecryptionFailureTracker(
            (_errCode: string, rawCode: string) => {
                count++;
                reportedRawCode = rawCode;
            },
            () => "UnknownError",
        );

        tracker.addVisibleEvent(failedDecryptionEvent);

        const err = new MockDecryptionError("INBOUND_SESSION_MISMATCH_ROOM_ID");
        tracker.eventDecrypted(failedDecryptionEvent, err, Date.now());

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);

        // Immediately track the newest failures
        tracker.trackFailures();

        // should track a failure for an event that failed decryption
        expect(count).not.toBe(0);

        // Should add the rawCode to the event context
        expect(reportedRawCode).toBe("INBOUND_SESSION_MISMATCH_ROOM_ID");
    });

    it("tracks a failed decryption for an event that becomes visible later", async function () {
        const failedDecryptionEvent = await createFailedDecryptionEvent();

        let count = 0;
        // @ts-ignore access to private constructor
        const tracker = new DecryptionFailureTracker(
            () => count++,
            () => "UnknownError",
        );

        const err = new MockDecryptionError();
        tracker.eventDecrypted(failedDecryptionEvent, err, Date.now());

        tracker.addVisibleEvent(failedDecryptionEvent);

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);

        // Immediately track the newest failures
        tracker.trackFailures();

        // should track a failure for an event that failed decryption
        expect(count).not.toBe(0);
    });

    it("does not track a failed decryption for an event that never becomes visible", async function () {
        const failedDecryptionEvent = await createFailedDecryptionEvent();

        let count = 0;
        // @ts-ignore access to private constructor
        const tracker = new DecryptionFailureTracker(
            () => count++,
            () => "UnknownError",
        );

        const err = new MockDecryptionError();
        tracker.eventDecrypted(failedDecryptionEvent, err, Date.now());

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);

        // Immediately track the newest failures
        tracker.trackFailures();

        // should not track a failure for an event that never became visible
        expect(count).toBe(0);
    });

    it("does not track a failed decryption where the event is subsequently successfully decrypted", async () => {
        const decryptedEvent = await createFailedDecryptionEvent();
        // @ts-ignore access to private constructor
        const tracker = new DecryptionFailureTracker(
            () => {
                // should not track an event that has since been decrypted correctly
                expect(true).toBe(false);
            },
            () => "UnknownError",
        );

        tracker.addVisibleEvent(decryptedEvent);

        const err = new MockDecryptionError();
        tracker.eventDecrypted(decryptedEvent, err, Date.now());

        // Indicate successful decryption.
        await decryptExistingEvent(decryptedEvent, {
            plainType: "m.room.message",
            plainContent: { body: "success" },
        });
        tracker.eventDecrypted(decryptedEvent, null, Date.now());

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);

        // Immediately track the newest failures
        tracker.trackFailures();
    });

    it(
        "does not track a failed decryption where the event is subsequently successfully decrypted " +
            "and later becomes visible",
        async () => {
            const decryptedEvent = await createFailedDecryptionEvent();
            // @ts-ignore access to private constructor
            const tracker = new DecryptionFailureTracker(
                () => {
                    // should not track an event that has since been decrypted correctly
                    expect(true).toBe(false);
                },
                () => "UnknownError",
            );

            const err = new MockDecryptionError();
            tracker.eventDecrypted(decryptedEvent, err, Date.now());

            // Indicate successful decryption.
            await decryptExistingEvent(decryptedEvent, {
                plainType: "m.room.message",
                plainContent: { body: "success" },
            });
            tracker.eventDecrypted(decryptedEvent, null, Date.now());

            tracker.addVisibleEvent(decryptedEvent);

            // Pretend "now" is Infinity
            tracker.checkFailures(Infinity);

            // Immediately track the newest failures
            tracker.trackFailures();
        },
    );

    it("only tracks a single failure per event, despite multiple failed decryptions for multiple events", async () => {
        const decryptedEvent = await createFailedDecryptionEvent();
        const decryptedEvent2 = await createFailedDecryptionEvent();

        let count = 0;
        // @ts-ignore access to private constructor
        const tracker = new DecryptionFailureTracker(
            () => count++,
            () => "UnknownError",
        );

        tracker.addVisibleEvent(decryptedEvent);

        // Arbitrary number of failed decryptions for both events
        const err = new MockDecryptionError();
        const now = Date.now();
        tracker.eventDecrypted(decryptedEvent, err, now);
        tracker.eventDecrypted(decryptedEvent, err, now);
        tracker.eventDecrypted(decryptedEvent, err, now);
        tracker.eventDecrypted(decryptedEvent, err, now);
        tracker.eventDecrypted(decryptedEvent, err, now);
        tracker.eventDecrypted(decryptedEvent2, err, now);
        tracker.eventDecrypted(decryptedEvent2, err, now);
        tracker.addVisibleEvent(decryptedEvent2);
        tracker.eventDecrypted(decryptedEvent2, err, now);

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);

        // Simulated polling of `trackFailures`, an arbitrary number ( > 2 ) times
        tracker.trackFailures();
        tracker.trackFailures();
        tracker.trackFailures();
        tracker.trackFailures();

        // should only track a single failure per event
        expect(count).toBe(2);
    });

    it("should not track a failure for an event that was tracked previously", async () => {
        const decryptedEvent = await createFailedDecryptionEvent();

        let count = 0;
        // @ts-ignore access to private constructor
        const tracker = new DecryptionFailureTracker(
            () => count++,
            () => "UnknownError",
        );

        tracker.addVisibleEvent(decryptedEvent);

        // Indicate decryption
        const err = new MockDecryptionError();
        tracker.eventDecrypted(decryptedEvent, err, Date.now());

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);

        tracker.trackFailures();

        // Indicate a second decryption, after having tracked the failure
        tracker.eventDecrypted(decryptedEvent, err, Date.now());

        tracker.trackFailures();

        // should only track a single failure per event
        expect(count).toBe(1);
    });

    it.skip("should not track a failure for an event that was tracked in a previous session", async () => {
        // This test uses localStorage, clear it beforehand
        localStorage.clear();

        const decryptedEvent = await createFailedDecryptionEvent();

        let count = 0;
        // @ts-ignore access to private constructor
        const tracker = new DecryptionFailureTracker(
            () => count++,
            () => "UnknownError",
        );

        tracker.addVisibleEvent(decryptedEvent);

        // Indicate decryption
        const err = new MockDecryptionError();
        tracker.eventDecrypted(decryptedEvent, err, Date.now());

        // Pretend "now" is Infinity
        // NB: This saves to localStorage specific to DFT
        tracker.checkFailures(Infinity);

        tracker.trackFailures();

        // Simulate the browser refreshing by destroying tracker and creating a new tracker
        // @ts-ignore access to private constructor
        const secondTracker = new DecryptionFailureTracker(
            (total: number) => (count += total),
            () => "UnknownError",
        );

        secondTracker.addVisibleEvent(decryptedEvent);

        //secondTracker.loadTrackedEvents();

        secondTracker.eventDecrypted(decryptedEvent, err, Date.now());
        secondTracker.checkFailures(Infinity);
        secondTracker.trackFailures();

        // should only track a single failure per event
        expect(count).toBe(1);
    });

    it("should count different error codes separately for multiple failures with different error codes", async () => {
        const counts: Record<string, number> = {};

        // @ts-ignore access to private constructor
        const tracker = new DecryptionFailureTracker(
            (errorCode: string) => (counts[errorCode] = (counts[errorCode] || 0) + 1),
            (error: string) => (error === "UnknownError" ? "UnknownError" : "OlmKeysNotSentError"),
        );

        const decryptedEvent1 = await createFailedDecryptionEvent();
        const decryptedEvent2 = await createFailedDecryptionEvent();
        const decryptedEvent3 = await createFailedDecryptionEvent();

        const error1 = new MockDecryptionError("UnknownError");
        const error2 = new MockDecryptionError("OlmKeysNotSentError");

        tracker.addVisibleEvent(decryptedEvent1);
        tracker.addVisibleEvent(decryptedEvent2);
        tracker.addVisibleEvent(decryptedEvent3);

        // One failure of ERROR_CODE_1, and effectively two for ERROR_CODE_2
        const now = Date.now();
        tracker.eventDecrypted(decryptedEvent1, error1, now);
        tracker.eventDecrypted(decryptedEvent2, error2, now);
        tracker.eventDecrypted(decryptedEvent2, error2, now);
        tracker.eventDecrypted(decryptedEvent3, error2, now);

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);

        tracker.trackFailures();

        //expect(counts['UnknownError']).toBe(1, 'should track one UnknownError');
        expect(counts["OlmKeysNotSentError"]).toBe(2);
    });

    it("should aggregate error codes correctly", async () => {
        const counts: Record<string, number> = {};

        // @ts-ignore access to private constructor
        const tracker = new DecryptionFailureTracker(
            (errorCode: string) => (counts[errorCode] = (counts[errorCode] || 0) + 1),
            (_errorCode: string) => "OlmUnspecifiedError",
        );

        const decryptedEvent1 = await createFailedDecryptionEvent();
        const decryptedEvent2 = await createFailedDecryptionEvent();
        const decryptedEvent3 = await createFailedDecryptionEvent();

        const error1 = new MockDecryptionError("ERROR_CODE_1");
        const error2 = new MockDecryptionError("ERROR_CODE_2");
        const error3 = new MockDecryptionError("ERROR_CODE_3");

        tracker.addVisibleEvent(decryptedEvent1);
        tracker.addVisibleEvent(decryptedEvent2);
        tracker.addVisibleEvent(decryptedEvent3);

        const now = Date.now();
        tracker.eventDecrypted(decryptedEvent1, error1, now);
        tracker.eventDecrypted(decryptedEvent2, error2, now);
        tracker.eventDecrypted(decryptedEvent3, error3, now);

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);

        tracker.trackFailures();

        expect(counts["OlmUnspecifiedError"]).toBe(3);
    });

    it("should remap error codes correctly", async () => {
        const counts: Record<string, number> = {};

        // @ts-ignore access to private constructor
        const tracker = new DecryptionFailureTracker(
            (errorCode: string) => (counts[errorCode] = (counts[errorCode] || 0) + 1),
            (errorCode: string) => Array.from(errorCode).reverse().join(""),
        );

        const decryptedEvent = await createFailedDecryptionEvent();

        const error = new MockDecryptionError("ERROR_CODE_1");

        tracker.addVisibleEvent(decryptedEvent);

        tracker.eventDecrypted(decryptedEvent, error, Date.now());

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);

        tracker.trackFailures();

        // should track remapped error code
        expect(counts["1_EDOC_RORRE"]).toBe(1);
    });

    it("tracks late decryptions vs. undecryptable", async () => {
        const propertiesByErrorCode: Record<string, ErrorProperties> = {};
        // @ts-ignore access to private constructor
        const tracker = new DecryptionFailureTracker(
            (errorCode: string, rawError: string, properties: ErrorProperties) => {
                propertiesByErrorCode[errorCode] = properties;
            },
            (error: string) => error,
        );

        // event that will be slow to decrypt
        const lateDecryption = await createFailedDecryptionEvent();
        // event that will be so slow to decrypt, it gets counted as undecryptable
        const veryLateDecryption = await createFailedDecryptionEvent();
        // event that never gets decrypted
        const neverDecrypted = await createFailedDecryptionEvent();

        const error1 = new MockDecryptionError("ERROR_CODE_1");
        const error2 = new MockDecryptionError("ERROR_CODE_2");
        const error3 = new MockDecryptionError("ERROR_CODE_3");

        tracker.addVisibleEvent(lateDecryption);
        tracker.addVisibleEvent(veryLateDecryption);
        tracker.addVisibleEvent(neverDecrypted);

        const now = Date.now();
        tracker.eventDecrypted(lateDecryption, error1, now);
        tracker.eventDecrypted(veryLateDecryption, error2, now);
        tracker.eventDecrypted(neverDecrypted, error3, now);

        await decryptExistingEvent(lateDecryption, {
            plainType: "m.room.message",
            plainContent: { body: "success" },
        });
        await decryptExistingEvent(veryLateDecryption, {
            plainType: "m.room.message",
            plainContent: { body: "success" },
        });
        tracker.eventDecrypted(lateDecryption, null, now + 40000);
        tracker.eventDecrypted(veryLateDecryption, null, now + 100000);

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);

        tracker.trackFailures();

        expect(propertiesByErrorCode["ERROR_CODE_1"].timeToDecryptMillis).toEqual(40000);
        expect(propertiesByErrorCode["ERROR_CODE_2"].timeToDecryptMillis).toEqual(-1);
        expect(propertiesByErrorCode["ERROR_CODE_3"].timeToDecryptMillis).toEqual(-1);
    });

    it("tracks client information", async () => {
        const client = mocked(stubClient());
        const mockCrypto = {
            getVersion: jest.fn().mockReturnValue("Rust SDK 0.7.0 (61b175b), Vodozemac 0.5.1"),
        } as unknown as Mocked<CryptoApi>;
        client.getCrypto.mockReturnValue(mockCrypto);

        const propertiesByErrorCode: Record<string, ErrorProperties> = {};
        // @ts-ignore access to private constructor
        const tracker = new DecryptionFailureTracker(
            (errorCode: string, rawError: string, properties: ErrorProperties) => {
                propertiesByErrorCode[errorCode] = properties;
            },
            (error: string) => error,
        );

        // @ts-ignore access to private method
        tracker.setClient(client);

        // event from a federated user (@alice:example.com)
        const federatedDecryption = await createFailedDecryptionEvent();
        // event from a local user
        const localDecryption = await createFailedDecryptionEvent("@bob:matrix.org");

        const error1 = new MockDecryptionError("ERROR_CODE_1");
        const error2 = new MockDecryptionError("ERROR_CODE_2");

        tracker.addVisibleEvent(federatedDecryption);
        tracker.addVisibleEvent(localDecryption);

        const now = Date.now();
        tracker.eventDecrypted(federatedDecryption, error1, now);
        tracker.eventDecrypted(localDecryption, error2, now);

        // Pretend "now" is Infinity
        tracker.checkFailures(Infinity);

        tracker.trackFailures();

        expect(propertiesByErrorCode["ERROR_CODE_1"].isMatrixDotOrg).toBe(true);
        expect(propertiesByErrorCode["ERROR_CODE_1"].cryptoSDK).toEqual("Rust");

        expect(propertiesByErrorCode["ERROR_CODE_1"].isFederated).toBe(true);
        expect(propertiesByErrorCode["ERROR_CODE_2"].isFederated).toBe(false);
    });
});
