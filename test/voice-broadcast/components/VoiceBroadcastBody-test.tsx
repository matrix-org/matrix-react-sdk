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
import { render, screen } from "@testing-library/react";
import { mocked } from "jest-mock";
import { MatrixClient, MatrixEvent } from "matrix-js-sdk/src/matrix";

import {
    VoiceBroadcastBody,
    VoiceBroadcastInfoEventType,
    VoiceBroadcastInfoState,
    VoiceBroadcastRecordingBody,
    VoiceBroadcastRecordingsStore,
    VoiceBroadcastRecording,
    shouldDisplayAsVoiceBroadcastRecordingTile,
    VoiceBroadcastPlaybackBody,
    VoiceBroadcastPlayback,
    VoiceBroadcastPlaybacksStore,
} from "../../../src/voice-broadcast";
import { mkEvent, stubClient } from "../../test-utils";

jest.mock("../../../src/voice-broadcast/components/molecules/VoiceBroadcastRecordingBody", () => ({
    VoiceBroadcastRecordingBody: jest.fn(),
}));

jest.mock("../../../src/voice-broadcast/components/molecules/VoiceBroadcastPlaybackBody", () => ({
    VoiceBroadcastPlaybackBody: jest.fn(),
}));

jest.mock("../../../src/voice-broadcast/utils/shouldDisplayAsVoiceBroadcastRecordingTile", () => ({
    shouldDisplayAsVoiceBroadcastRecordingTile: jest.fn(),
}));

describe("VoiceBroadcastBody", () => {
    const roomId = "!room:example.com";
    let client: MatrixClient;
    let infoEvent: MatrixEvent;
    let testRecording: VoiceBroadcastRecording;
    let testPlayback: VoiceBroadcastPlayback;

    const mkVoiceBroadcastInfoEvent = (state: VoiceBroadcastInfoState) => {
        return mkEvent({
            event: true,
            type: VoiceBroadcastInfoEventType,
            user: client.getUserId(),
            room: roomId,
            content: {
                state,
            },
        });
    };

    const renderVoiceBroadcast = () => {
        render(<VoiceBroadcastBody
            mxEvent={infoEvent}
            mediaEventHelper={null}
            onHeightChanged={() => {}}
            onMessageAllowed={() => {}}
            permalinkCreator={null}
        />);
        testRecording = VoiceBroadcastRecordingsStore.instance().getByInfoEvent(infoEvent, client);
    };

    beforeEach(() => {
        client = stubClient();
        infoEvent = mkVoiceBroadcastInfoEvent(VoiceBroadcastInfoState.Started);
        testRecording = new VoiceBroadcastRecording(infoEvent, client);
        testPlayback = new VoiceBroadcastPlayback(infoEvent, client);
        mocked(VoiceBroadcastRecordingBody).mockImplementation(({ recording }) => {
            if (testRecording === recording) {
                return <div data-testid="voice-broadcast-recording-body" />;
            }
        });

        mocked(VoiceBroadcastPlaybackBody).mockImplementation(({ playback }) => {
            if (testPlayback === playback) {
                return <div data-testid="voice-broadcast-playback-body" />;
            }
        });

        jest.spyOn(VoiceBroadcastRecordingsStore.instance(), "getByInfoEvent").mockImplementation(
            (getEvent: MatrixEvent, getClient: MatrixClient) => {
                if (getEvent === infoEvent && getClient === client) {
                    return testRecording;
                }
            },
        );

        jest.spyOn(VoiceBroadcastPlaybacksStore.instance(), "getByInfoEvent").mockImplementation(
            (getEvent: MatrixEvent) => {
                if (getEvent === infoEvent) {
                    return testPlayback;
                }
            },
        );
    });

    describe("when displaying a voice broadcast recording", () => {
        beforeEach(() => {
            mocked(shouldDisplayAsVoiceBroadcastRecordingTile).mockReturnValue(true);
        });

        it("should render a voice broadcast recording body", () => {
            renderVoiceBroadcast();
            screen.getByTestId("voice-broadcast-recording-body");
        });
    });

    describe("when displaying a voice broadcast playback", () => {
        beforeEach(() => {
            mocked(shouldDisplayAsVoiceBroadcastRecordingTile).mockReturnValue(false);
        });

        it("should render a voice broadcast playback body", () => {
            renderVoiceBroadcast();
            screen.getByTestId("voice-broadcast-playback-body");
        });
    });
});
