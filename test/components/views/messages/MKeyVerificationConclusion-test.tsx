import React from 'react';
import TestRenderer from 'react-test-renderer';
import { EventEmitter } from 'events';
import { MatrixEvent, EventType } from 'matrix-js-sdk/src/matrix';
import { CryptoEvent } from 'matrix-js-sdk/src/crypto';
import { UserTrustLevel } from 'matrix-js-sdk/src/crypto/CrossSigning';
import { VerificationRequest } from 'matrix-js-sdk/src/crypto/verification/request/VerificationRequest';

import { MatrixClientPeg } from '../../../../src/MatrixClientPeg';
import MKeyVerificationConclusion from '../../../../src/components/views/messages/MKeyVerificationConclusion';
import { getMockClientWithEventEmitter } from '../../../test-utils';

const trustworthy = ({ isCrossSigningVerified: () => true }) as unknown as UserTrustLevel;
const untrustworthy = ({ isCrossSigningVerified: () => false }) as unknown as UserTrustLevel;

describe("MKeyVerificationConclusion", () => {
    const userId = '@user:server';
    const mockClient = getMockClientWithEventEmitter({
        getRoom: jest.fn(),
        getUserId: jest.fn().mockReturnValue(userId),
        checkUserTrust: jest.fn(),
    });

    const getMockVerificationRequest = (
        { pending, cancelled, done, otherUserId }:
        { pending?: boolean, cancelled?: boolean, done?: boolean, otherUserId?: string },
    ) => {
        class MockVerificationRequest extends EventEmitter {
            constructor(
                public readonly pending: boolean,
                public readonly cancelled: boolean,
                public readonly done: boolean,
                public readonly otherUserId: string,
            ) {
                super();
            }
        }
        return new MockVerificationRequest(pending, cancelled, done, otherUserId) as unknown as VerificationRequest;
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockClient.checkUserTrust.mockReturnValue(trustworthy);
    });

    afterAll(() => {
        jest.spyOn(MatrixClientPeg, 'get').mockRestore();
    });

    it("shouldn't render if there's no verificationRequest", () => {
        const event = new MatrixEvent({});
        const renderer = TestRenderer.create(
            <MKeyVerificationConclusion mxEvent={event} />,
        );
        expect(renderer.toJSON()).toBeNull();
    });

    it("shouldn't render if the verificationRequest is pending", () => {
        const event = new MatrixEvent({});
        event.verificationRequest = getMockVerificationRequest({ pending: true });
        const renderer = TestRenderer.create(
            <MKeyVerificationConclusion mxEvent={event} />,
        );
        expect(renderer.toJSON()).toBeNull();
    });

    it("shouldn't render if the event type is cancel but the request type isn't", () => {
        const event = new MatrixEvent({ type: EventType.KeyVerificationCancel });
        event.verificationRequest = getMockVerificationRequest({ cancelled: false });
        const renderer = TestRenderer.create(
            <MKeyVerificationConclusion mxEvent={event} />,
        );
        expect(renderer.toJSON()).toBeNull();
    });

    it("shouldn't render if the event type is done but the request type isn't", () => {
        const event = new MatrixEvent({ type: "m.key.verification.done" });
        event.verificationRequest = getMockVerificationRequest({ done: false });
        const renderer = TestRenderer.create(
            <MKeyVerificationConclusion mxEvent={event} />,
        );
        expect(renderer.toJSON()).toBeNull();
    });

    it("shouldn't render if the user isn't actually trusted", () => {
        mockClient.checkUserTrust.mockReturnValue(untrustworthy);

        const event = new MatrixEvent({ type: "m.key.verification.done" });
        event.verificationRequest = getMockVerificationRequest({ done: true });
        const renderer = TestRenderer.create(
            <MKeyVerificationConclusion mxEvent={event} />,
        );
        expect(renderer.toJSON()).toBeNull();
    });

    it("should rerender appropriately if user trust status changes", () => {
        mockClient.checkUserTrust.mockReturnValue(untrustworthy);

        const event = new MatrixEvent({ type: "m.key.verification.done" });
        event.verificationRequest = getMockVerificationRequest({ done: true, otherUserId: "@someuser:domain" });
        const renderer = TestRenderer.create(
            <MKeyVerificationConclusion mxEvent={event} />,
        );
        expect(renderer.toJSON()).toBeNull();

        mockClient.checkUserTrust.mockReturnValue(trustworthy);

        /* Ensure we don't rerender for every trust status change of any user */
        mockClient.emit(CryptoEvent.UserTrustStatusChanged, "@anotheruser:domain");
        expect(renderer.toJSON()).toBeNull();

        /* But when our user changes, we do rerender */
        mockClient.emit(CryptoEvent.UserTrustStatusChanged, event.verificationRequest.otherUserId);
        expect(renderer.toJSON()).not.toBeNull();
    });
});
