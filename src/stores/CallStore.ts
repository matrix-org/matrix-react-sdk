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

import { ClientEvent } from "matrix-js-sdk/src/client";
import { RoomStateEvent } from "matrix-js-sdk/src/models/room-state";

import type { MatrixEvent } from "matrix-js-sdk/src/models/event";
import type { Room } from "matrix-js-sdk/src/models/room";
import type { RoomState } from "matrix-js-sdk/src/models/room-state";
import defaultDispatcher from "../dispatcher/dispatcher";
import { ActionPayload } from "../dispatcher/payloads";
import { UPDATE_EVENT } from "./AsyncStore";
import { AsyncStoreWithClient } from "./AsyncStoreWithClient";
import WidgetStore from "./WidgetStore";
import SettingsStore from "../settings/SettingsStore";
import { SettingLevel } from "../settings/SettingLevel";
import MediaDeviceHandler, { MediaDeviceKindEnum } from "../MediaDeviceHandler";
import { Call, CallEvent, ConnectionState } from "../models/Call";

export enum CallStoreEvent {
    // Signals a change in the call associated with a given room
    Call = "call",
    // Signals a change in the active call
    ActiveCall = "active_call",
}

export class CallStore extends AsyncStoreWithClient<null> {
    private static _instance: CallStore;
    public static get instance(): CallStore {
        if (!this._instance) {
            this._instance = new CallStore();
            this._instance.start();
        }
        return this._instance;
    }

    private constructor() {
        super(defaultDispatcher);
    }

    protected async onAction(payload: ActionPayload): Promise<void> {
        // nothing to do
    }

    protected async onReady(): Promise<any> {
        // We assume that the calls present in a room are a function of room
        // state and room widgets, so we initialize the room map here and then
        // update it whenever those change
        for (const room of this.matrixClient.getRooms()) {
            this.updateRoom(room);
        }
        this.matrixClient.on(ClientEvent.Room, this.onRoom);
        this.matrixClient.on(RoomStateEvent.Events, this.onRoomState);
        WidgetStore.instance.on(UPDATE_EVENT, this.onWidgets);

        // If the room ID of the last connected call is still in settings at
        // this time, that's a sign that we failed to disconnect from it
        // properly, and need to clean up after ourselves
        const uncleanlyDisconnectedRoomId = SettingsStore.getValue("activeCallRoomId");
        if (uncleanlyDisconnectedRoomId) {
            await this.get(uncleanlyDisconnectedRoomId)?.clean();
            SettingsStore.setValue("activeCallRoomId", null, SettingLevel.DEVICE, null);
        }
    }

    protected async onNotReady(): Promise<any> {
        for (const call of this.calls.values()) call.destroy();
        this.calls.clear();
        this.matrixClient.off(ClientEvent.Room, this.onRoom);
        this.matrixClient.off(RoomStateEvent.Events, this.onRoomState);
        WidgetStore.instance.off(UPDATE_EVENT, this.onWidgets);
    }

    private _activeCall: Call | null = null;
    /**
     * The call to which the user is currently connected.
     */
    public get activeCall(): Call | null {
        return this._activeCall;
    }
    private set activeCall(value: Call | null) {
        this._activeCall = value;
        this.emit(CallStoreEvent.ActiveCall, value);

        // The room ID is persisted to settings so we can detect unclean disconnects
        SettingsStore.setValue("activeCallRoomId", null, SettingLevel.DEVICE, value?.roomId ?? null);
    }

    private calls = new Map<string, Call>(); // Key is room ID

    public get startWithAudioMuted(): boolean { return SettingsStore.getValue("audioInputMuted"); }
    public set startWithAudioMuted(value: boolean) {
        SettingsStore.setValue("audioInputMuted", null, SettingLevel.DEVICE, value);
    }

    public get startWithVideoMuted(): boolean { return SettingsStore.getValue("videoInputMuted"); }
    public set startWithVideoMuted(value: boolean) {
        SettingsStore.setValue("videoInputMuted", null, SettingLevel.DEVICE, value);
    }

    private updateRoom(room: Room) {
        if (!this.calls.has(room.roomId)) {
            const call = Call.get(room);
            if (call) {
                call.once(CallEvent.Destroy, () => {
                    this.calls.delete(room.roomId);
                    this.updateRoom(room);
                });
                this.calls.set(room.roomId, call);
            }
            this.emit(CallStoreEvent.Call, call, room.roomId);
        }
    }

    /**
     * Gets the call associated with the given room, if any.
     * @param {string} roomId The room's ID.
     * @returns {Call | null} The call.
     */
    public get(roomId: string): Call | null {
        return this.calls.get(roomId) ?? null;
    }

    /**
     * Connects the user to the given call, ensuring that they're first
     * disconnected from any previous call they were on.
     * @param {Call} call The call to connect to.
     */
    public async connect(call: Call): Promise<void> {
        await this.activeCall?.disconnect();

        const {
            [MediaDeviceKindEnum.AudioInput]: audioInputs,
            [MediaDeviceKindEnum.VideoInput]: videoInputs,
        } = await MediaDeviceHandler.getDevices();

        let audioInput: MediaDeviceInfo | null = null;
        if (!this.startWithAudioMuted) {
            const deviceId = MediaDeviceHandler.getAudioInput();
            audioInput = audioInputs.find(d => d.deviceId === deviceId) ?? audioInputs[0] ?? null;
        }
        let videoInput: MediaDeviceInfo | null = null;
        if (!this.startWithVideoMuted) {
            const deviceId = MediaDeviceHandler.getVideoInput();
            videoInput = videoInputs.find(d => d.deviceId === deviceId) ?? videoInputs[0] ?? null;
        }

        await call.connect(audioInput, videoInput);
        this.activeCall = call;

        const onConnectionState = (state: ConnectionState) => {
            if (state === ConnectionState.Disconnected) {
                this.activeCall = null;
                call.off(CallEvent.ConnectionState, onConnectionState);
            }
        };
        call.on(CallEvent.ConnectionState, onConnectionState);
    }

    private onRoom = (room: Room) => this.updateRoom(room);

    private onRoomState = (event: MatrixEvent, state: RoomState) => {
        // If there's already a call stored for this room, it's understood to
        // still be valid until destroyed
        if (!this.calls.has(event.getRoomId())) {
            const room = this.matrixClient.getRoom(event.getRoomId());
            this.updateRoom(room);
        }
    };

    private onWidgets = (roomId: string | null) => {
        if (roomId === null) {
            // This store happened to start before the widget store was done
            // loading all rooms, so we need to initialize each room again
            for (const room of this.matrixClient.getRooms()) {
                this.updateRoom(room);
            }
        } else {
            this.updateRoom(this.matrixClient.getRoom(roomId));
        }
    };
}
