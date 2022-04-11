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
import { mount } from "enzyme";
import { act } from "react-dom/test-utils";
import { mocked } from "jest-mock";

import { stubClient, stubVideoChannelStore, mkRoom } from "../../../test-utils";
import { MatrixClientPeg } from "../../../../src/MatrixClientPeg";
import VideoLobby from "../../../../src/components/views/voip/VideoLobby";

describe("VideoLobby", () => {
    stubClient();
    Object.defineProperty(navigator, "mediaDevices", {
        value: {
            enumerateDevices: jest.fn(),
            getUserMedia: () => null,
        },
    });
    jest.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(async () => {});

    const cli = MatrixClientPeg.get();
    const room = mkRoom(cli, "!1:example.org");

    let store;
    beforeEach(() => {
        store = stubVideoChannelStore();
        mocked(navigator.mediaDevices.enumerateDevices).mockResolvedValue([]);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("device buttons", () => {
        it("hides when no devices are available", async () => {
            const lobby = mount(<VideoLobby room={room} />);
            // Wait for state to settle
            await act(() => Promise.resolve());
            lobby.update();

            expect(lobby.find("DeviceButton").children().exists()).toEqual(false);
        });

        it("hides device list when only one device is available", async () => {
            mocked(navigator.mediaDevices.enumerateDevices).mockResolvedValue([{
                deviceId: "1",
                groupId: "1",
                label: "Webcam",
                kind: "videoinput",
                toJSON: () => {},
            }]);

            const lobby = mount(<VideoLobby room={room} />);
            // Wait for state to settle
            await act(() => Promise.resolve());
            lobby.update();

            expect(lobby.find(".mx_VideoLobby_deviceListButton").exists()).toEqual(false);
        });

        it("shows device list when multiple devices are available", async () => {
            mocked(navigator.mediaDevices.enumerateDevices).mockResolvedValue([
                {
                    deviceId: "1",
                    groupId: "1",
                    label: "Front camera",
                    kind: "videoinput",
                    toJSON: () => {},
                },
                {
                    deviceId: "2",
                    groupId: "1",
                    label: "Back camera",
                    kind: "videoinput",
                    toJSON: () => {},
                },
            ]);

            const lobby = mount(<VideoLobby room={room} />);
            // Wait for state to settle
            await act(() => Promise.resolve());
            lobby.update();

            expect(lobby.find(".mx_VideoLobby_deviceListButton").exists()).toEqual(true);
        });
    });

    describe("join button", () => {
        it("works", async () => {
            const lobby = mount(<VideoLobby room={room} />);
            // Wait for state to settle
            await act(() => Promise.resolve());
            lobby.update();

            act(() => {
                lobby.find("AccessibleButton.mx_VideoLobby_joinButton").simulate("click");
            });
            expect(store.connect).toHaveBeenCalled();
        });
    });
});
