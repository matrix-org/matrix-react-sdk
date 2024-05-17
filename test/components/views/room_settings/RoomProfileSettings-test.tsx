/*
Copyright 2024 New Vector Ltd

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
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mocked } from "jest-mock";
import { EventType } from "matrix-js-sdk/src/matrix";

import { stubClient } from "../../../test-utils";
import RoomProfileSettings from "../../../../src/components/views/room_settings/RoomProfileSettings";

const BASE64_GIF = "R0lGODlhAQABAAAAACw=";
const AVATAR_FILE = new File([Uint8Array.from(atob(BASE64_GIF), (c) => c.charCodeAt(0))], "avatar.gif", {
    type: "image/gif",
});

describe("RoomProfileSetting", () => {
    it("uploads a room avatar", async () => {
        const user = userEvent.setup();
        const client = stubClient();
        mocked(client.uploadContent).mockResolvedValue({ content_uri: "mxc://matrix.org/1234" });

        render(<RoomProfileSettings roomId="!floob:itty" />);

        await user.upload(screen.getByAltText("Upload"), AVATAR_FILE);

        await user.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => expect(client.uploadContent).toHaveBeenCalledWith(AVATAR_FILE));
        await waitFor(() =>
            expect(client.sendStateEvent).toHaveBeenCalledWith(
                "!floob:itty",
                EventType.RoomAvatar,
                {
                    url: "mxc://matrix.org/1234",
                },
                "",
            ),
        );
    });
});
