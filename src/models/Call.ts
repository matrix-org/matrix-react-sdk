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

import { TypedEventEmitter } from "matrix-js-sdk/src/models/typed-event-emitter";
import { logger } from "matrix-js-sdk/src/logger";
import { randomString } from "matrix-js-sdk/src/randomstring";
import { MatrixClient } from "matrix-js-sdk/src/client";
import { RoomEvent } from "matrix-js-sdk/src/models/room";
import { RoomStateEvent } from "matrix-js-sdk/src/models/room-state";
import { CallType } from "matrix-js-sdk/src/webrtc/call";
import { NamespacedValue } from "matrix-js-sdk/src/NamespacedValue";
import { IWidgetApiRequest, MatrixWidgetType } from "matrix-widget-api";

import type EventEmitter from "events";
import type { IMyDevice } from "matrix-js-sdk/src/client";
import type { MatrixEvent } from "matrix-js-sdk/src/models/event";
import type { Room } from "matrix-js-sdk/src/models/room";
import type { RoomMember } from "matrix-js-sdk/src/models/room-member";
import type { ClientWidgetApi } from "matrix-widget-api";
import type { IApp } from "../stores/WidgetStore";
import SdkConfig from "../SdkConfig";
import SettingsStore from "../settings/SettingsStore";
import MediaDeviceHandler, { MediaDeviceKindEnum } from "../MediaDeviceHandler";
import { timeout } from "../utils/promise";
import WidgetUtils from "../utils/WidgetUtils";
import { WidgetType } from "../widgets/WidgetType";
import { ElementWidgetActions } from "../stores/widgets/ElementWidgetActions";
import WidgetStore from "../stores/WidgetStore";
import { WidgetMessagingStore, WidgetMessagingStoreEvent } from "../stores/widgets/WidgetMessagingStore";
import ActiveWidgetStore, { ActiveWidgetStoreEvent } from "../stores/ActiveWidgetStore";

const TIMEOUT_MS = 16000;

// Waits until an event is emitted satisfying the given predicate
const waitForEvent = async (
    emitter: EventEmitter,
    event: string,
    pred: (...args: any[]) => boolean = () => true,
): Promise<void> => {
    let listener: (...args: any[]) => void;
    const wait = new Promise<void>(resolve => {
        listener = (...args) => { if (pred(...args)) resolve(); };
        emitter.on(event, listener);
    });

    const timedOut = await timeout(wait, false, TIMEOUT_MS) === false;
    emitter.off(event, listener);
    if (timedOut) throw new Error("Timed out");
};

export enum ConnectionState {
    Disconnected = "disconnected",
    Connecting = "connecting",
    Connected = "connected",
    Disconnecting = "disconnecting",
}

export const isConnected = (state: ConnectionState): boolean =>
    state === ConnectionState.Connected || state === ConnectionState.Disconnecting;

export enum CallEvent {
    ConnectionState = "connection_state",
    Participants = "participants",
    Destroy = "destroy",
}

interface CallEventHandlerMap {
    [CallEvent.ConnectionState]: (state: ConnectionState, prevState: ConnectionState) => void;
    [CallEvent.Participants]: (participants: Set<RoomMember>) => void;
    [CallEvent.Destroy]: () => void;
}

/**
 * A group call accessed through a widget.
 */
export abstract class Call extends TypedEventEmitter<CallEvent, CallEventHandlerMap> {
    protected readonly widgetUid = WidgetUtils.getWidgetUid(this.widget);

    private _messaging: ClientWidgetApi | null = null;
    /**
     * The widget's messaging, or null if disconnected.
     */
    protected get messaging(): ClientWidgetApi | null {
        return this._messaging;
    }
    private set messaging(value: ClientWidgetApi | null) {
        this._messaging = value;
    }

    public get roomId(): string {
        return this.widget.roomId;
    }

    private _connectionState: ConnectionState = ConnectionState.Disconnected;
    public get connectionState(): ConnectionState {
        return this._connectionState;
    }
    protected set connectionState(value: ConnectionState) {
        const prevValue = this._connectionState;
        this._connectionState = value;
        this.emit(CallEvent.ConnectionState, value, prevValue);
    }

    public get connected(): boolean {
        return isConnected(this.connectionState);
    }

