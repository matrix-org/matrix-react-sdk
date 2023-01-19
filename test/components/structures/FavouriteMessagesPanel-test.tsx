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
import { mocked, MockedObject } from "jest-mock";
import { EventType, MatrixClient, MatrixEvent, MsgType } from "matrix-js-sdk/src/matrix";
import { render } from "@testing-library/react";

import { stubClient } from "../../test-utils";
import { MatrixClientPeg } from "../../../src/MatrixClientPeg";
import FavouriteMessagesPanel from "../../../src/components/structures/FavouriteMessagesView/FavouriteMessagesPanel";
import SettingsStore from "../../../src/settings/SettingsStore";

describe("FavouriteMessagesPanel", () => {
    let cli: MockedObject<MatrixClient>;
    // let room: Room;
    const userId = "@alice:server.org";
    const roomId = "!room:server.org";
    const alicesFavouriteMessageEvent = new MatrixEvent({
        type: EventType.RoomMessage,
        sender: userId,
        room_id: roomId,
        content: {
            msgtype: MsgType.Text,
            body: "i am alice",
        },
        event_id: "$alices_message",
        origin_server_ts: 123214,
    });

    const bobsFavouriteMessageEvent = new MatrixEvent({
        type: EventType.RoomMessage,
        sender: "@bob:server.org",
        room_id: roomId,
        content: {
            msgtype: MsgType.Text,
            body: "i am bob",
        },
        event_id: "$bobs_message",
        origin_server_ts: 123213,
    });

    beforeEach(async () => {
        stubClient();
        cli = mocked(MatrixClientPeg.get());
        jest.spyOn(SettingsStore, "getValue").mockImplementation((setting) => setting === "feature_favourite_messages");
    });

    afterEach(async () => {
        jest.restoreAllMocks();
    });

    it("renders <FavouriteMessagesPanel /> component with empty or default props correctly", () => {
        const favouriteMessageEvents: MatrixEvent[] | null = null;
        const props = {
            favouriteMessageEvents,
            handleSearchQuery: jest.fn(),
            searchQuery: "",
            cli,
        };
        const panel = render(<FavouriteMessagesPanel {...props} />);
        expect(panel.findByText("No Favourite Messages")).toBeTruthy();
    });

    it("renders favourite messages correctly for a single event", () => {
        const props = {
            favouriteMessageEvents: [bobsFavouriteMessageEvent],
            handleSearchQuery: jest.fn(),
            searchQuery: "",
            cli,
        };
        const panel = render(<FavouriteMessagesPanel {...props} />);

        panel.getByText("i am bob");
    });

    it("renders favourite messages correctly for multiple single event", () => {
        const props = {
            favouriteMessageEvents: [alicesFavouriteMessageEvent, bobsFavouriteMessageEvent],
            handleSearchQuery: jest.fn(),
            searchQuery: "",
            cli,
        };

        const panel = render(<FavouriteMessagesPanel {...props} />);

        panel.getByText("i am alice");
        panel.getByText("i am bob");

        expect(panel.getAllByRole("link")[1].getAttribute("href")).toContain("$alices_message");
        expect(panel.getAllByRole("link")[3].getAttribute("href")).toContain("$bobs_message");

        expect(panel.asFragment()).toMatchSnapshot();
    });
});
