/*
Copyright 2017 - 2022 The Matrix.org Foundation C.I.C.

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

import React, { createRef, useContext } from "react";
import { CallEvent, CallState, MatrixCall } from "matrix-js-sdk/src/webrtc/call";
import { logger } from "matrix-js-sdk/src/logger";
import classNames from "classnames";
import { Room } from "matrix-js-sdk/src/models/room";
import { Optional } from "matrix-events-sdk";

import LegacyCallView from "./LegacyCallView";
import LegacyCallHandler, { LegacyCallHandlerEvent } from "../../../LegacyCallHandler";
import PersistentApp from "../elements/PersistentApp";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import PictureInPictureDragger, { CreatePipChildren } from "./PictureInPictureDragger";
import dis from "../../../dispatcher/dispatcher";
import { Action } from "../../../dispatcher/actions";
import { Container, WidgetLayoutStore } from "../../../stores/widgets/WidgetLayoutStore";
import LegacyCallViewHeader from "./LegacyCallView/LegacyCallViewHeader";
import ActiveWidgetStore, { ActiveWidgetStoreEvent } from "../../../stores/ActiveWidgetStore";
import WidgetStore, { IApp } from "../../../stores/WidgetStore";
import { ViewRoomPayload } from "../../../dispatcher/payloads/ViewRoomPayload";
import { UPDATE_EVENT } from "../../../stores/AsyncStore";
import { SDKContext, SdkContextClass } from "../../../contexts/SDKContext";
import { CallStore } from "../../../stores/CallStore";
import {
    useCurrentVoiceBroadcastPreRecording,
    useCurrentVoiceBroadcastRecording,
    VoiceBroadcastPlayback,
    VoiceBroadcastPlaybackBody,
    VoiceBroadcastPreRecording,
    VoiceBroadcastPreRecordingPip,
    VoiceBroadcastRecording,
    VoiceBroadcastRecordingPip,
    VoiceBroadcastSmallPlaybackBody,
} from "../../../voice-broadcast";
import { useCurrentVoiceBroadcastPlayback } from "../../../voice-broadcast/hooks/useCurrentVoiceBroadcastPlayback";

const SHOW_CALL_IN_STATES = [
    CallState.Connected,
    CallState.InviteSent,
    CallState.Connecting,
    CallState.CreateAnswer,
    CallState.CreateOffer,
    CallState.WaitLocalMedia,
];

interface IProps {
    voiceBroadcastRecording?: Optional<VoiceBroadcastRecording>;
    voiceBroadcastPreRecording?: Optional<VoiceBroadcastPreRecording>;
    voiceBroadcastPlayback?: Optional<VoiceBroadcastPlayback>;
}

interface IState {
    viewedRoomId?: string;

    // The main call that we are displaying (ie. not including the call in the room being viewed, if any)
    primaryCall: MatrixCall | null;

    // Any other call we're displaying: only if the user is on two calls and not viewing either of the rooms
    // they belong to
    secondaryCall: MatrixCall;

    // widget candidate to be displayed in the pip view.
    persistentWidgetId: string;
    persistentRoomId: string;
    showWidgetInPip: boolean;

    moving: boolean;
}

const getRoomAndAppForWidget = (widgetId: string, roomId: string): [Room | null, IApp | null] => {
    if (!widgetId) return [null, null];
    if (!roomId) return [null, null];

    const room = MatrixClientPeg.get().getRoom(roomId);
    const app = WidgetStore.instance.getApps(roomId).find((app) => app.id === widgetId);

    return [room, app || null];
};

// Splits a list of calls into one 'primary' one and a list
// (which should be a single element) of other calls.
// The primary will be the one not on hold, or an arbitrary one
// if they're all on hold)
function getPrimarySecondaryCallsForPip(roomId: Optional<string>): [MatrixCall | null, MatrixCall[]] {
    if (!roomId) return [null, []];

    const calls = LegacyCallHandler.instance.getAllActiveCallsForPip(roomId);

    let primary: MatrixCall | null = null;
    let secondaries: MatrixCall[] = [];

    for (const call of calls) {
        if (!SHOW_CALL_IN_STATES.includes(call.state)) continue;

        if (!call.isRemoteOnHold() && primary === null) {
            primary = call;
        } else {
            secondaries.push(call);
        }
    }

    if (primary === null && secondaries.length > 0) {
        primary = secondaries[0];
        secondaries = secondaries.slice(1);
    }

    if (secondaries.length > 1) {
        // We should never be in more than two calls so this shouldn't happen
        logger.log("Found more than 1 secondary call! Other calls will not be shown.");
    }

    return [primary, secondaries];
}

/**
 * PipView shows a small version of the LegacyCallView or a sticky widget hovering over the UI in 'picture-in-picture'
 * (PiP mode). It displays the call(s) which is *not* in the room the user is currently viewing
 * and all widgets that are active but not shown in any other possible container.
 */

