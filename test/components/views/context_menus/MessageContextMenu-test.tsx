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
/* eslint-disable @typescript-eslint/no-var-requires */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { EventStatus, MatrixEvent } from 'matrix-js-sdk/src/models/event';
import { Room } from 'matrix-js-sdk/src/models/room';
import { PendingEventOrdering } from 'matrix-js-sdk/src/matrix';
import { ExtensibleEvent, MessageEvent, M_POLL_KIND_DISCLOSED, PollStartEvent } from 'matrix-events-sdk';
import { Thread } from "matrix-js-sdk/src/models/thread";

import * as TestUtils from '../../../test-utils';
import { MatrixClientPeg } from '../../../../src/MatrixClientPeg';
import RoomContext, { TimelineRenderingType } from "../../../../src/contexts/RoomContext";
import { IRoomState } from "../../../../src/components/structures/RoomView";

const PATH_TO_STRING_UTILS = "../../../../src/utils/strings";
const PATH_TO_EVENT_UTILS = "../../../../src/utils/EventUtils";

jest.mock(PATH_TO_STRING_UTILS);
jest.mock(PATH_TO_EVENT_UTILS);

const { copyPlaintext, getSelectedText } = require(PATH_TO_STRING_UTILS);
const { canEditContent, canForward, isContentActionable } = require(PATH_TO_EVENT_UTILS);

