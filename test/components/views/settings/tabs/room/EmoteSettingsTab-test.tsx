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
import { fireEvent, render, RenderResult, screen } from "@testing-library/react";
import { MatrixClient } from "matrix-js-sdk/src/client";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { Room } from "matrix-js-sdk/src/models/room";
import { mocked } from "jest-mock";
import { UnstableValue } from "matrix-js-sdk/src/NamespacedValue";

import EmoteRoomSettingsTab from "../../../../../../src/components/views/settings/tabs/room/EmoteSettingsTab";
import { mkStubRoom, withClientContextRenderOptions, stubClient } from "../../../../../test-utils";
import { MatrixClientPeg } from "../../../../../../src/MatrixClientPeg";

describe("EmoteSettingsTab", () => {
    const EMOTES_STATE = new UnstableValue("org.matrix.msc3892.emotes", "m.room.emotes");
    const roomId = "!room:example.com";
    let cli: MatrixClient;
    let room: Room;

    const renderTab = (propRoom: Room = room): RenderResult => {
        return render(<EmoteRoomSettingsTab roomId={roomId} />, withClientContextRenderOptions(cli));
    };

    beforeEach(() => {
        stubClient();
        cli = MatrixClientPeg.safeGet();
        room = mkStubRoom(roomId, "test room", cli);
    });

    it("should allow an Admin to upload emotes", () => {
        mocked(cli.getRoom).mockReturnValue(room);
        mocked(room.currentState.maySendStateEvent).mockReturnValue(true);
        const tab = renderTab();

        const editEmotesButton = tab.container.querySelector("div.mx_EmoteSettings_uploadButton");
        if (!editEmotesButton) {
            throw new Error("upload emote button does not exist.");
        }
    });

    it("should not let non-admin upload emotes", () => {
        mocked(cli.getRoom).mockReturnValue(room);
        mocked(room.currentState.maySendStateEvent).mockReturnValue(false);
        const tab = renderTab();
        const editEmotesButton = tab.container.querySelector("div.mx_EmoteSettings_uploadButton");
        if (editEmotesButton) {
            throw new Error("upload emote button exists for non-permissioned user.");
        }
    });

    it("should load emotes", () => {
        mocked(cli.getRoom).mockReturnValue(room);
        mocked(cli.isRoomEncrypted).mockReturnValue(false);
        // @ts-ignore - mocked doesn't support overloads properly
        mocked(room.currentState.getStateEvents).mockImplementation((type, key) => {
            if (key === undefined) return [] as MatrixEvent[];
            if (type === EMOTES_STATE.name) {
                return new MatrixEvent({
                    sender: "@sender:server",
                    room_id: roomId,
                    type: EMOTES_STATE.name,
                    state_key: "",
                    content: {
                        testEmote: "http://this.is.a.url/server/custom-emote-123.png",
                    },
                });
            }
            return null;
        });
        const tab = renderTab();
        const emotefield = tab.container.querySelector("input.mx_EmoteSettings_existingEmoteCode");
        if (!emotefield) {
            throw new Error("emote isn't loading");
        }
    });

    it("should delete when delete is clicked and restore emotes when cancel is clicked", () => {
        mocked(cli.getRoom).mockReturnValue(room);
        mocked(cli.isRoomEncrypted).mockReturnValue(false);
        // @ts-ignore - mocked doesn't support overloads properly
        mocked(room.currentState.getStateEvents).mockImplementation((type, key) => {
            if (key === undefined) return [] as MatrixEvent[];
            if (type === EMOTES_STATE.name) {
                return new MatrixEvent({
                    sender: "@sender:server",
                    room_id: roomId,
                    type: EMOTES_STATE.name,
                    state_key: "",
                    content: {
                        testEmote: "http://this.is.a.url/server/custom-emote-123.png",
                    },
                });
            }
            return null;
        });
        const tab = renderTab();

        fireEvent.click(screen.getByText("Delete"));
        let emotefield = tab.container.querySelector("input.mx_EmoteSettings_existingEmoteCode");
        if (emotefield) {
            throw new Error("not deleting");
        }
        fireEvent.click(screen.getByText("Cancel"));
        emotefield = tab.container.querySelector("input.mx_EmoteSettings_existingEmoteCode");
        if (!emotefield) {
            throw new Error("not restoring when cancel is clicked");
        }
    });

    it("should save edits to emotes", () => {
        mocked(cli.getRoom).mockReturnValue(room);
        mocked(cli.isRoomEncrypted).mockReturnValue(false);
        // @ts-ignore - mocked doesn't support overloads properly
        mocked(room.currentState.getStateEvents).mockImplementation((type, key) => {
            if (key === undefined) return [] as MatrixEvent[];
            if (type === EMOTES_STATE.name) {
                return new MatrixEvent({
                    sender: "@sender:server",
                    room_id: roomId,
                    type: EMOTES_STATE.name,
                    state_key: "",
                    content: {
                        testEmote: "http://this.is.a.url/server/custom-emote-123.png",
                    },
                });
            }
            return null;
        });

        const tab = renderTab();

        fireEvent.change(tab.container.querySelector("input.mx_EmoteSettings_existingEmoteCode"), {
            target: { value: "changed" },
        });
        fireEvent.click(screen.getByText("Save"));
        expect(cli.sendStateEvent).toHaveBeenCalledWith(
            roomId,
            EMOTES_STATE.name,
            { changed: "http://this.is.a.url/server/custom-emote-123.png" },
            "",
        );
    });
});
