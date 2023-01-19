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

import { render, waitFor } from "@testing-library/react";
import { EventType, MsgType } from "matrix-js-sdk/src/matrix";
import React from "react";

import useFavouriteMessages from "../../src/hooks/useFavouriteMessages";
import { SettingLevel } from "../../src/settings/SettingLevel";
import SettingsStore from "../../src/settings/SettingsStore";
import { stubClient } from "../test-utils";

describe("useFavouriteMessages", () => {
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

    const getValueSpy = jest.spyOn(SettingsStore, "getValue");
    const setValueSpy = jest.spyOn(SettingsStore, "setValue");

    const ClearFavesComponent = () => {
        const { clearFavouriteMessages } = useFavouriteMessages();
        clearFavouriteMessages();
        return <div />;
    };

    beforeEach(() => {
        stubClient();
    });

    // Most cases are covered in a more user-facing way in e.g.
    // FavouriteMessagesView-test, but for stuff we can't cover there, we do it
    // here.

    it("clears all favourites when asked", async () => {
        getValueSpy.mockReturnValue([alicesEvent]);
        render(<ClearFavesComponent />);
        await waitFor(() =>
            expect(setValueSpy).toHaveBeenCalledWith("favourite_messages", null, SettingLevel.ACCOUNT, []),
        );
    });
});
