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

import React, { Fragment, useCallback } from "react";
import { MatrixEvent, Room } from "matrix-js-sdk/src/matrix";

import { _t } from "../../../languageHandler";
import AccessibleButton, { ButtonEvent } from "../elements/AccessibleButton";
import dispatcher, { defaultDispatcher } from "../../../dispatcher/dispatcher";
import { ViewRoomPayload } from "../../../dispatcher/payloads/ViewRoomPayload";
import { Action } from "../../../dispatcher/actions";
import { Call, ConnectionState, ElementCall } from "../../../models/Call";
import { useCall } from "../../../hooks/useCall";
import { RoomViewStore } from "../../../stores/RoomViewStore";
import { useEventEmitterState } from "../../../hooks/useEventEmitter";
import {
    OwnBeaconStore,
    OwnBeaconStoreEvent,
} from "../../../stores/OwnBeaconStore";
import { CallDurationFromEvent } from "../voip/CallDuration";
import { MockedCall } from "../../../../test/test-utils/call";

interface RoomCallBannerProps {
    roomId: Room["roomId"];
    call: Call;
}

const RoomCallBannerInner: React.FC<RoomCallBannerProps> = ({
    roomId,
    call,
}) => {
    let callEvent: MatrixEvent = null;

    if (!!(call as ElementCall).groupCall) {
        callEvent = (call as ElementCall).groupCall;
    }
    if (!!(call as MockedCall).event) {
        callEvent = (call as MockedCall).event;
    }

    const connect = useCallback(
        (ev: ButtonEvent) => {
            ev.preventDefault();
            defaultDispatcher.dispatch<ViewRoomPayload>({
                action: Action.ViewRoom,
                room_id: roomId,
                view_call: true,
                metricsTrigger: undefined,
            });
        },
        [roomId]
    );

    const disconnect = useCallback(
        (ev: ButtonEvent) => {
            ev.preventDefault();
            call?.disconnect();
        },
        [call]
    );

    const onClick = () => {
        dispatcher.dispatch<ViewRoomPayload>({
            action: Action.ViewRoom,
            room_id: roomId,
            metricsTrigger: undefined,
            event_id: callEvent.getId(),
            scroll_into_view: true,
            highlighted: true,
        });
    };

    let [buttonText, buttonKind, onButtonClick] = [null, null, null, null];

    switch (call.connectionState) {
        case ConnectionState.Disconnected:
            [buttonText, buttonKind, onButtonClick] = [
                _t("Join"),
                "primary",
                connect,
            ];
            break;
        case ConnectionState.Connecting:
            [buttonText, buttonKind, onButtonClick] = [
                _t("Join"),
                "primary",
                null,
            ];
            break;
        case ConnectionState.Connected:
            [buttonText, buttonKind, onButtonClick] = [
                _t("Leave"),
                "danger",
                disconnect,
            ];
            break;
        case ConnectionState.Disconnecting:
            [buttonText, buttonKind, onButtonClick] = [
                _t("Leave"),
                "danger",
                null,
            ];
            break;
    }
    if (!call) return <Fragment />;

    return (
        <div
            className="mx_RoomLiveShareWarning mx_RoomCallBanner"
            onClick={onClick}
        >
            <div className="mx_RoomCallBanner_text">
                <span className="mx_RoomCallBanner_label">Video call</span>
                <CallDurationFromEvent mxEvent={callEvent} />
            </div>

            <AccessibleButton
                className="mx_RoomCallBanner_button"
                data-test-id="room-live-share-primary-button"
                onClick={onButtonClick}
                kind={buttonKind}
                element="button"
                disabled={false}
            >
                {buttonText}
            </AccessibleButton>
        </div>
    );
};

interface Props {
    roomId: Room["roomId"];
}

const RoomCallBanner: React.FC<Props> = ({ roomId }) => {
    const call = useCall(roomId);

    // this section is to check if we have a live location share. If so, we dont show the call banner
    const isMonitoringLiveLocation = useEventEmitterState(
        OwnBeaconStore.instance,
        OwnBeaconStoreEvent.MonitoringLivePosition,
        () => OwnBeaconStore.instance.isMonitoringLiveLocation
    );

    const liveBeaconIds = useEventEmitterState(
        OwnBeaconStore.instance,
        OwnBeaconStoreEvent.LivenessChange,
        () => OwnBeaconStore.instance.getLiveBeaconIds(roomId)
    );

    if (isMonitoringLiveLocation && liveBeaconIds.length) {
        return null;
    }

    // Check if the call is already showing. No banner is needed in this case.
    if (RoomViewStore.instance.isViewingCall()) {
        return null;
    }

    // split into outer/inner to avoid watching various parts if there is no call
    if (call) {
        return <RoomCallBannerInner call={call} roomId={roomId} />;
    }
    return null;
};

export default RoomCallBanner;