class PipView extends React.Component<IProps, IState> {
    // The cast is not so great, but solves the typing issue for the moment.
    // Proper solution: use useRef (requires the component to be refactored to a functional component).
    private movePersistedElement = createRef<() => void>() as React.MutableRefObject<() => void>;

    public constructor(props: IProps) {
        super(props);

        const roomId = SdkContextClass.instance.roomViewStore.getRoomId();

        const [primaryCall, secondaryCalls] = getPrimarySecondaryCallsForPip(roomId);

        this.state = {
            moving: false,
            viewedRoomId: roomId || undefined,
            primaryCall: primaryCall || null,
            secondaryCall: secondaryCalls[0],
            persistentWidgetId: ActiveWidgetStore.instance.getPersistentWidgetId(),
            persistentRoomId: ActiveWidgetStore.instance.getPersistentRoomId(),
            showWidgetInPip: false,
        };
    }

    public componentDidMount() {
        LegacyCallHandler.instance.addListener(LegacyCallHandlerEvent.CallChangeRoom, this.updateCalls);
        LegacyCallHandler.instance.addListener(LegacyCallHandlerEvent.CallState, this.updateCalls);
        SdkContextClass.instance.roomViewStore.addListener(UPDATE_EVENT, this.onRoomViewStoreUpdate);
        MatrixClientPeg.get().on(CallEvent.RemoteHoldUnhold, this.onCallRemoteHold);
        const room = MatrixClientPeg.get()?.getRoom(this.state.viewedRoomId);
        if (room) {
            WidgetLayoutStore.instance.on(WidgetLayoutStore.emissionForRoom(room), this.updateCalls);
        }
        ActiveWidgetStore.instance.on(ActiveWidgetStoreEvent.Persistence, this.onWidgetPersistence);
        ActiveWidgetStore.instance.on(ActiveWidgetStoreEvent.Dock, this.onWidgetDockChanges);
        ActiveWidgetStore.instance.on(ActiveWidgetStoreEvent.Undock, this.onWidgetDockChanges);
        document.addEventListener("mouseup", this.onEndMoving.bind(this));
    }

    public componentWillUnmount() {
        LegacyCallHandler.instance.removeListener(LegacyCallHandlerEvent.CallChangeRoom, this.updateCalls);
        LegacyCallHandler.instance.removeListener(LegacyCallHandlerEvent.CallState, this.updateCalls);
        const cli = MatrixClientPeg.get();
        cli?.removeListener(CallEvent.RemoteHoldUnhold, this.onCallRemoteHold);
        SdkContextClass.instance.roomViewStore.removeListener(UPDATE_EVENT, this.onRoomViewStoreUpdate);
        const room = cli?.getRoom(this.state.viewedRoomId);
        if (room) {
            WidgetLayoutStore.instance.off(WidgetLayoutStore.emissionForRoom(room), this.updateCalls);
        }
        ActiveWidgetStore.instance.off(ActiveWidgetStoreEvent.Persistence, this.onWidgetPersistence);
        ActiveWidgetStore.instance.off(ActiveWidgetStoreEvent.Dock, this.onWidgetDockChanges);
        ActiveWidgetStore.instance.off(ActiveWidgetStoreEvent.Undock, this.onWidgetDockChanges);
        document.removeEventListener("mouseup", this.onEndMoving.bind(this));
    }

    private onStartMoving() {
        this.setState({ moving: true });
    }

    private onEndMoving() {
        this.setState({ moving: false });
    }

    private onMove = () => this.movePersistedElement.current?.();

    private onRoomViewStoreUpdate = () => {
        const newRoomId = SdkContextClass.instance.roomViewStore.getRoomId();
        const oldRoomId = this.state.viewedRoomId;
        if (newRoomId === oldRoomId) return;
        // The WidgetLayoutStore observer always tracks the currently viewed Room,
        // so we don't end up with multiple observers and know what observer to remove on unmount
        const oldRoom = MatrixClientPeg.get()?.getRoom(oldRoomId);
        if (oldRoom) {
            WidgetLayoutStore.instance.off(WidgetLayoutStore.emissionForRoom(oldRoom), this.updateCalls);
        }
        const newRoom = MatrixClientPeg.get()?.getRoom(newRoomId || undefined);
        if (newRoom) {
            WidgetLayoutStore.instance.on(WidgetLayoutStore.emissionForRoom(newRoom), this.updateCalls);
        }
        if (!newRoomId) return;

        const [primaryCall, secondaryCalls] = getPrimarySecondaryCallsForPip(newRoomId);
        this.setState({
            viewedRoomId: newRoomId,
            primaryCall: primaryCall,
            secondaryCall: secondaryCalls[0],
        });
        this.updateShowWidgetInPip();
    };