    private _participants = new Set<RoomMember>();
    public get participants(): Set<RoomMember> {
        return this._participants;
    }
    protected set participants(value: Set<RoomMember>) {
        this._participants = value;
        this.emit(CallEvent.Participants, value);
    }

    constructor(
        /**
         * The widget used to access this call.
         */
        public readonly widget: IApp,
    ) {
        super();
    }

    /**
     * Gets the call associated with the given room, if any.
     * @param {Room} room The room.
     * @returns {Call | null} The call.
     */
    public static get(room: Room): Call | null {
        return ElementCall.get(room) ?? JitsiCall.get(room);
    }

    /**
     * Performs a routine check of the call's associated room state, cleaning up
     * any data left over from an unclean disconnection.
     */
    public abstract clean(): Promise<void>;

    /**
     * Contacts the widget to connect to the call.
     * @param {MediaDeviceInfo | null} audioInput The audio input to use, or
     *   null to start muted.
     * @param {MediaDeviceInfo | null} audioInput The video input to use, or
     *   null to start muted.
     */
    protected abstract performConnection(
        audioInput: MediaDeviceInfo | null,
        videoInput: MediaDeviceInfo | null,
    ): Promise<void>;

    /**
     * Contacts the widget to disconnect from the call.
     */
    protected abstract performDisconnection(): Promise<void>;

    /**
     * Connects the user to the call using the media devices set in
     * MediaDeviceHandler. The widget associated with the call must be active
     * for this to succeed.
     */
    public async connect(): Promise<void> {
        this.connectionState = ConnectionState.Connecting;

        const {
            [MediaDeviceKindEnum.AudioInput]: audioInputs,
            [MediaDeviceKindEnum.VideoInput]: videoInputs,
        } = await MediaDeviceHandler.getDevices();

        let audioInput: MediaDeviceInfo | null = null;
        if (!MediaDeviceHandler.startWithAudioMuted) {
            const deviceId = MediaDeviceHandler.getAudioInput();
            audioInput = audioInputs.find(d => d.deviceId === deviceId) ?? audioInputs[0] ?? null;
        }
        let videoInput: MediaDeviceInfo | null = null;
        if (!MediaDeviceHandler.startWithVideoMuted) {
            const deviceId = MediaDeviceHandler.getVideoInput();
            videoInput = videoInputs.find(d => d.deviceId === deviceId) ?? videoInputs[0] ?? null;
        }

        const messagingStore = WidgetMessagingStore.instance;
        this.messaging = messagingStore.getMessagingForUid(this.widgetUid);
        if (!this.messaging) {
            // The widget might still be initializing, so wait for it
            try {
                await waitForEvent(
                    messagingStore,
                    WidgetMessagingStoreEvent.StoreMessaging,
                    (uid: string, widgetApi: ClientWidgetApi) => {
                        if (uid === this.widgetUid) {
                            this.messaging = widgetApi;
                            return true;
                        }
                        return false;
                    },
                );
            } catch (e) {
                throw new Error(`Failed to bind call widget in room ${this.roomId}: ${e}`);
            }
        }

        try {
            await this.performConnection(audioInput, videoInput);
        } catch (e) {
            this.connectionState = ConnectionState.Disconnected;
            throw e;
        }

        this.connectionState = ConnectionState.Connected;
    }

    /**
     * Disconnects the user from the call.
     */
    public async disconnect(): Promise<void> {
        if (this.connectionState !== ConnectionState.Connected) throw new Error("Not connected");

        this.connectionState = ConnectionState.Disconnecting;
        await this.performDisconnection();
        this.setDisconnected();
    }

    /**
     * Manually marks the call as disconnected and cleans up.
     */
    public setDisconnected() {
        this.messaging = null;
        this.connectionState = ConnectionState.Disconnected;
    }

    /**
     * Stops all internal timers and tasks to prepare for garbage collection.
     */
    public destroy() {
        if (this.connected) this.setDisconnected();
        this.emit(CallEvent.Destroy);
    }
}

interface JitsiCallMemberContent {
    // Connected device IDs
    devices: string[];
    // Time at which this state event should be considered stale
    expires_ts: number;
}

/**
 * A group call using Jitsi as a backend.
 */
