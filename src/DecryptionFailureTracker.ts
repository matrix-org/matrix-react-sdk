/*
Copyright 2018 - 2021 The Matrix.org Foundation C.I.C.

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

import { DecryptionError } from "matrix-js-sdk/src/crypto/algorithms";
import { MatrixClient, MatrixEvent } from "matrix-js-sdk/src/matrix";
import { Error as ErrorEvent } from "@matrix-org/analytics-events/types/typescript/Error";

import { MatrixClientPeg } from "./MatrixClientPeg";
import { PosthogAnalytics } from "./PosthogAnalytics";

export class DecryptionFailure {
    // the time between our failure to decrypt and our successful decryption
    // (if we managed to decrypt)
    public timeToDecryptMillis?: number;

    public constructor(
        public readonly failedEventId: string,
        public readonly errorCode: string,
        // the time that we failed to decrypt the event
        public readonly ts: number,
        public readonly isFederated: boolean | undefined,
    ) {}
}

type ErrorCode = "OlmKeysNotSentError" | "OlmIndexError" | "UnknownError" | "OlmUnspecifiedError";

export type ErrorProperties = Omit<ErrorEvent, "eventName" | "domain" | "name" | "context">;

type TrackingFn = (trackedErrCode: ErrorCode, rawError: string, properties: ErrorProperties) => void;

export type ErrCodeMapFn = (errcode: string) => ErrorCode;

export class DecryptionFailureTracker {
    private static internalInstance = new DecryptionFailureTracker(
        (errorCode, rawError, properties) => {
            const event: ErrorEvent = {
                eventName: "Error",
                domain: "E2EE",
                name: errorCode,
                context: `mxc_crypto_error_type_${rawError}`,
                ...properties,
            };
            PosthogAnalytics.instance.trackEvent<ErrorEvent>(event);
        },
        (errorCode) => {
            // Map JS-SDK error codes to tracker codes for aggregation
            switch (errorCode) {
                case "MEGOLM_UNKNOWN_INBOUND_SESSION_ID":
                    return "OlmKeysNotSentError";
                case "OLM_UNKNOWN_MESSAGE_INDEX":
                    return "OlmIndexError";
                case undefined:
                    return "OlmUnspecifiedError";
                default:
                    return "UnknownError";
            }
        },
    );

    // Map of event IDs to DecryptionFailure items.
    public failures: Map<string, DecryptionFailure> = new Map();

    // Set of event IDs that have been visible to the user.
    public visibleEvents: Set<string> = new Set();

    // Map of visible event IDs to `DecryptionFailure`s. Every
    // `CHECK_INTERVAL_MS`, this map is checked for failures that
    // happened > `GRACE_PERIOD_MS` ago. Those that did are
    // accumulated in `failuresToReport`.
    public visibleFailures: Map<string, DecryptionFailure> = new Map();

    // The failures that will be reported at the next tracking interval.
    public failuresToReport: Set<DecryptionFailure> = new Set();

    public lateDecryptions: Map<string, DecryptionFailure> = new Map();

    // Event IDs of failures that were tracked previously
    public trackedEvents: Set<string> = new Set();

    // Set to an interval ID when `start` is called
    public checkInterval: number | null = null;
    public trackInterval: number | null = null;

    // Spread the load on `Analytics` by tracking at a low frequency, `TRACK_INTERVAL_MS`.
    public static TRACK_INTERVAL_MS = 60000;

    // Call `checkFailures` every `CHECK_INTERVAL_MS`.
    public static CHECK_INTERVAL_MS = 40000;

    // Give events a chance to be decrypted by waiting `GRACE_PERIOD_MS` before counting
    // the failure in `failuresToReport`.
    public static GRACE_PERIOD_MS = 30000;

    // Maximum time for an event to be decrypted to be considered a late decryption
    public static MAXIMUM_LATE_DECRYPTION_PERIOD = 60000;

    // properties that will be added to reported events (mainly reporting
    // information about the Matrix client)
    private baseProperties?: ErrorProperties = {};

    // the user's domain (homeserver name)
    private userDomain?: string;

    /**
     * Create a new DecryptionFailureTracker.
     *
     * Call `eventDecrypted(event, err, nowTs)` on this instance when an event is decrypted.
     *
     * Call `start()` to start the tracker, and `stop()` to stop tracking.
     *
     * @param {function} fn The tracking function, which will be called when failures
     * are tracked. The function should have a signature `(count, trackedErrorCode) => {...}`,
     * where `count` is the number of failures and `errorCode` matches the `.code` of
     * provided DecryptionError errors (by default, unless `errorCodeMapFn` is specified.
     * @param {function?} errorCodeMapFn The function used to map error codes to the
     * trackedErrorCode. If not provided, the `.code` of errors will be used.
     */
    private constructor(
        private readonly fn: TrackingFn,
        private readonly errorCodeMapFn: ErrCodeMapFn,
    ) {
        if (!fn || typeof fn !== "function") {
            throw new Error("DecryptionFailureTracker requires tracking function");
        }

        if (typeof errorCodeMapFn !== "function") {
            throw new Error("DecryptionFailureTracker second constructor argument should be a function");
        }
    }

    public static get instance(): DecryptionFailureTracker {
        return DecryptionFailureTracker.internalInstance;
    }

    // loadTrackedEvents() {
    //     this.trackedEvents = new Set(JSON.parse(localStorage.getItem('mx-decryption-failure-event-ids')) || []);
    // }

    // saveTrackedEvents() {
    //     localStorage.setItem('mx-decryption-failure-event-ids', JSON.stringify([...this.trackedEvents]));
    // }

    public eventDecrypted(e: MatrixEvent, err: DecryptionError, nowTs: number): void {
        // for now we only track megolm decrytion failures
        if (e.getWireContent().algorithm != "m.megolm.v1.aes-sha2") {
            return;
        }
        if (err) {
            const sender = e.getSender();
            const senderDomain = sender ? sender.split(":")[1] : undefined;
            let isFederated: boolean | undefined;
            if (this.userDomain !== undefined && senderDomain !== undefined) {
                isFederated = this.userDomain !== senderDomain;
            }
            this.addDecryptionFailure(new DecryptionFailure(e.getId()!, err.code, nowTs, isFederated));
        } else {
            // Could be an event in the failures, remove it
            this.removeDecryptionFailuresForEvent(e, nowTs);
        }
    }

    public addVisibleEvent(e: MatrixEvent): void {
        const eventId = e.getId()!;

        if (this.trackedEvents.has(eventId)) {
            return;
        }

        this.visibleEvents.add(eventId);
        if (this.failures.has(eventId) && !this.visibleFailures.has(eventId)) {
            this.visibleFailures.set(eventId, this.failures.get(eventId)!);
        }
    }

    public addDecryptionFailure(failure: DecryptionFailure): void {
        const eventId = failure.failedEventId;

        if (this.trackedEvents.has(eventId)) {
            return;
        }

        this.failures.set(eventId, failure);
        if (this.visibleEvents.has(eventId) && !this.visibleFailures.has(eventId)) {
            this.visibleFailures.set(eventId, failure);
        }
    }

    public removeDecryptionFailuresForEvent(e: MatrixEvent, nowTs: number): void {
        const eventId = e.getId()!;
        const failure = this.failures.get(eventId);
        if (failure) {
            this.failures.delete(eventId);
            this.visibleFailures.delete(eventId);

            const timeToDecryptMillis = nowTs - failure.ts;
            if (timeToDecryptMillis < DecryptionFailureTracker.GRACE_PERIOD_MS) {
                // the event decrypted on time, so we don't need to report it
                return;
            } else if (timeToDecryptMillis <= DecryptionFailureTracker.MAXIMUM_LATE_DECRYPTION_PERIOD) {
                // The event is a late decryption, so store the time it took.
                // If the time to decrypt is longer than
                // MAXIMUM_LATE_DECRYPTION_PERIOD, we consider the event as
                // undecryptable, and leave timeToDecryptMillis undefined
                failure.timeToDecryptMillis = timeToDecryptMillis;
            }
            this.failuresToReport.add(failure);
        }
    }

    private setClient(client: MatrixClient): void {
        const baseProperties: ErrorProperties = {};
        const crypto = client?.getCrypto();
        if (client) {
            this.userDomain = client.getDomain() ?? undefined;
            if (this.userDomain === "matrix.org") {
                baseProperties.isMatrixDotOrg = true;
            } else if (this.userDomain !== undefined) {
                baseProperties.isMatrixDotOrg = false;
            }
        }
        if (crypto) {
            const version = crypto.getVersion();
            if (version.startsWith("Rust SDK")) {
                baseProperties.cryptoSDK = "Rust";
            } else {
                baseProperties.cryptoSDK = "Legacy";
            }
        }

        this.baseProperties = baseProperties;
    }

    /**
     * Start checking for and tracking failures.
     */
    public start(): void {
        this.setClient(MatrixClientPeg.safeGet());
        this.checkInterval = window.setInterval(
            () => this.checkFailures(Date.now()),
            DecryptionFailureTracker.CHECK_INTERVAL_MS,
        );

        this.trackInterval = window.setInterval(() => this.trackFailures(), DecryptionFailureTracker.TRACK_INTERVAL_MS);
    }

    /**
     * Clear state and stop checking for and tracking failures.
     */
    public stop(): void {
        if (this.checkInterval) clearInterval(this.checkInterval);
        if (this.trackInterval) clearInterval(this.trackInterval);

        this.failures = new Map();
        this.visibleEvents = new Set();
        this.visibleFailures = new Map();
        this.failuresToReport = new Set();
    }

    /**
     * Mark failures as undecryptable or late. Only mark one failure per event ID.
     *
     * @param {number} nowTs the timestamp that represents the time now.
     */
    public checkFailures(nowTs: number): void {
        const failures: Set<DecryptionFailure> = new Set();
        const failuresNotReady: Map<string, DecryptionFailure> = new Map();
        for (const [eventId, failure] of this.visibleFailures) {
            if (failure.timeToDecryptMillis) {
                // if `timeToDecryptMillis` is set, we successfully decrypted the
                // event, but we got the key late
                failures.add(failure);
            } else if (nowTs > failure.ts + DecryptionFailureTracker.MAXIMUM_LATE_DECRYPTION_PERIOD) {
                // we haven't decrypted yet and it's past the time for it to be
                // considered a "late" decryption, so we count it as
                // undecryptable
                failures.add(failure);
                this.trackedEvents.add(eventId);
            } else {
                // the event isn't old enough, so keep track of it
                failuresNotReady.set(eventId, failure);
            }
        }
        this.visibleFailures = failuresNotReady;

        // Commented out for now for expediency, we need to consider unbound nature of storing
        // this in localStorage
        // this.saveTrackedEvents();

        this.addFailures(failures);
    }

    private addFailures(failures: Set<DecryptionFailure>): void {
        for (const failure of failures) {
            this.failuresToReport.add(failure);
        }
    }

    /**
     * If there are failures that should be tracked, call the given trackDecryptionFailure
     * function with the number of failures that should be tracked.
     */
    public trackFailures(): void {
        for (const failure of this.failuresToReport) {
            const errorCode = failure.errorCode;
            const trackedErrorCode = this.errorCodeMapFn(errorCode);
            const properties: ErrorProperties = {
                timeToDecryptMillis: failure.timeToDecryptMillis ?? -1,
            };
            if (failure.isFederated !== undefined) {
                properties.isFederated = failure.isFederated;
            }
            if (this.baseProperties) {
                Object.assign(properties, this.baseProperties);
            }
            this.fn(trackedErrorCode, errorCode, properties);
        }
        this.failuresToReport = new Set();
    }
}
