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
import {
    EventType,
    MatrixClient,
    MatrixEvent,
    MsgType,
    RelationType,
    IRelationsRequestOpts,
} from "matrix-js-sdk/src/matrix";
import { render, RenderResult, waitFor, waitForElementToBeRemoved, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import _FavouriteMessagesView from "../../../src/components/structures/FavouriteMessagesView/FavouriteMessagesView";
import { stubClient, wrapInMatrixClientContext } from "../../test-utils";
import { MatrixClientPeg } from "../../../src/MatrixClientPeg";
import SettingsStore from "../../../src/settings/SettingsStore";
import defaultDispatcher from "../../../src/dispatcher/dispatcher";
import { Action } from "../../../src/dispatcher/actions";
import { FavouriteMessagesStore } from "../../../src/stores/FavouriteMessagesStore";

const FavouriteMessagesView = wrapInMatrixClientContext(_FavouriteMessagesView);

describe("FavouriteMessagesView", () => {
    let matrixClient: MockedObject<MatrixClient>;
    const userId = "@alice:server.org";
    const roomId = "!room:server.org";
    const alicesEvent = {
        type: EventType.RoomMessage,
        sender: userId,
        room_id: roomId,
        content: {
            msgtype: MsgType.Text,
            body: "i am ALICE",
        },
        event_id: "$alices_message",
        origin_server_ts: 123214,
    };

    const bobsEvent = {
        type: EventType.RoomMessage,
        sender: "@bob:server.org",
        room_id: roomId,
        content: {
            msgtype: MsgType.Text,
            body: "i am bob",
        },
        event_id: "$bobs_message",
        origin_server_ts: 123215,
    };

    async function renderTwoFavourites(): Promise<RenderResult> {
        const store = new FavouriteMessagesStore();
        await store.toggleFavourite(alicesEvent.event_id, alicesEvent.room_id, alicesEvent.content);
        await store.toggleFavourite(bobsEvent.event_id, bobsEvent.room_id, bobsEvent.content);

        return render(<FavouriteMessagesView favouriteMessagesStore={store} />);
    }

    beforeEach(async () => {
        //SettingsStore.setValue("feature_favourite_messages", null, SettingLevel.DEVICE, true);
        jest.spyOn(SettingsStore, "getValue").mockImplementation((setting) => {
            switch (setting) {
                case "feature_favourite_messages":
                    return true;
                case "favourite_messages":
                    return [];
                default:
                    return null;
            }
        });
        stubClient();
        matrixClient = mocked(MatrixClientPeg.get());
        matrixClient.fetchRoomEvent.mockClear().mockImplementation((roomId: string, eventId: string) => {
            if (roomId === alicesEvent.room_id && eventId === alicesEvent.event_id) {
                return Promise.resolve(alicesEvent);
            } else if (roomId === bobsEvent.room_id && eventId === bobsEvent.event_id) {
                return Promise.resolve(bobsEvent);
            } else {
                return Promise.reject("Unknown event");
            }
        });
    });

    afterEach(async () => {
        jest.resetAllMocks();
    });

    it("renders a loading page initially", async () => {
        const store = new FavouriteMessagesStore();
        const view = render(<FavouriteMessagesView favouriteMessagesStore={store} />);
        view.getByLabelText("Loading...");
        expect(view.asFragment()).toMatchSnapshot();

        // Wait for the async stuff to run - otherwise we get errors about
        // finishing before everything is completed.
        await view.findByText("No Favourite Messages");
    });

    it("renders an empty message if there are no favourites", async () => {
        const store = new FavouriteMessagesStore();
        const view = render(<FavouriteMessagesView favouriteMessagesStore={store} />);
        await view.findByText("No Favourite Messages");
        expect(view.asFragment()).toMatchSnapshot();
    });

    it("renders your favourites", async () => {
        const view = await renderTwoFavourites();
        await view.findByText("i am ALICE");
        await view.findByText("i am bob");
        expect(view.asFragment()).toMatchSnapshot();
    });

    it("renders an edited favourite", async () => {
        const editedEvent = new MatrixEvent({
            type: EventType.RoomMessage,
            room_id: roomId,
            sender: userId,
            content: {
                "msgtype": MsgType.Text,
                "body": "I got edited",
                "m.new_content": {
                    msgtype: MsgType.Text,
                    body: "I got edited",
                },
                "m.relates_to": {
                    rel_type: RelationType.Replace,
                    event_id: alicesEvent.event_id,
                },
            },
        });
        matrixClient.relations.mockImplementation(
            (
                _roomId: string,
                eventId: string,
                _relationType?: string,
                _eventType?: string,
                _opts?: IRelationsRequestOpts,
            ) => {
                if (eventId === alicesEvent.event_id) {
                    return Promise.resolve({
                        originalEvent: new MatrixEvent(alicesEvent),
                        events: [editedEvent],
                    });
                } else {
                    return Promise.resolve({
                        originalEvent: new MatrixEvent(bobsEvent),
                        events: [],
                    });
                }
            },
        );

        const view = await renderTwoFavourites();
        await view.findByText("I got edited");
        await view.findByText("i am bob");
        expect(view.queryByText("i am ALICE")).toBeNull();
    });

    it("shows no favourites when I search for something nonexistent", async () => {
        // Given a view with 2 favourites
        const view = await renderTwoFavourites();
        await view.findByText("i am ALICE");
        await view.findByText("i am bob");

        // When I click search
        view.getByLabelText("Search").click();

        // And type something that does not match anything
        const searchBox = view.getByRole("textbox");
        await userEvent.type(searchBox, "STrIGN THAT SI NOT THERE");

        // No favourites are displayed
        await waitFor(() => {
            expect(view.queryByText("i am ALICE")).toBeNull();
            expect(view.queryByText("i am bob")).toBeNull();
        });
    });

    it("shows 1 favourite when only one matches the search", async () => {
        // Given a view with 2 favourites
        const view = await renderTwoFavourites();
        await view.findByText("ALICE", { exact: false });
        await view.findByText("bob", { exact: false });

        // When I click search
        view.getByLabelText("Search").click();

        // And type something that matches just one
        const searchBox = view.getByRole("textbox");
        await userEvent.type(searchBox, "bob");

        // Then only that one is displayed
        await waitFor(() => {
            expect(view.queryByText("ALICE", { exact: false })).toBeNull();
        });
        await view.findByText("bob", { exact: false });
    });

    it("successfully searches for upper-case query strings", async () => {
        // This is inspired by a bug we had during implementation, where
        // upper-case strings could not be found.

        // Given a view with 2 favourites
        const view = await renderTwoFavourites();
        await view.findByText("ALICE", { exact: false });
        await view.findByText("bob", { exact: false });

        // When I click search
        view.getByLabelText("Search").click();

        // And type something uppercase that matches just one
        const searchBox = view.getByRole("textbox");
        await userEvent.type(searchBox, "ALICE");

        // Then only that one is displayed
        await waitFor(() => {
            expect(view.queryByText("bob", { exact: false })).toBeNull();
        });
        await view.findByText("ALICE", { exact: false });
    });

    it("searches case-insensitively", async () => {
        // Given a view with 2 favourites
        const view = await renderTwoFavourites();
        await view.findByText("ALICE", { exact: false });
        await view.findByText("bob", { exact: false });

        // When I click search
        view.getByLabelText("Search").click();

        // And type something that matches one but with different case
        const searchBox = view.getByRole("textbox");
        await userEvent.type(searchBox, "aLiCe");

        // Then the matching one is displayed
        await waitFor(() => {
            expect(view.queryByText("bob", { exact: false })).toBeNull();
        });
        await view.findByText("ALICE", { exact: false });
    });

    it("clears the search when I close it", async () => {
        // Given my search hides a favourite
        const view = await renderTwoFavourites();
        await view.findByText("ALICE", { exact: false });
        await view.findByText("bob", { exact: false });
        view.getByLabelText("Search").click();
        const searchBox = view.getByRole("textbox");
        await userEvent.type(searchBox, "bob");
        await waitFor(() => {
            expect(view.queryByText("ALICE", { exact: false })).toBeNull();
        });
        await view.findByText("bob", { exact: false });

        // When I clear the search by pressing X
        view.getByLabelText("Cancel").click();

        // Then both favourites are visible because the search is cancelled
        await view.findByText("ALICE", { exact: false });
        await view.findByText("bob", { exact: false });
    });

    it("rerenders without your favourite if you unfave it", async () => {
        const view = await renderTwoFavourites();
        const alice = await view.findByText("i am ALICE");
        const parent = alice.parentElement?.parentElement?.parentElement;
        expect(parent).toBeTruthy();
        if (parent) {
            within(parent).getByLabelText("Favourite").click();
            await waitForElementToBeRemoved(alice);
        }
    });

    it("clears all your favourites when you click Clear", async () => {
        let clearModalOpened = false;

        const dispatcherSpy = jest.spyOn(defaultDispatcher, "dispatch");

        dispatcherSpy.mockImplementation(({ action }) => {
            if (action === "setting_updated") {
                return;
            }
            if (action !== Action.OpenClearFavourites) {
                throw new Error(`Unexpected action ${action}`);
            }
            clearModalOpened = true;
        });

        // Given 2 favourites
        const view = await renderTwoFavourites();
        await view.findByText("i am ALICE");
        await view.findByText("i am bob");

        // When I clear all favourites
        view.getByLabelText("Clear").click();

        // Then the confirmation modal was launched
        expect(clearModalOpened).toBe(true);
    });
});