export class JitsiCall extends Call {
    public static readonly MEMBER_EVENT_TYPE = "io.element.video.member";
    public static readonly STUCK_DEVICE_TIMEOUT_MS = 1000 * 60 * 60; // 1 hour

    private room: Room = this.client.getRoom(this.roomId)!;
    private resendDevicesTimer: number | null = null;
    private participantsExpirationTimer: number | null = null;

    private constructor(widget: IApp, private readonly client: MatrixClient) {
        super(widget);

        this.room.on(RoomStateEvent.Update, this.onRoomState);
        this.on(CallEvent.ConnectionState, this.onConnectionState);
        this.updateParticipants();
    }

    public static get(room: Room): JitsiCall | null {
        // Only supported in video rooms
        if (SettingsStore.getValue("feature_video_rooms") && room.isElementVideoRoom()) {
            const apps = WidgetStore.instance.getApps(room.roomId);
            // The isVideoChannel field differentiates rich Jitsi calls from bare Jitsi widgets
            const jitsiWidget = apps.find(app => WidgetType.JITSI.matches(app.type) && app.data?.isVideoChannel);
            if (jitsiWidget) return new JitsiCall(jitsiWidget, room.client);
        }

        return null;
    }

    public static async create(room: Room): Promise<void> {
        await WidgetUtils.addJitsiWidget(room.roomId, CallType.Video, "Group call", true, room.name);
    }

    private updateParticipants() {
        if (this.participantsExpirationTimer !== null) {
            clearTimeout(this.participantsExpirationTimer);
            this.participantsExpirationTimer = null;
        }

        const members = new Set<RoomMember>();
        const now = Date.now();
        let allExpireAt = Infinity;

        for (const e of this.room.currentState.getStateEvents(JitsiCall.MEMBER_EVENT_TYPE)) {
            const member = this.room.getMember(e.getStateKey()!);
            const content = e.getContent<JitsiCallMemberContent>();
            const expiresAt = typeof content.expires_ts === "number" ? content.expires_ts : -Infinity;
            let devices = expiresAt > now && Array.isArray(content.devices) ? content.devices : [];

            // Apply local echo for the disconnected case
            if (!this.connected && member?.userId === this.client.getUserId()) {
                devices = devices.filter(d => d !== this.client.getDeviceId());
            }
            // Must have a connected device and still be joined to the room
            if (devices.length && member?.membership === "join") {
                members.add(member);
                if (expiresAt < allExpireAt) allExpireAt = expiresAt;
            }
        }

        // Apply local echo for the connected case
        if (this.connected) members.add(this.room.getMember(this.client.getUserId()!)!);

        this.participants = members;
        if (allExpireAt < Infinity) {
            this.participantsExpirationTimer = setTimeout(() => this.updateParticipants(), allExpireAt - now);
        }
    }

    // Helper method that updates our member state with the devices returned by
    // the given function. If it returns null, the update is skipped.
    private async updateDevices(fn: (devices: string[]) => (string[] | null)): Promise<void> {
        if (this.room.getMyMembership() !== "join") return;

        const event = this.room.currentState.getStateEvents(
            JitsiCall.MEMBER_EVENT_TYPE, this.client.getUserId()!,
        );
        const content = event?.getContent<JitsiCallMemberContent>();
        const expiresAt = typeof content?.expires_ts === "number" ? content.expires_ts : -Infinity;
        const devices = expiresAt > Date.now() && Array.isArray(content?.devices) ? content.devices : [];
        const newDevices = fn(devices);

        if (newDevices) {
            const content: JitsiCallMemberContent = {
                devices: newDevices,
                expires_ts: Date.now() + JitsiCall.STUCK_DEVICE_TIMEOUT_MS,
            };

            await this.client.sendStateEvent(
                this.roomId, JitsiCall.MEMBER_EVENT_TYPE, content, this.client.getUserId()!,
            );
        }
    }

    private async addOurDevice(): Promise<void> {
        await this.updateDevices(devices => Array.from(new Set(devices).add(this.client.getDeviceId())));
    }

    private async removeOurDevice(): Promise<void> {
        await this.updateDevices(devices => {
            const devicesSet = new Set(devices);
            devicesSet.delete(this.client.getDeviceId());
            return Array.from(devicesSet);
        });
    }

