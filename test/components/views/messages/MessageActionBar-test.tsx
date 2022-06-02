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

import React from 'react';
<<<<<<< HEAD
import { render, fireEvent } from '@testing-library/react';
=======
import { mount } from 'enzyme';
>>>>>>> 00723661f1 (test most basic paths in messageactionbar)
import { act } from 'react-test-renderer';
import {
    EventType,
    EventStatus,
    MatrixEvent,
<<<<<<< HEAD
    MatrixEventEvent,
=======
>>>>>>> 00723661f1 (test most basic paths in messageactionbar)
    MsgType,
    Room,
} from 'matrix-js-sdk/src/matrix';

import MessageActionBar from '../../../../src/components/views/messages/MessageActionBar';
import {
    getMockClientWithEventEmitter,
    mockClientMethodsUser,
    mockClientMethodsEvents,
<<<<<<< HEAD
=======
    findByAriaLabel,
>>>>>>> 00723661f1 (test most basic paths in messageactionbar)
} from '../../../test-utils';
import { RoomPermalinkCreator } from '../../../../src/utils/permalinks/Permalinks';
import RoomContext, { TimelineRenderingType } from '../../../../src/contexts/RoomContext';
import { IRoomState } from '../../../../src/components/structures/RoomView';
import dispatcher from '../../../../src/dispatcher/dispatcher';
<<<<<<< HEAD
import SettingsStore from '../../../../src/settings/SettingsStore';
=======
>>>>>>> 00723661f1 (test most basic paths in messageactionbar)

jest.mock('../../../../src/dispatcher/dispatcher');

