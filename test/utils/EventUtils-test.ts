import {
    EventStatus,
    EventType,
    MatrixEvent,
    MsgType,
} from "matrix-js-sdk/src/matrix";

import { isContentActionable } from "../../src/utils/EventUtils";
import { makeBeaconInfoEvent, makePollStartEvent } from "../test-utils";

describe('EventUtils', () => {
    describe('isContentActionable', () => {
        const userId = '@user:server';
        const roomId = '!room:server';
        // setup events
        const unsentEvent = new MatrixEvent({
            type: EventType.RoomMessage,
        });
        unsentEvent.status = EventStatus.ENCRYPTING;

        const redactedEvent = new MatrixEvent({
            type: EventType.RoomMessage,
        });
        redactedEvent.makeRedacted(redactedEvent);

        const stateEvent = makeBeaconInfoEvent(userId, roomId);
        const stickerEvent = new MatrixEvent({
            type: EventType.Sticker,
        });

        const pollStartEvent = makePollStartEvent('What?', userId);

        const notDecryptedEvent = new MatrixEvent({
            type: EventType.RoomMessage,
            content: {
                msgtype: 'm.bad.encrypted',
            },
        });

        const noMsgType = new MatrixEvent({
            type: EventType.RoomMessage,
            content: {
                msgtype: undefined,
            },
        });

        const noContentBody = new MatrixEvent({
            type: EventType.RoomMessage,
            content: {
                msgtype: MsgType.Image,
            },
        });

        const emptyContentBody = new MatrixEvent({
            type: EventType.RoomMessage,
            content: {
                msgtype: MsgType.Image,
                body: '',
            },
        });

        const niceTextMessage = new MatrixEvent({
            type: EventType.RoomMessage,
            content: {
                msgtype: MsgType.Text,
                body: 'Hello',
            },
        });

        type TestCase = [boolean, string, MatrixEvent];
        it.each<TestCase>([
            [false, 'unsent event', unsentEvent],
            [false, 'redacted event', redactedEvent],
            [false, 'state event', stateEvent],
            [false, 'undecrypted event', notDecryptedEvent],
            [false, 'event without msgtype', noMsgType],
            [false, 'event without content body property', noContentBody],
            [true, 'sticker event', stickerEvent],
            [true, 'poll start event', pollStartEvent],
            [true, 'event with empty content body', emptyContentBody],
            [true, 'event with a content body', niceTextMessage],
        ])('returns %s for %s', (result, _description, event) => {
            expect(isContentActionable(event)).toBe(result);
        });
    });
});
