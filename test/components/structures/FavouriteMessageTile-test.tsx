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
import { render } from "@testing-library/react";
import { EventType, MatrixEvent, MsgType } from "matrix-js-sdk/src/matrix";

import { stubClient } from "../../test-utils";
import SettingsStore from "../../../src/settings/SettingsStore";
import FavouriteMessageTile from "../../../src/components/structures/FavouriteMessagesView/FavouriteMessageTile";

describe("FavouriteMessageTile", () => {
    const userId = "@alice:server.org";
    const roomId = "!room:server.org";
    const eventBefore = new MatrixEvent({
        type: EventType.RoomMessage,
        sender: userId,
        room_id: roomId,
        content: {
            msgtype: MsgType.Text,
            body: "i am before",
        },
        event_id: "$alices_message",
        origin_server_ts: 111111111111,
    });
    const alicesEvent = new MatrixEvent({
        type: EventType.RoomMessage,
        sender: userId,
        room_id: roomId,
        content: {
            msgtype: MsgType.Text,
            body: "i am alice",
        },
        event_id: "$alices_message",
        origin_server_ts: 222222222222,
    });
    const eventAfter = new MatrixEvent({
        type: EventType.RoomMessage,
        sender: userId,
        room_id: roomId,
        content: {
            msgtype: MsgType.Text,
            body: "i am after",
        },
        event_id: "$alices_message",
        origin_server_ts: 333333333333,
    });

    beforeEach(async () => {
        jest.spyOn(SettingsStore, "getValue").mockImplementation((setting) => setting === "feature_favourite_messages");
        stubClient();
    });

    afterEach(async () => {
        jest.resetAllMocks();
    });

    it("displays the favourite content", async () => {
        const view = render(<FavouriteMessageTile result={alicesEvent} resultLink="" timeline={[alicesEvent]} />);
        view.getByText("i am alice");
        expect(view.asFragment()).toMatchSnapshot();
    });

    it("displays the favourite content within a timeline", async () => {
        const view = render(
            <FavouriteMessageTile
                result={alicesEvent}
                resultLink=""
                timeline={[eventBefore, alicesEvent, eventAfter]}
            />,
        );
        view.getByText("i am alice");
        expect(view.asFragment()).toMatchSnapshot();
    });
});
