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

import React from "react";
// eslint-disable-next-line deprecate/import
import { mount } from "enzyme";
import { mocked, MockedObject } from "jest-mock";
import { EventType, MatrixClient, MatrixEvent, MsgType } from "matrix-js-sdk/src/matrix";

import _FavouriteMessagesView from "../../../src/components/structures/FavouriteMessagesView/FavouriteMessagesView";
import { stubClient, mockPlatformPeg, unmockPlatformPeg, wrapInMatrixClientContext } from "../../test-utils";
import { MatrixClientPeg } from "../../../src/MatrixClientPeg";
import FavouriteMessagesPanel from "../../../src/components/structures/FavouriteMessagesView/FavouriteMessagesPanel";
import SettingsStore from "../../../src/settings/SettingsStore";

const FavouriteMessagesView = wrapInMatrixClientContext(_FavouriteMessagesView);

describe("FavouriteMessagesView", () => {
    let cli: MockedObject<MatrixClient>;
    // let room: Room;
    const userId = '@alice:server.org';
    const roomId = '!room:server.org';
    const alicesFavouriteMessageEvent = new MatrixEvent({
        type: EventType.RoomMessage,
        sender: userId,
        room_id: roomId,
        content: {
            msgtype: MsgType.Text,
            body: 'i am alice',
        },
        event_id: "$alices_message",
    });

    const bobsFavouriteMessageEvent = new MatrixEvent({
        type: EventType.RoomMessage,
        sender: '@bob:server.org',
        room_id: roomId,
        content: {
            msgtype: MsgType.Text,
            body: 'i am bob',
        },
        event_id: "$bobs_message",
    });

    beforeEach(async () => {
        mockPlatformPeg({ reload: () => {} });
        stubClient();
        cli = mocked(MatrixClientPeg.get());
    });

    afterEach(async () => {
        unmockPlatformPeg();
        jest.restoreAllMocks();
    });

    describe('favourite_messages feature when enabled', () => {
        beforeEach(() => {
            jest.spyOn(SettingsStore, 'getValue')
                .mockImplementation(setting => setting === 'feature_favourite_messages');
        });

        it('renders <FavouriteMessagesView /> correctly', () => {
            const view = mount(<FavouriteMessagesView />);
            expect(view.html()).toMatchSnapshot();
        });

        it('renders <FavouriteMessagesPanel /> component with empty or default props correctly', () => {
            const props = {
                favouriteMessageEvents: [],
                handleSearchQuery: jest.fn(),
                cli,
            };
            const view = mount(<FavouriteMessagesPanel {...props} />);
            expect(view.prop('favouriteMessageEvents')).toHaveLength(0);
            expect(view.contains("No Saved Messages")).toBeTruthy();
        });

        it('renders starred messages correctly for a single event', () => {
            const props = {
                favouriteMessageEvents: [bobsFavouriteMessageEvent],
                handleSearchQuery: jest.fn(),
                cli,
            };
            const view = mount(<FavouriteMessagesPanel {...props} />);

            expect(view.find('.mx_EventTile_body').text()).toEqual("i am bob");
        });

        it('renders starred messages correctly for multiple single event', () => {
            const props = {
                favouriteMessageEvents: [alicesFavouriteMessageEvent, bobsFavouriteMessageEvent],
                handleSearchQuery: jest.fn(),
                cli,
            };
            const view = mount(<FavouriteMessagesPanel {...props} />);
            //for alice
            expect(view.find("li[data-event-id='$alices_message']")).toBeDefined();
            expect(view.find("li[data-event-id='$alices_message']").contains("i am alice")).toBeTruthy();

            //for bob
            expect(view.find("li[data-event-id='$bobs_message']")).toBeDefined();
            expect(view.find("li[data-event-id='$bobs_message']").contains("i am bob")).toBeTruthy();
        });
    });
});