    public async clean(): Promise<void> {
        const now = Date.now();
        const { devices: myDevices } = await this.client.getDevices();
        const deviceMap = new Map<string, IMyDevice>(myDevices.map(d => [d.device_id, d]));

        // Clean up our member state by filtering out logged out devices,
        // inactive devices, and our own device (if we're disconnected)
        await this.updateDevices(devices => {
            const newDevices = devices.filter(d => {
                const device = deviceMap.get(d);
                return device?.last_seen_ts
                    && !(d === this.client.getDeviceId() && !this.connected)
                    && (now - device.last_seen_ts) < JitsiCall.STUCK_DEVICE_TIMEOUT_MS;
            });

            // Skip the update if the devices are unchanged
            return newDevices.length === devices.length ? null : newDevices;
        });
    }

    protected async performConnection(
        audioInput: MediaDeviceInfo | null,
        videoInput: MediaDeviceInfo | null,
    ): Promise<void> {
        // Ensure that the messaging doesn't get stopped while we're waiting for responses
        const dontStopMessaging = new Promise<void>((resolve, reject) => {
            const messagingStore = WidgetMessagingStore.instance;

            const listener = (uid: string) => {
                if (uid === this.widgetUid) {
                    cleanup();
                    reject(new Error("Messaging stopped"));
                }
            };
            const done = () => {
                cleanup();
                resolve();
            };
            const cleanup = () => {
                messagingStore.off(WidgetMessagingStoreEvent.StopMessaging, listener);
                this.off(CallEvent.ConnectionState, done);
            };

            messagingStore.on(WidgetMessagingStoreEvent.StopMessaging, listener);
            this.on(CallEvent.ConnectionState, done);
        });

        // Empirically, it's possible for Jitsi Meet to crash instantly at startup,
        // sending a hangup event that races with the rest of this method, so we need
        // to add the hangup listener now rather than later
        this.messaging!.on(`action:${ElementWidgetActions.HangupCall}`, this.onHangup);

        // Actually perform the join
        const response = waitForEvent(
            this.messaging!,
            `action:${ElementWidgetActions.JoinCall}`,
            (ev: CustomEvent<IWidgetApiRequest>) => {
                ev.preventDefault();
                this.messaging!.transport.reply(ev.detail, {}); // ack
                return true;
            },
        );
        const request = this.messaging!.transport.send(ElementWidgetActions.JoinCall, {
            audioInput: audioInput?.label ?? null,
            videoInput: videoInput?.label ?? null,
        });
        try {
            await Promise.race([Promise.all([request, response]), dontStopMessaging]);
        } catch (e) {
            // If it timed out, clean up our advance preparations
            this.messaging!.off(`action:${ElementWidgetActions.HangupCall}`, this.onHangup);

            if (this.messaging!.transport.ready) {
                // The messaging still exists, which means Jitsi might still be going in the background
                this.messaging!.transport.send(ElementWidgetActions.HangupCall, { force: true });
            }

            throw new Error(`Failed to join call in room ${this.roomId}: ${e}`);
        }

        ActiveWidgetStore.instance.on(ActiveWidgetStoreEvent.Dock, this.onDock);
        ActiveWidgetStore.instance.on(ActiveWidgetStoreEvent.Undock, this.onUndock);
        this.room.on(RoomEvent.MyMembership, this.onMyMembership);
        window.addEventListener("beforeunload", this.beforeUnload);
    }

    protected async performDisconnection(): Promise<void> {
        const response = waitForEvent(
            this.messaging!,
            `action:${ElementWidgetActions.HangupCall}`,
            (ev: CustomEvent<IWidgetApiRequest>) => {
                ev.preventDefault();
                this.messaging!.transport.reply(ev.detail, {}); // ack
                return true;
            },
        );
        const request = this.messaging!.transport.send(ElementWidgetActions.HangupCall, {});
        try {
            await Promise.all([request, response]);
        } catch (e) {
            throw new Error(`Failed to hangup call in room ${this.roomId}: ${e}`);
        }
    }

