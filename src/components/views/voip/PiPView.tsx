/*
Copyright 2017, 2018 New Vector Ltd
Copyright 2019, 2020 The Matrix.org Foundation C.I.C.

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

import React from 'react';
import { CallEvent, CallState, MatrixCall } from 'matrix-js-sdk/src/webrtc/call';
import { EventSubscription } from 'fbemitter';
import { logger } from "matrix-js-sdk/src/logger";
import classNames from 'classnames';

import CallView from "./CallView";
import RoomViewStore from '../../../stores/RoomViewStore';
import CallHandler, { CallHandlerEvent } from '../../../CallHandler';
import PersistentApp from "../elements/PersistentApp";
import SettingsStore from "../../../settings/SettingsStore";
import { MatrixClientPeg } from '../../../MatrixClientPeg';
import { replaceableComponent } from "../../../utils/replaceableComponent";
import PictureInPictureDragger from './PictureInPictureDragger';
import dis from '../../../dispatcher/dispatcher';
import { Action } from "../../../dispatcher/actions";
import { Container, WidgetLayoutStore } from '../../../stores/widgets/WidgetLayoutStore';
import CallViewHeader from './CallView/CallViewHeader';
import ActiveWidgetStore, { ActiveWidgetStoreEvent } from '../../../stores/ActiveWidgetStore';
import RightPanelStore from '../../../stores/RightPanelStore';
import { RightPanelPhases } from '../../../stores/RightPanelStorePhases';
import { ActionPayload } from '../../../dispatcher/payloads';

const SHOW_CALL_IN_STATES = [
    CallState.Connected,
    CallState.InviteSent,
    CallState.Connecting,
    CallState.CreateAnswer,
    CallState.CreateOffer,
    CallState.WaitLocalMedia,
];

interface IProps {
}

interface IState {
    roomId: string;

    // The main call that we are displaying (ie. not including the call in the room being viewed, if any)
    primaryCall: MatrixCall;

    // Any other call we're displaying: only if the user is on two calls and not viewing either of the rooms
    // they belong to
    secondaryCall: MatrixCall;

    // widget candidate to be displayed in the pip view.
    persistentWidgetId: string;
    showWidgetInPip: boolean;
    rightPanelPhase: RightPanelPhases;
}

// Splits a list of calls into one 'primary' one and a list
// (which should be a single element) of other calls.
// The primary will be the one not on hold, or an arbitrary one
// if they're all on hold)
function getPrimarySecondaryCallsForPip(roomId: string): [MatrixCall, MatrixCall[]] {
    const calls = CallHandler.instance.getAllActiveCallsForPip(roomId);

    let primary: MatrixCall = null;
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
 * CallPreview shows a small version of CallView hovering over the UI in 'picture-in-picture'
 * (PiP mode). It displays the call(s) which is *not* in the room the user is currently viewing.
 */

@replaceableComponent("views.voip.CallPreview")
export default class PiPView extends React.Component<IProps, IState> {
    private roomStoreToken: EventSubscription;
    private dispatcherRef: string;
    private settingsWatcherRef: string;

    constructor(props: IProps) {
        super(props);

        const roomId = RoomViewStore.getRoomId();

        const [primaryCall, secondaryCalls] = getPrimarySecondaryCallsForPip(roomId);

        this.state = {
            roomId,
            primaryCall: primaryCall,
            secondaryCall: secondaryCalls[0],
            persistentWidgetId: ActiveWidgetStore.instance.getPersistentWidgetId(),
            rightPanelPhase: RightPanelStore.getSharedInstance().roomPanelPhase,
            showWidgetInPip: false,
        };
    }

    public componentDidMount() {
        CallHandler.instance.addListener(CallHandlerEvent.CallChangeRoom, this.updateCalls);
        CallHandler.instance.addListener(CallHandlerEvent.CallState, this.updateCalls);
        this.roomStoreToken = RoomViewStore.addListener(this.onRoomViewStoreUpdate);
        MatrixClientPeg.get().on(CallEvent.RemoteHoldUnhold, this.onCallRemoteHold);
        const room = MatrixClientPeg.get()?.getRoom(this.state.roomId);
        if (room) {
            WidgetLayoutStore.instance.on(WidgetLayoutStore.emissionForRoom(room), this.updateCalls);
        }
        this.dispatcherRef = dis.register(this.onAction);
        ActiveWidgetStore.instance.on(ActiveWidgetStoreEvent.Update, this.onActiveWidgetStoreUpdate);
    }

    public componentWillUnmount() {
        CallHandler.instance.removeListener(CallHandlerEvent.CallChangeRoom, this.updateCalls);
        CallHandler.instance.removeListener(CallHandlerEvent.CallState, this.updateCalls);
        MatrixClientPeg.get().removeListener(CallEvent.RemoteHoldUnhold, this.onCallRemoteHold);
        this.roomStoreToken?.remove();
        SettingsStore.unwatchSetting(this.settingsWatcherRef);
        const room = MatrixClientPeg.get().getRoom(this.state.roomId);
        if (room) {
            WidgetLayoutStore.instance.off(WidgetLayoutStore.emissionForRoom(room), this.updateCalls);
        }
        if (this.dispatcherRef) {
            dis.unregister(this.dispatcherRef);
        }
        ActiveWidgetStore.instance.off(ActiveWidgetStoreEvent.Update, this.onActiveWidgetStoreUpdate);
    }

