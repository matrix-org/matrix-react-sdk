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
        <RoomContext.Provider value={context as unknown as any}>
            <MessageContextMenu
                chevronFace={null}
                mxEvent={mxEvent}
                onFinished={jest.fn(() => {})}
                {...props}
            />
        </RoomContext.Provider>,
    );
}