    public setDisconnected() {
        this.messaging!.off(`action:${ElementWidgetActions.HangupCall}`, this.onHangup);
        ActiveWidgetStore.instance.off(ActiveWidgetStoreEvent.Dock, this.onDock);
        ActiveWidgetStore.instance.off(ActiveWidgetStoreEvent.Undock, this.onUndock);
        this.room.off(RoomEvent.MyMembership, this.onMyMembership);
        window.removeEventListener("beforeunload", this.beforeUnload);

        super.setDisconnected();
    }

    public destroy() {
        this.room.off(RoomStateEvent.Update, this.onRoomState);
        this.on(CallEvent.ConnectionState, this.onConnectionState);
        if (this.participantsExpirationTimer !== null) {
            clearTimeout(this.participantsExpirationTimer);
            this.participantsExpirationTimer = null;
        }
        if (this.resendDevicesTimer !== null) {
            clearInterval(this.resendDevicesTimer);
            this.resendDevicesTimer = null;
        }

        super.destroy();
    }

    private onRoomState = () => this.updateParticipants();

    private onConnectionState = async (state: ConnectionState, prevState: ConnectionState) => {
        if (state === ConnectionState.Connected && !isConnected(prevState)) {
            this.updateParticipants(); // Local echo

            // Tell others that we're connected, by adding our device to room state
            await this.addOurDevice();
            // Re-add this device every so often so our video member event doesn't become stale
            this.resendDevicesTimer = setInterval(async () => {
                logger.log(`Resending video member event for ${this.roomId}`);
                await this.addOurDevice();
            }, (JitsiCall.STUCK_DEVICE_TIMEOUT_MS * 3) / 4);
        } else if (state === ConnectionState.Disconnected && isConnected(prevState)) {
            this.updateParticipants(); // Local echo

            clearInterval(this.resendDevicesTimer);
            this.resendDevicesTimer = null;
            // Tell others that we're disconnected, by removing our device from room state
            await this.removeOurDevice();
        }
    };

    private onDock = async () => {
        // The widget is no longer a PiP, so let's restore the default layout
        await this.messaging!.transport.send(ElementWidgetActions.TileLayout, {});
    };

    private onUndock = async () => {
        // The widget has become a PiP, so let's switch Jitsi to spotlight mode
        // to only show the active speaker and economize on space
        await this.messaging!.transport.send(ElementWidgetActions.SpotlightLayout, {});
    };

    private onMyMembership = async (_room: Room, membership: string) => {
        if (membership !== "join") this.setDisconnected();
    };

    private beforeUnload = () => this.setDisconnected();

    private onHangup = async (ev: CustomEvent<IWidgetApiRequest>) => {
        // If we're already in the middle of a client-initiated disconnection,
        // ignore the event
        if (this.connectionState === ConnectionState.Disconnecting) return;

        ev.preventDefault();

        // In case this hangup is caused by Jitsi Meet crashing at startup,
        // wait for the connection event in order to avoid racing
        if (this.connectionState === ConnectionState.Connecting) {
            await waitForEvent(this, CallEvent.ConnectionState);
        }

        await this.messaging!.transport.reply(ev.detail, {}); // ack
        this.setDisconnected();
    };
}

interface ElementCallMemberContent {
    "m.expires_ts": number;
    "m.calls": {
        "m.call_id": string;
        "m.devices": {
            "m.device_id": string;
        }[];
    }[];
}

/**
 * A group call using MSC3401 and Element Call as a backend.
 * (somewhat cheekily named)
 */
export class ElementCall extends Call {
    public static readonly CALL_EVENT_TYPE = new NamespacedValue(null, "org.matrix.msc3401.call");
    public static readonly MEMBER_EVENT_TYPE = new NamespacedValue(null, "org.matrix.msc3401.call.member");
    public static readonly STUCK_DEVICE_TIMEOUT_MS = 1000 * 60 * 60; // 1 hour

    private room: Room = this.client.getRoom(this.roomId)!;
    private participantsExpirationTimer: number | null = null;