    private onRoomViewStoreUpdate = () => {
        const newRoomId = RoomViewStore.getRoomId();
        const oldRoomId = this.state.roomId;
        if (newRoomId === oldRoomId) return;
        // The WidgetLayoutStore observer always tracks the currently viewed Room,
        // so we don't end up with multiple observers and know what observer to remove on unmount
        const oldRoom = MatrixClientPeg.get()?.getRoom(oldRoomId);
        if (oldRoom) {
            WidgetLayoutStore.instance.off(WidgetLayoutStore.emissionForRoom(oldRoom), this.updateCalls);
        }
        const newRoom = MatrixClientPeg.get()?.getRoom(newRoomId);
        if (newRoom) {
            WidgetLayoutStore.instance.on(WidgetLayoutStore.emissionForRoom(newRoom), this.updateCalls);
        }
        if (!newRoomId) return;

        const [primaryCall, secondaryCalls] = getPrimarySecondaryCallsForPip(newRoomId);
        this.setState({
            roomId: newRoomId,
            primaryCall: primaryCall,
            secondaryCall: secondaryCalls[0],
        });
        this.updateShowWidgetInPip();
    };

    private onAction = (payload: ActionPayload): void => {
        if (payload.action ==Action.AfterRightPanelPhaseChange ) {
            this.setState({
                rightPanelPhase: RightPanelStore.getSharedInstance().roomPanelPhase,
            });
            this.updateShowWidgetInPip();
        }
    };

    private onActiveWidgetStoreUpdate = (): void => {
        this.setState({
            persistentWidgetId: ActiveWidgetStore.instance.getPersistentWidgetId(),
        });
        this.updateShowWidgetInPip();
    };

    private updateCalls = (): void => {
        if (!this.state.roomId) return;
        const [primaryCall, secondaryCalls] = getPrimarySecondaryCallsForPip(this.state.roomId);

        this.setState({
            primaryCall: primaryCall,
            secondaryCall: secondaryCalls[0],
        });
        this.updateShowWidgetInPip();
    };

    private onCallRemoteHold = () => {
        if (!this.state.roomId) return;
        const [primaryCall, secondaryCalls] = getPrimarySecondaryCallsForPip(this.state.roomId);

        this.setState({
            primaryCall: primaryCall,
            secondaryCall: secondaryCalls[0],
        });
    };

    private onDoubleClick = (): void => {
        dis.dispatch({
            action: Action.ViewRoom,
            room_id: this.state.primaryCall.roomId,
        });
    };

    public updateShowWidgetInPip() {
        const wId = this.state.persistentWidgetId;

        let userIsPartOfTheRoom = false;
        let fromAnotherRoom = false;
        let notInRightPanel = false;
        let notInCenterContainer = false;
        let notInTopContainer = false;
        if (wId) {
            const persistentWidgetInRoomId = ActiveWidgetStore.instance.getRoomId(wId);

            const persistentWidgetInRoom = MatrixClientPeg.get().getRoom(persistentWidgetInRoomId);

            // Sanity check the room - the widget may have been destroyed between render cycles, and
            // thus no room is associated anymore.
            if (!persistentWidgetInRoom) return null;

            const wls = WidgetLayoutStore.instance;

            userIsPartOfTheRoom = persistentWidgetInRoom.getMyMembership() == "join";
            fromAnotherRoom = this.state.roomId !== persistentWidgetInRoomId;

            notInRightPanel =
                !(this.state.rightPanelPhase == RightPanelPhases.Widget &&
                wId == RightPanelStore.getSharedInstance().roomPanelPhaseParams?.widgetId);
            notInCenterContainer =
                    !wls.getContainerWidgets(persistentWidgetInRoom, Container.Center)
                        .find((app)=>app.id == wId);
            notInTopContainer =
                !wls.getContainerWidgets(persistentWidgetInRoom, Container.Top).find(app=>app.id == wId);
            // Show the persistent widget in two cases. The booleans have to be read like this: the widget is-`fromAnotherRoom`:
        }
        this.setState({
            showWidgetInPip: (fromAnotherRoom && userIsPartOfTheRoom) ||
                    (notInRightPanel && notInCenterContainer && notInTopContainer && userIsPartOfTheRoom),
        });
    }

    public render() {
        const pipMode = true;
        let pipContent;
        let pipViewClasses;
        if (this.state.primaryCall) {
            pipContent = ({ onStartMoving, onResize }) =>
                <CallView
                    onMouseDownOnHeader={onStartMoving}
                    call={this.state.primaryCall}
                    secondaryCall={this.state.secondaryCall}
                    pipMode={pipMode}
                    onResize={onResize}
                />;
        }

        if (this.state.showWidgetInPip) {
            pipViewClasses = classNames({
                mx_CallView: true,
                mx_CallView_pip: pipMode,
                mx_CallView_large: !pipMode,
            });
            const roomId = ActiveWidgetStore.instance.getRoomId(this.state.persistentWidgetId);
            const roomForWidget = MatrixClientPeg.get().getRoom(roomId);

            pipContent = ({ onStartMoving, _onResize }) =>
                <div className={pipViewClasses}>
                    <CallViewHeader
                        type={undefined}
                        onPipMouseDown={onStartMoving}
                        pipMode={pipMode}
                        callRooms={[roomForWidget]}
                    />
                    <PersistentApp
                        persistentWidgetId={this.state.persistentWidgetId}
                    />
                </div>;
        }
        if (!!pipContent) {
            return <PictureInPictureDragger
                className="mx_CallPreview"
                draggable={pipMode}
                onDoubleClick={this.onDoubleClick}
            >
                { pipContent }
            </PictureInPictureDragger>;
        }
        return null;
    }
}