describe('<MessageActionBar />', () => {
    const userId = '@alice:server.org';
    const roomId = '!room:server.org';
    const alicesMessageEvent = new MatrixEvent({
        type: EventType.RoomMessage,
        sender: userId,
        room_id: roomId,
        content: {
            msgtype: MsgType.Text,
            body: 'Hello',
        },
    });

    const bobsMessageEvent = new MatrixEvent({
        type: EventType.RoomMessage,
        sender: '@bob:server.org',
        room_id: roomId,
        content: {
            msgtype: MsgType.Text,
            body: 'I am bob',
        },
    });

    const redactedEvent = new MatrixEvent({
        type: EventType.RoomMessage,
        sender: userId,
    });
    redactedEvent.makeRedacted(redactedEvent);

    const client = getMockClientWithEventEmitter({
        ...mockClientMethodsUser(userId),
        ...mockClientMethodsEvents(),
        getRoom: jest.fn(),
    });
    const room = new Room(roomId, client, userId);
    jest.spyOn(room, 'getPendingEvents').mockReturnValue([]);

    client.getRoom.mockReturnValue(room);

    const defaultProps = {
        getTile: jest.fn(),
        getReplyChain: jest.fn(),
        toggleThreadExpanded: jest.fn(),
        mxEvent: alicesMessageEvent,
        permalinkCreator: new RoomPermalinkCreator(room),
    };
    const defaultRoomContext = {
        ...RoomContext,
        timelineRenderingType: TimelineRenderingType.Room,
        canSendMessages: true,
        canReact: true,
    } as unknown as IRoomState;
    const getComponent = (props = {}, roomContext: Partial<IRoomState> = {}) =>
        render(
            <RoomContext.Provider value={{ ...defaultRoomContext, ...roomContext }}>
                <MessageActionBar {...defaultProps} {...props} />
            </RoomContext.Provider>);

    beforeEach(() => {
        jest.clearAllMocks();
        alicesMessageEvent.setStatus(EventStatus.SENT);
        jest.spyOn(SettingsStore, 'getValue').mockReturnValue(false);
        jest.spyOn(SettingsStore, 'setValue').mockResolvedValue(undefined);
    });

    afterAll(() => {
        jest.spyOn(SettingsStore, 'getValue').mockRestore();
        jest.spyOn(SettingsStore, 'setValue').mockRestore();
    });

    it('kills event listeners on unmount', () => {
        const offSpy = jest.spyOn(alicesMessageEvent, 'off').mockClear();
        const wrapper = getComponent({ mxEvent: alicesMessageEvent });

        act(() => {
            wrapper.unmount();
        });

        expect(offSpy.mock.calls[0][0]).toEqual(MatrixEventEvent.Status);
        expect(offSpy.mock.calls[1][0]).toEqual(MatrixEventEvent.Decrypted);
        expect(offSpy.mock.calls[2][0]).toEqual(MatrixEventEvent.BeforeRedaction);

        expect(client.decryptEventIfNeeded).toHaveBeenCalled();
    });

    describe('decryption', () => {
        it('decrypts event if needed', () => {
            getComponent({ mxEvent: alicesMessageEvent });
            expect(client.decryptEventIfNeeded).toHaveBeenCalled();
        });

        it('updates component on decrypted event', () => {
            const decryptingEvent = new MatrixEvent({
                type: EventType.RoomMessageEncrypted,
                sender: userId,
                room_id: roomId,
                content: {},
            });
            jest.spyOn(decryptingEvent, 'isBeingDecrypted').mockReturnValue(true);
            const { queryByLabelText } = getComponent({ mxEvent: decryptingEvent });

            // still encrypted event is not actionable => no reply button
            expect(queryByLabelText('Reply')).toBeFalsy();

            act(() => {
                // ''decrypt'' the event
                decryptingEvent.event.type = alicesMessageEvent.getType();
                decryptingEvent.event.content = alicesMessageEvent.getContent();
                decryptingEvent.emit(MatrixEventEvent.Decrypted, decryptingEvent);
            });

            // new available actions after decryption
            expect(queryByLabelText('Reply')).toBeTruthy();
        });
    });

    describe('status', () => {
        it('updates component when event status changes', () => {
            alicesMessageEvent.setStatus(EventStatus.QUEUED);
            const { queryByLabelText } = getComponent({ mxEvent: alicesMessageEvent });

            // pending event status, cancel action available
            expect(queryByLabelText('Delete')).toBeTruthy();

            act(() => {
                alicesMessageEvent.setStatus(EventStatus.SENT);
            });

            // event is sent, no longer cancelable
            expect(queryByLabelText('Delete')).toBeFalsy();
        });
    });

    describe('redaction', () => {
        // this doesn't do what it's supposed to
        // because beforeRedaction event is fired... before redaction
        // event is unchanged at point when this component updates
        // TODO file bug
        xit('updates component on before redaction event', () => {
            const event = new MatrixEvent({
                type: EventType.RoomMessage,
                sender: userId,
                room_id: roomId,
                content: {
                    msgtype: MsgType.Text,
                    body: 'Hello',
                },
            });
            const { queryByLabelText } = getComponent({ mxEvent: event });

            // no pending redaction => no delete button
            expect(queryByLabelText('Delete')).toBeFalsy();

            act(() => {
                const redactionEvent = new MatrixEvent({
                    type: EventType.RoomRedaction,
                    sender: userId,
                    room_id: roomId,
                });
                redactionEvent.setStatus(EventStatus.QUEUED);
                event.markLocallyRedacted(redactionEvent);
            });

            // updated with local redaction event, delete now available
            expect(queryByLabelText('Delete')).toBeTruthy();
        });
    });

    describe('options button', () => {
        it('renders options menu', () => {
            const { queryByLabelText } = getComponent({ mxEvent: alicesMessageEvent });
            expect(queryByLabelText('Options')).toBeTruthy();
        });

        it('opens message context menu on click', () => {
            const { findByTestId, queryByLabelText } = getComponent({ mxEvent: alicesMessageEvent });
            act(() => {
                fireEvent.click(queryByLabelText('Options'));
            });
            expect(findByTestId('mx_MessageContextMenu')).toBeTruthy();
        });
    });

    describe('reply button', () => {
        it('renders reply button on own actionable event', () => {
            const { queryByLabelText } = getComponent({ mxEvent: alicesMessageEvent });
            expect(queryByLabelText('Reply')).toBeTruthy();
        });

        it('renders reply button on others actionable event', () => {
            const { queryByLabelText } = getComponent({ mxEvent: bobsMessageEvent }, { canSendMessages: true });
            expect(queryByLabelText('Reply')).toBeTruthy();
        });

        it('does not render reply button on non-actionable event', () => {
            // redacted event is not actionable
            const { queryByLabelText } = getComponent({ mxEvent: redactedEvent });
            expect(queryByLabelText('Reply')).toBeFalsy();
        });

        it('does not render reply button when user cannot send messaged', () => {
            // redacted event is not actionable
            const { queryByLabelText } = getComponent({ mxEvent: redactedEvent }, { canSendMessages: false });
            expect(queryByLabelText('Reply')).toBeFalsy();
        });

        it('dispatches reply event on click', () => {
            const { queryByLabelText } = getComponent({ mxEvent: alicesMessageEvent });

            act(() => {
                fireEvent.click(queryByLabelText('Reply'));
            });

            expect(dispatcher.dispatch).toHaveBeenCalledWith({
                action: 'reply_to_event',
                event: alicesMessageEvent,
                context: TimelineRenderingType.Room,
            });
        });
    });

    describe('react button', () => {
        it('renders react button on own actionable event', () => {
            const { queryByLabelText } = getComponent({ mxEvent: alicesMessageEvent });
            expect(queryByLabelText('React')).toBeTruthy();
        });

        it('renders react button on others actionable event', () => {
            const { queryByLabelText } = getComponent({ mxEvent: bobsMessageEvent });
            expect(queryByLabelText('React')).toBeTruthy();
        });

        it('does not render react button on non-actionable event', () => {
            // redacted event is not actionable
            const { queryByLabelText } = getComponent({ mxEvent: redactedEvent });
            expect(queryByLabelText('React')).toBeFalsy();
        });

        it('does not render react button when user cannot react', () => {
            // redacted event is not actionable
            const { queryByLabelText } = getComponent({ mxEvent: redactedEvent }, { canReact: false });
            expect(queryByLabelText('React')).toBeFalsy();
        });

        it('opens reaction picker on click', () => {
            const { queryByLabelText, findByTestId } = getComponent({ mxEvent: alicesMessageEvent });
            act(() => {
                fireEvent.click(queryByLabelText('React'));
            });
            expect(findByTestId('mx_ReactionPicker')).toBeTruthy();
        });
    });

    describe('cancel button', () => {
        it('renders cancel button for an event with a cancelable status', () => {
            alicesMessageEvent.setStatus(EventStatus.QUEUED);
            const { queryByLabelText } = getComponent({ mxEvent: alicesMessageEvent });
            expect(queryByLabelText('Delete')).toBeTruthy();
        });

        it('renders cancel button for an event with a pending edit', () => {
            const event = new MatrixEvent({
                type: EventType.RoomMessage,
                sender: userId,
                room_id: roomId,
                content: {
                    msgtype: MsgType.Text,
                    body: 'Hello',
                },
            });
            event.setStatus(EventStatus.SENT);
            const replacingEvent = new MatrixEvent({
                type: EventType.RoomMessage,
                sender: userId,
                room_id: roomId,
                content: {
                    msgtype: MsgType.Text,
                    body: 'replacing event body',
                },
            });
            replacingEvent.setStatus(EventStatus.QUEUED);
            event.makeReplaced(replacingEvent);
            const { queryByLabelText } = getComponent({ mxEvent: event });
            expect(queryByLabelText('Delete')).toBeTruthy();
        });

        it('renders cancel button for an event with a pending redaction', () => {
            const event = new MatrixEvent({
                type: EventType.RoomMessage,
                sender: userId,
                room_id: roomId,
                content: {
                    msgtype: MsgType.Text,
                    body: 'Hello',
                },
            });
            event.setStatus(EventStatus.SENT);

            const redactionEvent = new MatrixEvent({
                type: EventType.RoomRedaction,
                sender: userId,
                room_id: roomId,
            });
            redactionEvent.setStatus(EventStatus.QUEUED);

            event.markLocallyRedacted(redactionEvent);
            const { queryByLabelText } = getComponent({ mxEvent: event });
            expect(queryByLabelText('Delete')).toBeTruthy();
        });

        it('renders cancel and retry button for an event with NOT_SENT status', () => {
            alicesMessageEvent.setStatus(EventStatus.NOT_SENT);
            const { queryByLabelText } = getComponent({ mxEvent: alicesMessageEvent });
            expect(queryByLabelText('Retry')).toBeTruthy();
            expect(queryByLabelText('Delete')).toBeTruthy();
        });

        it.todo('unsends event on cancel click');
        it.todo('retrys event on retry click');
    });
});