    private constructor(public readonly groupCall: MatrixEvent, private readonly client: MatrixClient) {
        // Splice together the Element Call URL for this call
        const url = new URL(SdkConfig.get("element_call_url"));
        url.pathname = "/room";
        const params = new URLSearchParams({
            embed: "",
            preload: "",
            hideHeader: "",
            userId: client.getUserId(),
            deviceId: client.getDeviceId(),
            roomId: groupCall.getRoomId(),
        });
        url.hash = `#?${params.toString()}`;

        // To use Element Call without touching room state, we create a virtual
        // widget (one that doesn't have a corresponding state event)
        super({
            roomId: groupCall.getRoomId(),
            id: randomString(24), // So that it's globally unique
            creatorUserId: client.getUserId(),
            name: "Element Call",
            type: MatrixWidgetType.Custom,
            url: url.toString(),
        });

        this.room.on(RoomStateEvent.Update, this.onRoomState);
        this.on(CallEvent.ConnectionState, this.onConnectionState);
        this.updateParticipants();
    }

    public static get(room: Room): ElementCall | null {
        // Only supported in video rooms (for now)
        if (
            SettingsStore.getValue("feature_video_rooms")
            && SettingsStore.getValue("feature_element_call_video_rooms")
            && room.isCallRoom()
        ) {
            const groupCalls = ElementCall.CALL_EVENT_TYPE.names.flatMap(eventType =>
                room.currentState.getStateEvents(eventType),
            );

            // Find the newest unterminated call
            let groupCall: MatrixEvent | null = null;
            for (const event of groupCalls) {
                if (
                    !("m.terminated" in event.getContent())
                    && (groupCall === null || event.getTs() > groupCall.getTs())
                ) {
                    groupCall = event;
                }
            }

            if (groupCall !== null) return new ElementCall(groupCall, room.client);
        }

        return null;
    }

    public static async create(room: Room): Promise<void> {
        await room.client.sendStateEvent(room.roomId, ElementCall.CALL_EVENT_TYPE.name, {
            "m.intent": "m.room",
            "m.type": "m.video",
        }, randomString(24));
    }

    private updateParticipants() {
        if (this.participantsExpirationTimer !== null) {
            clearTimeout(this.participantsExpirationTimer);
            this.participantsExpirationTimer = null;
        }

        const members = new Set<RoomMember>();
        const now = Date.now();
        let allExpireAt = Infinity;

        const memberEvents = ElementCall.MEMBER_EVENT_TYPE.names.flatMap(eventType =>
            this.room.currentState.getStateEvents(eventType),
        );

        for (const e of memberEvents) {
            const member = this.room.getMember(e.getStateKey()!);
            const content = e.getContent<ElementCallMemberContent>();
            const expiresAt = typeof content["m.expires_ts"] === "number" ? content["m.expires_ts"] : -Infinity;
            const calls = expiresAt > now && Array.isArray(content["m.calls"]) ? content["m.calls"] : [];
            const call = calls.find(call => call["m.call_id"] === this.groupCall.getStateKey());
            let devices = Array.isArray(call?.["m.devices"]) ? call["m.devices"] : [];

            // Apply local echo for the disconnected case
            if (!this.connected && member?.userId === this.client.getUserId()) {
                devices = devices.filter(d => d["m.device_id"] !== this.client.getDeviceId());
            }
            // Must have a connected device and still be joined to the room
            if (devices.length && member?.membership === "join") {
                members.add(member);
                if (expiresAt < allExpireAt) allExpireAt = expiresAt;
            }
        }

        // Apply local echo for the connected case
        if (this.connected) members.add(this.room.getMember(this.client.getUserId()!)!);

        this.participants = members;
        if (allExpireAt < Infinity) {
            this.participantsExpirationTimer = setTimeout(() => this.updateParticipants(), allExpireAt - now);
        }
    }

