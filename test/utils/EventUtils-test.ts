import {
    EventStatus,
    EventType,
    MatrixEvent,
    MsgType,
    RelationType,
} from "matrix-js-sdk/src/matrix";

import { MatrixClientPeg } from "../../src/MatrixClientPeg";
import { canEditContent, canEditOwnEvent, isContentActionable } from "../../src/utils/EventUtils";
import { getMockClientWithEventEmitter, makeBeaconInfoEvent, makePollStartEvent } from "../test-utils";

describe('EventUtils', () => {
    const userId = '@user:server';
    const roomId = '!room:server';
    const mockClient = getMockClientWithEventEmitter({
        getUserId: jest.fn().mockReturnValue(userId),
    });

    beforeEach(() => {
        mockClient.getUserId.mockClear().mockReturnValue(userId);
    });
    afterAll(() => {
        jest.spyOn(MatrixClientPeg, 'get').mockRestore();
    });

    // setup events
    const unsentEvent = new MatrixEvent({
        type: EventType.RoomMessage,
        sender: userId,
    });
    unsentEvent.status = EventStatus.ENCRYPTING;

    const redactedEvent = new MatrixEvent({
        type: EventType.RoomMessage,
        sender: userId,
    });
    redactedEvent.makeRedacted(redactedEvent);

    const stateEvent = makeBeaconInfoEvent(userId, roomId);

    const roomMemberEvent = new MatrixEvent({
        type: EventType.RoomMember,
        sender: userId,
    });

    const stickerEvent = new MatrixEvent({
        type: EventType.Sticker,
        sender: userId,
    });

    const pollStartEvent = makePollStartEvent('What?', userId);

    const notDecryptedEvent = new MatrixEvent({
        type: EventType.RoomMessage,
        sender: userId,
        content: {
            msgtype: 'm.bad.encrypted',
        },
    });

    const noMsgType = new MatrixEvent({
        type: EventType.RoomMessage,
        sender: userId,
        content: {
            msgtype: undefined,
        },
    });

    const noContentBody = new MatrixEvent({
        type: EventType.RoomMessage,
        sender: userId,
        content: {
            msgtype: MsgType.Image,
        },
    });

    const emptyContentBody = new MatrixEvent({
        type: EventType.RoomMessage,
        sender: userId,
        content: {
            msgtype: MsgType.Text,
            body: '',
        },
    });

    const objectContentBody = new MatrixEvent({
        type: EventType.RoomMessage,
        sender: userId,
        content: {
            msgtype: MsgType.File,
            body: {},
        },
    });

    const niceTextMessage = new MatrixEvent({
        type: EventType.RoomMessage,
        sender: userId,
        content: {
            msgtype: MsgType.Text,
            body: 'Hello',
        },
    });

    const bobsTextMessage = new MatrixEvent({
        type: EventType.RoomMessage,
        sender: '@bob:server',
        content: {
            msgtype: MsgType.Text,
            body: 'Hello from Bob',
        },
    });

    describe('isContentActionable()', () => {
        type TestCase = [string, MatrixEvent];
        it.each<TestCase>([
            ['unsent event', unsentEvent],
            ['redacted event', redactedEvent],
            ['state event', stateEvent],
            ['undecrypted event', notDecryptedEvent],
            ['room member event', roomMemberEvent],
            ['event without msgtype', noMsgType],
            ['event without content body property', noContentBody],
        ])('returns false for %s', (_description, event) => {
            expect(isContentActionable(event)).toBe(false);
        });

        it.each<TestCase>([
            ['sticker event', stickerEvent],
            ['poll start event', pollStartEvent],
            ['event with empty content body', emptyContentBody],
            ['event with a content body', niceTextMessage],
        ])('returns true for %s', (_description, event) => {
            expect(isContentActionable(event)).toBe(true);
        });
    });

    describe('editable content helpers', () => {
        const replaceRelationEvent = new MatrixEvent({
            type: EventType.RoomMessage,
            sender: userId,
            content: {
                msgtype: MsgType.Text,
                body: 'Hello',
                ['m.relates_to']: {
                    rel_type: RelationType.Replace,
                    event_id: '1',
                },
            },
        });

        const referenceRelationEvent = new MatrixEvent({
            type: EventType.RoomMessage,
            sender: userId,
            content: {
                msgtype: MsgType.Text,
                body: 'Hello',
                ['m.relates_to']: {
                    rel_type: RelationType.Reference,
                    event_id: '1',
                },
            },
        });

        const emoteEvent = new MatrixEvent({
            type: EventType.RoomMessage,
            sender: userId,
            content: {
                msgtype: MsgType.Emote,
                body: '🧪',
            },
        });

        type TestCase = [string, MatrixEvent];

        const uneditableCases: TestCase[] = [
            ['redacted event', redactedEvent],
            ['state event', stateEvent],
            ['event that is not room message', roomMemberEvent],
            ['event without msgtype', noMsgType],
            ['event without content body property', noContentBody],
            ['event with empty content body property', emptyContentBody],
            ['event with non-string body', objectContentBody],
            ['event not sent by current user', bobsTextMessage],
            ['event with a replace relation', replaceRelationEvent],
        ];

        const editableCases: TestCase[] = [
            ['event with reference relation', referenceRelationEvent],
            ['emote event', emoteEvent],
            ['poll start event', pollStartEvent],
            ['event with a content body', niceTextMessage],
        ];

        describe('canEditContent()', () => {
            it.each<TestCase>(uneditableCases)('returns false for %s', (_description, event) => {
                expect(canEditContent(event)).toBe(false);
            });

            it.each<TestCase>(editableCases)('returns true for %s', (_description, event) => {
                expect(canEditContent(event)).toBe(true);
            });
        });
        describe('canEditOwnContent()', () => {
            it.each<TestCase>(uneditableCases)('returns false for %s', (_description, event) => {
                expect(canEditOwnEvent(event)).toBe(false);
            });

            it.each<TestCase>(editableCases)('returns true for %s', (_description, event) => {
                expect(canEditOwnEvent(event)).toBe(true);
            });
        });
    });
});