describe('MessageContextMenu', () => {
    beforeAll(() => {
        jest.resetAllMocks();
    });

    it('allows forwarding a room message', () => {
        canForward.mockReturnValue(true);
        isContentActionable.mockReturnValue(true);

        const eventContent = MessageEvent.from("hello");
        const menu = createMenuWithContent(eventContent);
        expect(menu.find('div[aria-label="Forward"]')).toHaveLength(1);
    });

    it('does not allow forwarding a poll', () => {
        canForward.mockReturnValue(false);

        const eventContent = PollStartEvent.from("why?", ["42"], M_POLL_KIND_DISCLOSED);
        const menu = createMenuWithContent(eventContent);
        expect(menu.find('div[aria-label="Forward"]')).toHaveLength(0);
    });

    it('does show copy link button when supplied a link', () => {
        const eventContent = MessageEvent.from("hello");
        const props = {
            link: "https://google.com/",
        };
        const menu = createMenuWithContent(eventContent, props);
        const copyLinkButton = menu.find('a[aria-label="Copy link"]');
        expect(copyLinkButton).toHaveLength(1);
        expect(copyLinkButton.props().href).toBe(props.link);
    });

    it('does not show copy link button when not supplied a link', () => {
        const eventContent = MessageEvent.from("hello");
        const menu = createMenuWithContent(eventContent);
        const copyLinkButton = menu.find('a[aria-label="Copy link"]');
        expect(copyLinkButton).toHaveLength(0);
    });

    it('(right click) copy button does work as expected', () => {
        const text = "hello";
        const eventContent = MessageEvent.from(text);
        const props = {
            rightClick: true,
        };
        getSelectedText.mockReturnValue(text);

        const menu = createMenuWithContent(eventContent, props);
        const copyButton = menu.find('div[aria-label="Copy"]');
        copyButton.simulate("mousedown");
        expect(copyPlaintext).toHaveBeenCalledWith(text);
    });

    it('(right click) copy button is not shown when there is nothing to copy', () => {
        const text = "hello";
        const eventContent = MessageEvent.from(text);
        const props = {
            rightClick: true,
        };
        getSelectedText.mockReturnValue("");

        const menu = createMenuWithContent(eventContent, props);
        const copyButton = menu.find('div[aria-label="Copy"]');
        expect(copyButton).toHaveLength(0);
    });

    it('(right click) shows edit button when we can edit', () => {
        const eventContent = MessageEvent.from("hello");
        const props = {
            rightClick: true,
        };
        canEditContent.mockReturnValue(true);

        const menu = createMenuWithContent(eventContent, props);
        const editButton = menu.find('div[aria-label="Edit"]');
        expect(editButton).toHaveLength(1);
    });

    it('(right click) does not show edit button when we cannot edit', () => {
        const eventContent = MessageEvent.from("hello");
        const props = {
            rightClick: true,
        };
        canEditContent.mockReturnValue(false);

        const menu = createMenuWithContent(eventContent, props);
        const editButton = menu.find('div[aria-label="Edit"]');
        expect(editButton).toHaveLength(0);
    });

    it('(right click) shows reply button when we can reply', () => {
        const eventContent = MessageEvent.from("hello");
        const props = {
            rightClick: true,
        };
        const context = {
            canSendMessages: true,
        };
        isContentActionable.mockReturnValue(true);

        const menu = createMenuWithContent(eventContent, props, context);
        const replyButton = menu.find('div[aria-label="Reply"]');
        expect(replyButton).toHaveLength(1);
    });

    it('(right click) does not show reply button when we cannot reply', () => {
        const eventContent = MessageEvent.from("hello");
        const props = {
            rightClick: true,
        };
        const context = {
            canSendMessages: true,
        };
        isContentActionable.mockReturnValue(false);

        const menu = createMenuWithContent(eventContent, props, context);
        const replyButton = menu.find('div[aria-label="Reply"]');
        expect(replyButton).toHaveLength(0);
    });

    it('(right click) shows react button when we can react', () => {
        const eventContent = MessageEvent.from("hello");
        const props = {
            rightClick: true,
        };
        const context = {
            canReact: true,
        };
        isContentActionable.mockReturnValue(true);

        const menu = createMenuWithContent(eventContent, props, context);
        const reactButton = menu.find('div[aria-label="React"]');
        expect(reactButton).toHaveLength(1);
    });

    it('(right click) does not show react button when we cannot react', () => {
        const eventContent = MessageEvent.from("hello");
        const props = {
            rightClick: true,
        };
        const context = {
            canReact: false,
        };

        const menu = createMenuWithContent(eventContent, props, context);
        const reactButton = menu.find('div[aria-label="React"]');
        expect(reactButton).toHaveLength(0);
    });

    it('(right click) shows view in room button when the event is a thread root', () => {
        const eventContent = MessageEvent.from("hello");
        const mxEvent = new MatrixEvent(eventContent.serialize());
        mxEvent.getThread = () => ({ rootEvent: mxEvent }) as Thread;
        const props = {
            rightClick: true,
        };
        const context = {
            timelineRenderingType: TimelineRenderingType.Thread,
        };

        const menu = createMenu(mxEvent, props, context);
        const reactButton = menu.find('div[aria-label="View in room"]');
        expect(reactButton).toHaveLength(1);
    });

    it('(right click) does not show view in room button when the event is not a thread root', () => {
        const eventContent = MessageEvent.from("hello");
        const props = {
            rightClick: true,
        };

        const menu = createMenuWithContent(eventContent, props);
        const reactButton = menu.find('div[aria-label="View in room"]');
        expect(reactButton).toHaveLength(0);
    });
});

function createMenuWithContent(
    eventContent: ExtensibleEvent,
    props?,
    context?,
): ReactWrapper {
    const mxEvent = new MatrixEvent(eventContent.serialize());
    return createMenu(mxEvent, props, context);
}

function createMenu(mxEvent: MatrixEvent, props?, context = {}): ReactWrapper {
    TestUtils.stubClient();
    const client = MatrixClientPeg.get();
    const MessageContextMenu = require("../../../../src/components/views/context_menus/MessageContextMenu")["default"];

    const room = new Room(
        "roomid",
        client,
        "@user:example.com",
        {
            pendingEventOrdering: PendingEventOrdering.Detached,
        },
    );

    mxEvent.setStatus(EventStatus.SENT);

    client.getUserId = jest.fn().mockReturnValue("@user:example.com");
    client.getRoom = jest.fn().mockReturnValue(room);

    return mount(
        <RoomContext.Provider value={context as IRoomState}>
            <MessageContextMenu
                chevronFace={null}
                mxEvent={mxEvent}
                onFinished={jest.fn(() => {})}
                {...props}
            />
        </RoomContext.Provider>,
    );
}