    private onWidgetPersistence = (): void => {
        this.updateShowWidgetInPip(
            ActiveWidgetStore.instance.getPersistentWidgetId(),
            ActiveWidgetStore.instance.getPersistentRoomId(),
        );
    };

    private onWidgetDockChanges = (): void => {
        this.updateShowWidgetInPip();
    };

    private updateCalls = (): void => {
        if (!this.state.viewedRoomId) return;
        const [primaryCall, secondaryCalls] = getPrimarySecondaryCallsForPip(this.state.viewedRoomId);

        this.setState({
            primaryCall: primaryCall,
            secondaryCall: secondaryCalls[0],
        });
        this.updateShowWidgetInPip();
    };

    private onCallRemoteHold = () => {
        if (!this.state.viewedRoomId) return;
        const [primaryCall, secondaryCalls] = getPrimarySecondaryCallsForPip(this.state.viewedRoomId);

        this.setState({
            primaryCall: primaryCall,
            secondaryCall: secondaryCalls[0],
        });
    };

    private onDoubleClick = (): void => {
        const callRoomId = this.state.primaryCall?.roomId;
        if (callRoomId ?? this.state.persistentRoomId) {
            dis.dispatch<ViewRoomPayload>({
                action: Action.ViewRoom,
                room_id: callRoomId ?? this.state.persistentRoomId,
                metricsTrigger: "WebFloatingCallWindow",
            });
        }
    };

    private onMaximize = (): void => {
        const widgetId = this.state.persistentWidgetId;
        const roomId = this.state.persistentRoomId;

        if (this.state.showWidgetInPip && widgetId && roomId) {
            const [room, app] = getRoomAndAppForWidget(widgetId, roomId);

            if (room && app) {
                WidgetLayoutStore.instance.moveToContainer(room, app, Container.Center);
                return;
            }
        }

        dis.dispatch({
            action: "video_fullscreen",
            fullscreen: true,
        });
    };

    private onPin = (): void => {
        if (!this.state.showWidgetInPip) return;

        const [room, app] = getRoomAndAppForWidget(this.state.persistentWidgetId, this.state.persistentRoomId);

        if (room && app) {
            WidgetLayoutStore.instance.moveToContainer(room, app, Container.Top);
        }
    };

    private onExpand = (): void => {
        const widgetId = this.state.persistentWidgetId;
        if (!widgetId || !this.state.showWidgetInPip) return;

        dis.dispatch({
            action: Action.ViewRoom,
            room_id: this.state.persistentRoomId,
        });
    };

    private onViewCall = (): void =>
        dis.dispatch<ViewRoomPayload>({
            action: Action.ViewRoom,
            room_id: this.state.persistentRoomId,
            view_call: true,
            metricsTrigger: undefined,
        });

    // Accepts a persistentWidgetId to be able to skip awaiting the setState for persistentWidgetId
    public updateShowWidgetInPip(
        persistentWidgetId = this.state.persistentWidgetId,
        persistentRoomId = this.state.persistentRoomId,
    ) {
        let fromAnotherRoom = false;
        let notDocked = false;
        // Sanity check the room - the widget may have been destroyed between render cycles, and
        // thus no room is associated anymore.
        if (persistentWidgetId && MatrixClientPeg.get().getRoom(persistentRoomId)) {
            notDocked = !ActiveWidgetStore.instance.isDocked(persistentWidgetId, persistentRoomId);
            fromAnotherRoom = this.state.viewedRoomId !== persistentRoomId;
        }

        // The widget should only be shown as a persistent app (in a floating
        // pip container) if it is not visible on screen: either because we are
        // viewing a different room OR because it is in none of the possible
        // containers of the room view.
        const showWidgetInPip = fromAnotherRoom || notDocked;

        this.setState({ showWidgetInPip, persistentWidgetId, persistentRoomId });
    }

    private createVoiceBroadcastPlaybackPipContent(voiceBroadcastPlayback: VoiceBroadcastPlayback): CreatePipChildren {
        if (this.state.viewedRoomId === voiceBroadcastPlayback.infoEvent.getRoomId()) {
            return ({ onStartMoving }) => (
                <div onMouseDown={onStartMoving}>
                    <VoiceBroadcastPlaybackBody playback={voiceBroadcastPlayback} pip={true} />
                </div>
            );
        }

        return ({ onStartMoving }) => (
            <div onMouseDown={onStartMoving}>
                <VoiceBroadcastSmallPlaybackBody playback={voiceBroadcastPlayback} />
            </div>
        );
    }

