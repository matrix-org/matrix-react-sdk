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

import { Room, RoomStateEvent } from "matrix-js-sdk/src/matrix";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useFeatureEnabled } from "../useSettings";
import SdkConfig from "../../SdkConfig";
import { useEventEmitterState, useTypedEventEmitterState } from "../useEventEmitter";
import LegacyCallHandler, { LegacyCallHandlerEvent } from "../../LegacyCallHandler";
import { useWidgets } from "../../components/views/right_panel/RoomSummaryCard";
import { WidgetType } from "../../widgets/WidgetType";
import { useCall } from "../useCall";
import { _t } from "../../languageHandler";
import { useRoomMembers } from "../useRoomMembers";
import { ElementCall } from "../../models/Call";

type CallType = "element_call" | "jitsi_or_element_call" | "legacy_or_jitsi";

/**
 * Reports the call capabilities for the current room
 * @param room the room to track
 * @returns the call status for a room
 */
export const useRoomCallStatus = (
    room: Room,
): {
    voiceCallDisabledReason: string | null;
    voiceCallType: CallType;
    videoCallDisabledReason: string | null;
    videoCallType: CallType;
} => {
    const [voiceCallDisabledReason, setVoiceCallDisabledReason] = useState<string | null>(null);
    const [videoCallDisabledReason, setVideoCallDisabledReason] = useState<string | null>(null);
    const [voiceCallType, setVoiceCallType] = useState<CallType>("jitsi_or_element_call");
    const [videoCallType, setVideoCallType] = useState<CallType>("jitsi_or_element_call");

    const groupCallsEnabled = useFeatureEnabled("feature_group_calls");
    const useElementCallExclusively = useMemo(() => {
        return SdkConfig.get("element_call").use_exclusively;
    }, []);

    const hasLegacyCall = useEventEmitterState(
        LegacyCallHandler.instance,
        LegacyCallHandlerEvent.CallsChanged,
        useCallback(() => LegacyCallHandler.instance.getCallForRoom(room.roomId) !== null, [room]),
    );

    const widgets = useWidgets(room);
    const hasJitsiWidget = useMemo(() => widgets.some((widget) => WidgetType.JITSI.matches(widget.type)), [widgets]);

    const hasGroupCall = useCall(room.roomId) !== null;

    const functionalMembers = useRoomMembers(room);

    const [mayEditWidgets, mayCreateElementCalls] = useTypedEventEmitterState(
        room,
        RoomStateEvent.Update,
        useCallback(
            () => [
                room.currentState.mayClientSendStateEvent("im.vector.modular.widgets", room.client),
                room.currentState.mayClientSendStateEvent(ElementCall.CALL_EVENT_TYPE.name, room.client),
            ],
            [room],
        ),
    );

    useEffect(() => {
        if (groupCallsEnabled) {
            if (useElementCallExclusively) {
                if (hasGroupCall) {
                    setVideoCallDisabledReason(_t("Ongoing call"));
                } else if (mayCreateElementCalls) {
                    setVideoCallType("element_call");
                } else {
                    setVideoCallDisabledReason(_t("You do not have permission to start video calls"));
                }
            } else if (hasLegacyCall || hasJitsiWidget || hasGroupCall) {
                setVoiceCallDisabledReason(_t("Ongoing call"));
                setVideoCallDisabledReason(_t("Ongoing call"));
            } else if (functionalMembers.length <= 1) {
                setVoiceCallDisabledReason(_t("There's no one here to call"));
                setVideoCallDisabledReason(_t("There's no one here to call"));
            } else if (functionalMembers.length === 2) {
                setVoiceCallType("legacy_or_jitsi");
                setVideoCallType("legacy_or_jitsi");
            } else if (mayEditWidgets) {
                setVoiceCallType("legacy_or_jitsi");
                setVideoCallType(mayCreateElementCalls ? "jitsi_or_element_call" : "legacy_or_jitsi");
            } else {
                setVoiceCallDisabledReason(_t("You do not have permission to start voice calls"));
                if (mayCreateElementCalls) {
                    setVideoCallType("element_call");
                } else {
                    setVideoCallDisabledReason(_t("You do not have permission to start video calls"));
                }
            }
        } else if (hasLegacyCall || hasJitsiWidget) {
            setVoiceCallDisabledReason(_t("Ongoing call"));
            setVideoCallDisabledReason(_t("Ongoing call"));
        } else if (functionalMembers.length <= 1) {
            setVoiceCallDisabledReason(_t("There's no one here to call"));
            setVideoCallDisabledReason(_t("There's no one here to call"));
        } else if (functionalMembers.length === 2 || mayEditWidgets) {
            setVoiceCallType("legacy_or_jitsi");
            setVideoCallType("legacy_or_jitsi");
        } else {
            setVoiceCallDisabledReason(_t("You do not have permission to start voice calls"));
            setVideoCallDisabledReason(_t("You do not have permission to start video calls"));
        }
    }, [
        functionalMembers.length,
        groupCallsEnabled,
        hasGroupCall,
        hasJitsiWidget,
        hasLegacyCall,
        mayCreateElementCalls,
        mayEditWidgets,
        useElementCallExclusively,
    ]);

    /**
     * We've gone through all the steps
     */
    return {
        voiceCallDisabledReason,
        voiceCallType,
        videoCallDisabledReason,
        videoCallType,
    };
};
