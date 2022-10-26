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
//

import React from "react";
import { render, RenderResult, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MatrixClient, MatrixEvent } from "matrix-js-sdk/src/matrix";
import { sleep } from "matrix-js-sdk/src/utils";

import {
    VoiceBroadcastInfoState,
    VoiceBroadcastRecording,
    VoiceBroadcastRecordingPip,
} from "../../../../src/voice-broadcast";
import { stubClient } from "../../../test-utils";
import { mkVoiceBroadcastInfoStateEvent } from "../../utils/test-utils";

// mock RoomAvatar, because it is doing too much fancy stuff
jest.mock("../../../../src/components/views/avatars/RoomAvatar", () => ({
    __esModule: true,
    default: jest.fn().mockImplementation(({ room }) => {
        return <div data-testid="room-avatar">room avatar: { room.name }</div>;
    }),
}));

jest.mock("../../../../src/audio/VoiceRecording");

describe("VoiceBroadcastRecordingPip", () => {
    const roomId = "!room:example.com";
    let client: MatrixClient;
    let infoEvent: MatrixEvent;
    let recording: VoiceBroadcastRecording;
    let renderResult: RenderResult;

    const renderPip = (state: VoiceBroadcastInfoState) => {
        infoEvent = mkVoiceBroadcastInfoStateEvent(
            roomId,
            state,
            client.getUserId(),
            client.getDeviceId(),
        );
        recording = new VoiceBroadcastRecording(infoEvent, client, state);
        renderResult = render(<VoiceBroadcastRecordingPip recording={recording} />);
    };

    beforeAll(() => {
        client = stubClient();
    });

    describe("when rendering a started recording", () => {
        beforeEach(() => {
            renderPip(VoiceBroadcastInfoState.Started);
        });

        it("should render as expected", () => {
            expect(renderResult.container).toMatchSnapshot();
        });

        describe("and clicking the pause button", () => {
            beforeEach(async () => {
                await userEvent.click(screen.getByLabelText("pause voice broadcast"));
            });

            it("should pause the recording", () => {
                expect(recording.getState()).toBe(VoiceBroadcastInfoState.Paused);
            });
        });

        describe("and clicking the stop button", () => {
            beforeEach(async () => {
                await userEvent.click(screen.getByLabelText("Stop Recording"));
                // modal rendering has some weird sleeps
                await sleep(100);
            });

            it("should display the confirm end dialog", () => {
                screen.getByText("Stop live broadcasting?");
            });

            describe("and confirming the dialog", () => {
                beforeEach(async () => {
                    await userEvent.click(screen.getByText("Yes, stop broadcast"));
                });

                it("should end the recording", () => {
                    expect(recording.getState()).toBe(VoiceBroadcastInfoState.Stopped);
                });
            });
        });
    });

    describe("when rendering a paused recording", () => {
        beforeEach(() => {
            renderPip(VoiceBroadcastInfoState.Paused);
        });

        it("should render as expected", () => {
            expect(renderResult.container).toMatchSnapshot();
        });

        describe("and clicking the resume button", () => {
            beforeEach(async () => {
                await userEvent.click(screen.getByLabelText("resume voice broadcast"));
            });

            it("should resume the recording", () => {
                expect(recording.getState()).toBe(VoiceBroadcastInfoState.Resumed);
            });
        });
    });
});
