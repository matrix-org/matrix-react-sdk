/*
Copyright 2022-2023 The Matrix.org Foundation C.I.C.

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

import { Room, RoomMember } from "matrix-js-sdk/src/matrix";
import React from "react";

import {
    VoiceBroadcastInfoState,
    VoiceBroadcastRecording,
    VoiceBroadcastRecordingEvent,
    VoiceBroadcastRecordingState,
} from "..";
import QuestionDialog from "../../components/views/dialogs/QuestionDialog";
import { useTypedEventEmitterState } from "../../hooks/useEventEmitter";
import { _t } from "../../languageHandler";
import { MatrixClientPeg } from "../../MatrixClientPeg";
import Modal from "../../Modal";

const showStopBroadcastingDialog = async (): Promise<boolean> => {
    const { finished } = Modal.createDialog(QuestionDialog, {
        title: _t("voice_broadcast|confirm_stop_title"),
        description: <p>{_t("voice_broadcast|confirm_stop_description")}</p>,
        button: _t("voice_broadcast|confirm_stop_affirm"),
    });
    const [confirmed] = await finished;
    return !!confirmed;
};

export const useVoiceBroadcastRecording = (
    recording: VoiceBroadcastRecording,
): {
    live: boolean;
    timeLeft: number;
    recordingState: VoiceBroadcastRecordingState;
    room: Room;
    sender: RoomMember | null;
    stopRecording(): void;
    toggleRecording(): void;
} => {
    const client = MatrixClientPeg.safeGet();
    const roomId = recording.infoEvent.getRoomId();
    const room = client.getRoom(roomId);

    if (!room) {
        throw new Error("Unable to find voice broadcast room with Id: " + roomId);
    }

    const sender = recording.infoEvent.sender;

    if (!sender) {
        throw new Error(`Voice Broadcast sender not found (event ${recording.infoEvent.getId()})`);
    }

    const stopRecording = async (): Promise<void> => {
        const confirmed = await showStopBroadcastingDialog();

        if (confirmed) {
            await recording.stop();
        }
    };

    const recordingState = useTypedEventEmitterState(
        recording,
        VoiceBroadcastRecordingEvent.StateChanged,
        (state?: VoiceBroadcastRecordingState) => {
            return state ?? recording.getState();
        },
    );

    const timeLeft = useTypedEventEmitterState(
        recording,
        VoiceBroadcastRecordingEvent.TimeLeftChanged,
        (t?: number) => {
            return t ?? recording.getTimeLeft();
        },
    );

    const live = (
        [VoiceBroadcastInfoState.Started, VoiceBroadcastInfoState.Resumed] as VoiceBroadcastRecordingState[]
    ).includes(recordingState);

    return {
        live,
        timeLeft,
        recordingState,
        room,
        sender,
        stopRecording,
        toggleRecording: recording.toggle,
    };
};
