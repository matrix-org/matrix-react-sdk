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
import { mount } from 'enzyme';
import { act } from 'react-test-renderer';
import {
    EventType,
    EventStatus,
    MatrixEvent,
    MatrixEventEvent,
    MsgType,
    Room,
} from 'matrix-js-sdk/src/matrix';

import MessageActionBar from '../../../../src/components/views/messages/MessageActionBar';
import {
    getMockClientWithEventEmitter,
    mockClientMethodsUser,
    mockClientMethodsEvents,
    findByAriaLabel,
} from '../../../test-utils';
import { RoomPermalinkCreator } from '../../../../src/utils/permalinks/Permalinks';
import RoomContext, { TimelineRenderingType } from '../../../../src/contexts/RoomContext';
import { IRoomState } from '../../../../src/components/structures/RoomView';
import dispatcher from '../../../../src/dispatcher/dispatcher';

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
    };
    const getComponent = (props = {}, roomContext: Partial<IRoomState> = {}) =>
        mount(<MessageActionBar {...defaultProps} {...props} />, {
            wrappingComponent: RoomContext.Provider,
            wrappingComponentProps: { value: { ...defaultRoomContext, ...roomContext } },
        });

    beforeEach(() => {
        jest.clearAllMocks();
        alicesMessageEvent.setStatus(EventStatus.SENT);
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
            const component = getComponent({ mxEvent: decryptingEvent });

            // still encrypted event is not actionable => no reply button
            expect(findByAriaLabel(component, 'Reply').length).toBeFalsy();

            act(() => {
                // ''decrypt'' the event
                decryptingEvent.event.type = alicesMessageEvent.getType();
                decryptingEvent.event.content = alicesMessageEvent.getContent();
                decryptingEvent.emit(MatrixEventEvent.Decrypted, decryptingEvent);
            });

            component.update();

            // new available actions after decryption
            expect(findByAriaLabel(component, 'Reply').length).toBeTruthy();
        });
    });

    describe('status', () => {
        it('updates component when event status changes', () => {
            alicesMessageEvent.setStatus(EventStatus.QUEUED);
            const component = getComponent({ mxEvent: alicesMessageEvent });

            // pending event status, cancel action available
            expect(findByAriaLabel(component, 'Delete').length).toBeTruthy();

            act(() => {
                alicesMessageEvent.setStatus(EventStatus.SENT);
            });

            component.update();

            // event is sent, no longer cancelable
            expect(findByAriaLabel(component, 'Delete').length).toBeFalsy();
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
            const component = getComponent({ mxEvent: event });

            // no pending redaction => no delete button
            expect(findByAriaLabel(component, 'Delete').length).toBeFalsy();

            act(() => {
                const redactionEvent = new MatrixEvent({
                    type: EventType.RoomRedaction,
                    sender: userId,
                    room_id: roomId,
                });
                redactionEvent.setStatus(EventStatus.QUEUED);
                event.markLocallyRedacted(redactionEvent);
            });

            component.update();

            // updated with local redaction event, delete now available
            expect(findByAriaLabel(component, 'Delete').length).toBeTruthy();
        });
    });

    describe('options button', () => {
        it('renders options menu', () => {
            const component = getComponent({ mxEvent: alicesMessageEvent });
            expect(findByAriaLabel(component, 'Options').length).toBeTruthy();
        });

        it('opens message context menu on click', () => {
            const component = getComponent({ mxEvent: alicesMessageEvent });
            act(() => {
                findByAriaLabel(component, 'Options').at(0).simulate('click');
            });
            expect(component.find('MessageContextMenu').length).toBeTruthy();
        });
    });

    describe('reply button', () => {
        it('renders reply button on own actionable event', () => {
            const component = getComponent({ mxEvent: alicesMessageEvent });
            expect(findByAriaLabel(component, 'Reply').length).toBeTruthy();
        });

        it('renders reply button on others actionable event', () => {
            const component = getComponent({ mxEvent: bobsMessageEvent }, { canSendMessages: true });
            expect(findByAriaLabel(component, 'Reply').length).toBeTruthy();
        });

        it('does not render reply button on non-actionable event', () => {
            // redacted event is not actionable
            const component = getComponent({ mxEvent: redactedEvent });
            expect(findByAriaLabel(component, 'Reply').length).toBeFalsy();
        });

        it('does not render reply button when user cannot send messaged', () => {
            // redacted event is not actionable
            const component = getComponent({ mxEvent: redactedEvent }, { canSendMessages: false });
            expect(findByAriaLabel(component, 'Reply').length).toBeFalsy();
        });

        it('dispatches reply event on click', () => {
            const component = getComponent({ mxEvent: alicesMessageEvent });

            act(() => {
                findByAriaLabel(component, 'Reply').at(0).simulate('click');
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
            const component = getComponent({ mxEvent: alicesMessageEvent });
            expect(findByAriaLabel(component, 'React').length).toBeTruthy();
        });

        it('renders react button on others actionable event', () => {
            const component = getComponent({ mxEvent: bobsMessageEvent });
            expect(findByAriaLabel(component, 'React').length).toBeTruthy();
        });

        it('does not render react button on non-actionable event', () => {
            // redacted event is not actionable
            const component = getComponent({ mxEvent: redactedEvent });
            expect(findByAriaLabel(component, 'React').length).toBeFalsy();
        });

        it('does not render react button when user cannot react', () => {
            // redacted event is not actionable
            const component = getComponent({ mxEvent: redactedEvent }, { canReact: false });
            expect(findByAriaLabel(component, 'React').length).toBeFalsy();
        });

        it('opens reaction picker on click', () => {
            const component = getComponent({ mxEvent: alicesMessageEvent });
            act(() => {
                findByAriaLabel(component, 'React').at(0).simulate('click');
            });
            expect(component.find('ReactionPicker').length).toBeTruthy();
        });
    });

    describe('cancel button', () => {
        it('renders cancel button for an event with a cancelable status', () => {
            alicesMessageEvent.setStatus(EventStatus.QUEUED);
            const component = getComponent({ mxEvent: alicesMessageEvent });
            expect(findByAriaLabel(component, 'Delete').length).toBeTruthy();
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
            const component = getComponent({ mxEvent: event });
            expect(findByAriaLabel(component, 'Delete').length).toBeTruthy();
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
            const component = getComponent({ mxEvent: event });
            expect(findByAriaLabel(component, 'Delete').length).toBeTruthy();
        });

        it('renders cancel and retry button for an event with NOT_SENT status', () => {
            alicesMessageEvent.setStatus(EventStatus.NOT_SENT);
            const component = getComponent({ mxEvent: alicesMessageEvent });
            expect(findByAriaLabel(component, 'Retry').length).toBeTruthy();
            expect(findByAriaLabel(component, 'Delete').length).toBeTruthy();
        });

        it.todo('unsends event on cancel click');
        it.todo('retrys event on retry click');
    });
});