    private createVoiceBroadcastPreRecordingPipContent(
        voiceBroadcastPreRecording: VoiceBroadcastPreRecording,
    ): CreatePipChildren {
        return ({ onStartMoving }) => (
            <div onMouseDown={onStartMoving}>
                <VoiceBroadcastPreRecordingPip voiceBroadcastPreRecording={voiceBroadcastPreRecording} />
            </div>
        );
    }

    private createVoiceBroadcastRecordingPipContent(
        voiceBroadcastRecording: VoiceBroadcastRecording,
    ): CreatePipChildren {
        return ({ onStartMoving }) => (
            <div onMouseDown={onStartMoving}>
                <VoiceBroadcastRecordingPip recording={voiceBroadcastRecording} />
            </div>
        );
    }

    public render() {
        const pipMode = true;
        let pipContent: CreatePipChildren | null = null;

        if (this.props.voiceBroadcastPlayback) {
            pipContent = this.createVoiceBroadcastPlaybackPipContent(this.props.voiceBroadcastPlayback);
        }

        if (this.props.voiceBroadcastPreRecording) {
            pipContent = this.createVoiceBroadcastPreRecordingPipContent(this.props.voiceBroadcastPreRecording);
        }

        if (this.props.voiceBroadcastRecording) {
            pipContent = this.createVoiceBroadcastRecordingPipContent(this.props.voiceBroadcastRecording);
        }

        if (this.state.primaryCall) {
            // get a ref to call inside the current scope
            const call = this.state.primaryCall;
            pipContent = ({ onStartMoving, onResize }) => (
                <LegacyCallView
                    onMouseDownOnHeader={onStartMoving}
                    call={call}
                    secondaryCall={this.state.secondaryCall}
                    pipMode={pipMode}
                    onResize={onResize}
                />
            );
        }

        if (this.state.showWidgetInPip) {
            const pipViewClasses = classNames({
                mx_LegacyCallView: true,
                mx_LegacyCallView_pip: pipMode,
                mx_LegacyCallView_large: !pipMode,
            });
            const roomId = this.state.persistentRoomId;
            const roomForWidget = MatrixClientPeg.get().getRoom(roomId)!;
            const viewingCallRoom = this.state.viewedRoomId === roomId;
            const isCall = CallStore.instance.getActiveCall(roomId) !== null;

            pipContent = ({ onStartMoving }) => (
                <div className={pipViewClasses}>
                    <LegacyCallViewHeader
                        onPipMouseDown={(event) => {
                            onStartMoving?.(event);
                            this.onStartMoving.bind(this)();
                        }}
                        pipMode={pipMode}
                        callRooms={[roomForWidget]}
                        onExpand={!isCall && !viewingCallRoom ? this.onExpand : undefined}
                        onPin={!isCall && viewingCallRoom ? this.onPin : undefined}
                        onMaximize={isCall ? this.onViewCall : viewingCallRoom ? this.onMaximize : undefined}
                    />
                    <PersistentApp
                        persistentWidgetId={this.state.persistentWidgetId}
                        persistentRoomId={roomId}
                        pointerEvents={this.state.moving ? "none" : undefined}
                        movePersistedElement={this.movePersistedElement}
                    />
                </div>
            );
        }

        if (!!pipContent) {
            return (
                <PictureInPictureDragger
                    className="mx_LegacyCallPreview"
                    draggable={pipMode}
                    onDoubleClick={this.onDoubleClick}
                    onMove={this.onMove}
                >
                    {pipContent}
                </PictureInPictureDragger>
            );
        }

        return null;
    }
}

const PipViewHOC: React.FC<IProps> = (props) => {
    const sdkContext = useContext(SDKContext);
    const voiceBroadcastPreRecordingStore = sdkContext.voiceBroadcastPreRecordingStore;
    const { currentVoiceBroadcastPreRecording } = useCurrentVoiceBroadcastPreRecording(voiceBroadcastPreRecordingStore);

    const voiceBroadcastRecordingsStore = sdkContext.voiceBroadcastRecordingsStore;
    const { currentVoiceBroadcastRecording } = useCurrentVoiceBroadcastRecording(voiceBroadcastRecordingsStore);

    const voiceBroadcastPlaybacksStore = sdkContext.voiceBroadcastPlaybacksStore;
    const { currentVoiceBroadcastPlayback } = useCurrentVoiceBroadcastPlayback(voiceBroadcastPlaybacksStore);

    return (
        <PipView
            voiceBroadcastPlayback={currentVoiceBroadcastPlayback}
            voiceBroadcastPreRecording={currentVoiceBroadcastPreRecording}
            voiceBroadcastRecording={currentVoiceBroadcastRecording}
            {...props}
        />
    );
};

export default PipViewHOC;
