/*
Copyright 2023 The Matrix.org Foundation C.I.C.

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
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { mocked } from "jest-mock";

import SettingsStore from "../../../../src/settings/SettingsStore";
import { SettingLevel } from "../../../../src/settings/SettingLevel";
import { EventType, MatrixEvent, MsgType, Room } from "../../../../../matrix-js-sdk";
import { IRoomState } from "../../../../src/components/structures/RoomView";
import RoomContext, { TimelineRenderingType } from "../../../../src/contexts/RoomContext";
import MessageActionBar from "../../../../src/components/views/messages/MessageActionBar";
import { RoomPermalinkCreator } from "../../../../src/utils/permalinks/Permalinks";
import { stubClient } from "../../../test-utils";
import { MatrixClientPeg } from "../../../../src/MatrixClientPeg";

/**
 * Broken into a separate test file since we need a real dispatcher and
 * SettingsStore to validate the behaviour when we respond to clicks.
 */
describe("<MessageActionBar /> favourites", () => {
    const userId = "@alice:server.org";
    const roomId = "!room:server.org";
    const alicesMessageEvent = new MatrixEvent({
        type: EventType.RoomMessage,
        sender: userId,
        room_id: roomId,
        content: {
            msgtype: MsgType.Text,
            body: "Hello",
        },
        event_id: "$alices_message",
    });

    const bobsMessageEvent = new MatrixEvent({
        type: EventType.RoomMessage,
        sender: "@bob:server.org",
        room_id: roomId,
        content: {
            msgtype: MsgType.Text,
            body: "I am bob",
        },
        event_id: "$bobs_message",
    });

    stubClient();
    const matrixClient = mocked(MatrixClientPeg.get());
    const room = new Room(roomId, matrixClient, userId);
    jest.spyOn(room, "getPendingEvents").mockReturnValue([]);
    matrixClient.getRoom.mockReturnValue(room);

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
            </RoomContext.Provider>,
        );
    const favButton = (evt: MatrixEvent) => {
        return getComponent({ mxEvent: evt }).getByTestId(evt.getId());
    };

    beforeEach(() => {
        SettingsStore.setValue("feature_favourite_messages", null, SettingLevel.DEVICE, true);
    });

    it("remembers favourited state of events", async () => {
        // Given two buttons, both unclicked
        const alicesAction = favButton(alicesMessageEvent);
        const bobsAction = favButton(bobsMessageEvent);

        expect(alicesAction.classList).not.toContain("mx_MessageActionBar_favouriteButton_fillstar");
        expect(bobsAction.classList).not.toContain("mx_MessageActionBar_favouriteButton_fillstar");

        // When I click one
        act(() => {
            fireEvent.click(alicesAction);
        });

        // Then it becomes selected
        await waitFor(() => {
            expect(alicesAction.classList).toContain("mx_MessageActionBar_favouriteButton_fillstar");
            expect(bobsAction.classList).not.toContain("mx_MessageActionBar_favouriteButton_fillstar");
        });

        // And when I click the other
        act(() => {
            fireEvent.click(bobsAction);
        });

        // They are both selected
        await waitFor(() => {
            expect(alicesAction.classList).toContain("mx_MessageActionBar_favouriteButton_fillstar");
            expect(bobsAction.classList).toContain("mx_MessageActionBar_favouriteButton_fillstar");
        });

        // And when I click Bob's message again
        act(() => {
            fireEvent.click(bobsAction);
        });

        // Bob's message becomes unselected
        await waitFor(() => {
            expect(bobsAction.classList).not.toContain("mx_MessageActionBar_favouriteButton_fillstar");
            expect(alicesAction.classList).toContain("mx_MessageActionBar_favouriteButton_fillstar");
        });
    });
});