    // Helper method that updates our member state with the devices returned by
    // the given function. If it returns null, the update is skipped.
    private async updateDevices(fn: (devices: string[]) => (string[] | null)): Promise<void> {
        if (this.room.getMyMembership() !== "join") return;

        const event = (() => {
            for (const eventType of ElementCall.MEMBER_EVENT_TYPE.names) {
                const e = this.room.currentState.getStateEvents(eventType, this.client.getUserId()!);
                if (e) return e;
            }
            return null;
        })();
        const content = event?.getContent<ElementCallMemberContent>();
        const expiresAt = typeof content?.["m.expires_ts"] === "number" ? content["m.expires_ts"] : -Infinity;
        const calls = expiresAt > Date.now() && Array.isArray(content?.["m.calls"]) ? content["m.calls"] : [];
        const call = calls.find(call => call["m.call_id"] === this.groupCall.getStateKey());
        const devices = Array.isArray(call?.["m.devices"]) ? call["m.devices"] : [];
        const newDevices = fn(devices.map(d => d["m.device_id"]));

        if (newDevices) {
            const content: ElementCallMemberContent = {
                "m.expires_ts": Date.now() + ElementCall.STUCK_DEVICE_TIMEOUT_MS,
                "m.calls": [
                    {
                        "m.call_id": this.groupCall.getStateKey(),
                        "m.devices": newDevices.map(d => ({ "m.device_id": d })),
                    },
                    ...calls.filter(c => c["m.call_id"] !== this.groupCall.getStateKey()),
                ],
            };

            await this.client.sendStateEvent(
                this.roomId, ElementCall.MEMBER_EVENT_TYPE.name, content, this.client.getUserId()!,
            );
        }
    }

    public async clean(): Promise<void> {
        const now = Date.now();
        const { devices: myDevices } = await this.client.getDevices();
        const deviceMap = new Map<string, IMyDevice>(myDevices.map(d => [d.device_id, d]));

        // Clean up our member state by filtering out logged out devices,
        // inactive devices, and our own device (if we're disconnected)
        await this.updateDevices(devices => {
            const newDevices = devices.filter(d => {
                const device = deviceMap.get(d);
                return device?.last_seen_ts
                    && !(d === this.client.getDeviceId() && !this.connected)
                    && (now - device.last_seen_ts) < ElementCall.STUCK_DEVICE_TIMEOUT_MS;
            });

            // Skip the update if the devices are unchanged
            return newDevices.length === devices.length ? null : newDevices;
        });
    }

    protected async performConnection(
        audioInput: MediaDeviceInfo | null,
        videoInput: MediaDeviceInfo | null,
    ): Promise<void> {
        try {
            await this.messaging!.transport.send(ElementWidgetActions.JoinCall, {
                audioInput: audioInput?.deviceId ?? null,
                videoInput: videoInput?.deviceId ?? null,
            });
        } catch (e) {
            throw new Error(`Failed to join call in room ${this.roomId}: ${e}`);
        }

        this.messaging!.on(`action:${ElementWidgetActions.HangupCall}`, this.onHangup);
        this.room.on(RoomEvent.MyMembership, this.onMyMembership);
        window.addEventListener("beforeunload", this.beforeUnload);
    }

    protected async performDisconnection(): Promise<void> {
        try {
            await this.messaging!.transport.send(ElementWidgetActions.HangupCall, {});
        } catch (e) {
            throw new Error(`Failed to hangup call in room ${this.roomId}: ${e}`);
        }
    }

    public setDisconnected() {
        this.messaging!.off(`action:${ElementWidgetActions.HangupCall}`, this.onHangup);
        this.room.off(RoomEvent.MyMembership, this.onMyMembership);
        window.removeEventListener("beforeunload", this.beforeUnload);

        super.setDisconnected();
    }

    public destroy() {
        this.room.off(RoomStateEvent.Update, this.onRoomState);
        this.off(CallEvent.ConnectionState, this.onConnectionState);
        if (this.participantsExpirationTimer !== null) {
            clearTimeout(this.participantsExpirationTimer);
            this.participantsExpirationTimer = null;
        }

        super.destroy();
    }

    private onRoomState = () => this.updateParticipants();

    private onConnectionState = async (state: ConnectionState, prevState: ConnectionState) => {
        if (
            (state === ConnectionState.Connected && !isConnected(prevState))
            || (state === ConnectionState.Disconnected && isConnected(prevState))
        ) {
            this.updateParticipants(); // Local echo
        }
    };

    private onHangup = async (ev: CustomEvent<IWidgetApiRequest>) => {
        ev.preventDefault();
        await this.messaging!.transport.reply(ev.detail, {}); // ack
        this.setDisconnected();
    };

    private onMyMembership = async (_room: Room, membership: string) => {
        if (membership !== "join") this.setDisconnected();
    };

    private beforeUnload = () => this.setDisconnected();
}
