/*
 * Copyright 2020 - 2022 The Matrix.org Foundation C.I.C.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
    Capability,
    EventDirection,
    IOpenIDCredentials,
    IOpenIDUpdate,
    ISendEventDetails,
    ITurnServer,
    IRoomEvent,
    MatrixCapabilities,
    OpenIDRequestState,
    SimpleObservable,
    Symbols,
    Widget,
    WidgetDriver,
    WidgetEventCapability,
    WidgetKind,
} from "matrix-widget-api";
import { ClientEvent, ITurnServer as IClientTurnServer } from "matrix-js-sdk/src/client";
import { EventType } from "matrix-js-sdk/src/@types/event";
import { IContent, IEvent, MatrixEvent } from "matrix-js-sdk/src/models/event";
import { Room } from "matrix-js-sdk/src/models/room";
import { logger } from "matrix-js-sdk/src/logger";
import { THREAD_RELATION_TYPE } from "matrix-js-sdk/src/models/thread";

import { iterableDiff, iterableIntersection } from "../../utils/iterables";
import { MatrixClientPeg } from "../../MatrixClientPeg";
import Modal from "../../Modal";
import WidgetOpenIDPermissionsDialog from "../../components/views/dialogs/WidgetOpenIDPermissionsDialog";
import WidgetCapabilitiesPromptDialog from "../../components/views/dialogs/WidgetCapabilitiesPromptDialog";
import { WidgetPermissionCustomisations } from "../../customisations/WidgetPermissions";
import { OIDCState, WidgetPermissionStore } from "./WidgetPermissionStore";
import { WidgetType } from "../../widgets/WidgetType";
import { CHAT_EFFECTS } from "../../effects";
import { containsEmoji } from "../../effects/utils";
import dis from "../../dispatcher/dispatcher";
import SettingsStore from "../../settings/SettingsStore";
import { RoomViewStore } from "../RoomViewStore";
import { ElementWidgetCapabilities } from "./ElementWidgetCapabilities";
import { navigateToPermalink } from "../../utils/permalinks/navigator";

// TODO: Purge this from the universe

function getRememberedCapabilitiesForWidget(widget: Widget): Capability[] {
    return JSON.parse(localStorage.getItem(`widget_${widget.id}_approved_caps`) || "[]");
}

function setRememberedCapabilitiesForWidget(widget: Widget, caps: Capability[]) {
    localStorage.setItem(`widget_${widget.id}_approved_caps`, JSON.stringify(caps));
}

const normalizeTurnServer = ({ urls, username, credential }: IClientTurnServer): ITurnServer => ({
    uris: urls,
    username,
    password: credential,
});

export class StopGapWidgetDriver extends WidgetDriver {
    private allowedCapabilities: Set<Capability>;

    // TODO: Refactor widgetKind into the Widget class
    constructor(
        allowedCapabilities: Capability[],
        private forWidget: Widget,
        private forWidgetKind: WidgetKind,
        private inRoomId?: string,
    ) {
        super();

        // Always allow screenshots to be taken because it's a client-induced flow. The widget can't
        // spew screenshots at us and can't request screenshots of us, so it's up to us to provide the
        // button if the widget says it supports screenshots.
        this.allowedCapabilities = new Set([...allowedCapabilities,
            MatrixCapabilities.Screenshots,
            ElementWidgetCapabilities.RequiresClient]);

        // Grant the permissions that are specific to given widget types
        if (WidgetType.JITSI.matches(this.forWidget.type) && forWidgetKind === WidgetKind.Room) {
            this.allowedCapabilities.add(MatrixCapabilities.AlwaysOnScreen);
        } else if (WidgetType.STICKERPICKER.matches(this.forWidget.type) && forWidgetKind === WidgetKind.Account) {
            const stickerSendingCap = WidgetEventCapability.forRoomEvent(EventDirection.Send, EventType.Sticker).raw;
            this.allowedCapabilities.add(MatrixCapabilities.StickerSending); // legacy as far as MSC2762 is concerned
            this.allowedCapabilities.add(stickerSendingCap);

            // Auto-approve the legacy visibility capability. We send it regardless of capability.
            // Widgets don't technically need to request this capability, but Scalar still does.
            this.allowedCapabilities.add("visibility");
        }
    }

    public async validateCapabilities(requested: Set<Capability>): Promise<Set<Capability>> {
        // Check to see if any capabilities aren't automatically accepted (such as sticker pickers
        // allowing stickers to be sent). If there are excess capabilities to be approved, the user
        // will be prompted to accept them.
        const diff = iterableDiff(requested, this.allowedCapabilities);
        const missing = new Set(diff.removed); // "removed" is "in A (requested) but not in B (allowed)"
        const allowedSoFar = new Set(this.allowedCapabilities);
        getRememberedCapabilitiesForWidget(this.forWidget).forEach(cap => {
            allowedSoFar.add(cap);
            missing.delete(cap);
        });
        if (WidgetPermissionCustomisations.preapproveCapabilities) {
            const approved = await WidgetPermissionCustomisations.preapproveCapabilities(this.forWidget, requested);
            if (approved) {
                approved.forEach(cap => {
                    allowedSoFar.add(cap);
                    missing.delete(cap);
                });
            }
        }
        // TODO: Do something when the widget requests new capabilities not yet asked for
        let rememberApproved = false;
        if (missing.size > 0) {
            try {
                const [result] = await Modal.createDialog(
                    WidgetCapabilitiesPromptDialog,
                    {
                        requestedCapabilities: missing,
                        widget: this.forWidget,
                        widgetKind: this.forWidgetKind,
                    }).finished;
                (result.approved || []).forEach(cap => allowedSoFar.add(cap));
                rememberApproved = result.remember;
            } catch (e) {
                logger.error("Non-fatal error getting capabilities: ", e);
            }
        }

        // discard all previously allowed capabilities if they are not requested
        // TODO: this results in an unexpected behavior when this function is called during the capabilities renegotiation of MSC2974 that will be resolved later.
        const allAllowed = new Set(iterableIntersection(allowedSoFar, requested));

        if (rememberApproved) {
            setRememberedCapabilitiesForWidget(this.forWidget, Array.from(allAllowed));
        }

        return allAllowed;
    }

    public async sendEvent(
        eventType: string,
        content: IContent,
        stateKey: string = null,
        targetRoomId: string = null,
    ): Promise<ISendEventDetails> {
        const client = MatrixClientPeg.get();
        const roomId = targetRoomId || RoomViewStore.instance.getRoomId();

        if (!client || !roomId) throw new Error("Not in a room or not attached to a client");

        let r: { event_id: string } = null; // eslint-disable-line camelcase
        if (stateKey !== null) {
            // state event
            r = await client.sendStateEvent(roomId, eventType, content, stateKey);
        } else if (eventType === EventType.RoomRedaction) {
            // special case: extract the `redacts` property and call redact
            r = await client.redactEvent(roomId, content['redacts']);
        } else {
            // message event
            r = await client.sendEvent(roomId, eventType, content);

            if (eventType === EventType.RoomMessage) {
                CHAT_EFFECTS.forEach((effect) => {
                    if (containsEmoji(content, effect.emojis)) {
                        // For initial threads launch, chat effects are disabled
                        // see #19731
                        const isNotThread = content["m.relates_to"].rel_type !== THREAD_RELATION_TYPE.name;
                        if (!SettingsStore.getValue("feature_thread") || isNotThread) {
                            dis.dispatch({ action: `effects.${effect.command}` });
                        }
                    }
                });
            }
        }

        return { roomId, eventId: r.event_id };
    }

    public async sendToDevice(
        eventType: string,
        encrypted: boolean,
        contentMap: { [userId: string]: { [deviceId: string]: object } },
    ): Promise<void> {
        const client = MatrixClientPeg.get();

        if (encrypted) {
            const deviceInfoMap = await client.crypto.deviceList.downloadKeys(Object.keys(contentMap), false);

            await Promise.all(
                Object.entries(contentMap).flatMap(([userId, userContentMap]) =>
                    Object.entries(userContentMap).map(async ([deviceId, content]) => {
                        if (deviceId === "*") {
                            // Send the message to all devices we have keys for
                            await client.encryptAndSendToDevices(
                                Object.values(deviceInfoMap[userId]).map(deviceInfo => ({
                                    userId, deviceInfo,
                                })),
                                content,
                            );
                        } else {
                            // Send the message to a specific device
                            await client.encryptAndSendToDevices(
                                [{ userId, deviceInfo: deviceInfoMap[userId][deviceId] }],
                                content,
                            );
                        }
                    }),
                ),
            );
        } else {
            await client.queueToDevice({
                eventType,
                batch: Object.entries(contentMap).flatMap(([userId, userContentMap]) =>
                    Object.entries(userContentMap).map(([deviceId, content]) =>
                        ({ userId, deviceId, payload: content }),
                    ),
                ),
            });
        }
    }

    private pickRooms(roomIds: (string | Symbols.AnyRoom)[] = null): Room[] {
        const client = MatrixClientPeg.get();
        if (!client) throw new Error("Not attached to a client");

        const targetRooms = roomIds
            ? (roomIds.includes(Symbols.AnyRoom) ? client.getVisibleRooms() : roomIds.map(r => client.getRoom(r)))
            : [client.getRoom(RoomViewStore.instance.getRoomId())];
        return targetRooms.filter(r => !!r);
    }

    public async readRoomEvents(
        eventType: string,
        msgtype: string | undefined,
        limitPerRoom: number,
        roomIds: (string | Symbols.AnyRoom)[] = null,
    ): Promise<IRoomEvent[]> {
        limitPerRoom = limitPerRoom > 0 ? Math.min(limitPerRoom, Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER; // relatively arbitrary

        const rooms = this.pickRooms(roomIds);
        const allResults: IEvent[] = [];
        for (const room of rooms) {
            const results: MatrixEvent[] = [];
            const events = room.getLiveTimeline().getEvents(); // timelines are most recent last
            for (let i = events.length - 1; i > 0; i--) {
                if (results.length >= limitPerRoom) break;

                const ev = events[i];
                if (ev.getType() !== eventType || ev.isState()) continue;
                if (eventType === EventType.RoomMessage && msgtype && msgtype !== ev.getContent()['msgtype']) continue;
                results.push(ev);
            }

            results.forEach(e => allResults.push(e.getEffectiveEvent()));
        }
        return allResults;
    }

    public async readStateEvents(
        eventType: string,
        stateKey: string | undefined,
        limitPerRoom: number,
        roomIds: (string | Symbols.AnyRoom)[] = null,
    ): Promise<IRoomEvent[]> {
        limitPerRoom = limitPerRoom > 0 ? Math.min(limitPerRoom, Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER; // relatively arbitrary

        const rooms = this.pickRooms(roomIds);
        const allResults: IEvent[] = [];
        for (const room of rooms) {
            const results: MatrixEvent[] = [];
            const state: Map<string, MatrixEvent> = room.currentState.events.get(eventType);
            if (state) {
                if (stateKey === "" || !!stateKey) {
                    const forKey = state.get(stateKey);
                    if (forKey) results.push(forKey);
                } else {
                    results.push(...Array.from(state.values()));
                }
            }

            results.slice(0, limitPerRoom).forEach(e => allResults.push(e.getEffectiveEvent()));
        }
        return allResults;
    }

    public async askOpenID(observer: SimpleObservable<IOpenIDUpdate>) {
        const oidcState = WidgetPermissionStore.instance.getOIDCState(
            this.forWidget, this.forWidgetKind, this.inRoomId,
        );

        const getToken = (): Promise<IOpenIDCredentials> => {
            return MatrixClientPeg.get().getOpenIdToken();
        };

        if (oidcState === OIDCState.Denied) {
            return observer.update({ state: OpenIDRequestState.Blocked });
        }
        if (oidcState === OIDCState.Allowed) {
            return observer.update({ state: OpenIDRequestState.Allowed, token: await getToken() });
        }

        observer.update({ state: OpenIDRequestState.PendingUserConfirmation });

        Modal.createDialog(WidgetOpenIDPermissionsDialog, {
            widget: this.forWidget,
            widgetKind: this.forWidgetKind,
            inRoomId: this.inRoomId,

            onFinished: async (confirm) => {
                if (!confirm) {
                    return observer.update({ state: OpenIDRequestState.Blocked });
                }

                return observer.update({ state: OpenIDRequestState.Allowed, token: await getToken() });
            },
        });
    }

    public async navigate(uri: string): Promise<void> {
        navigateToPermalink(uri);
    }

    public async* getTurnServers(): AsyncGenerator<ITurnServer> {
        const client = MatrixClientPeg.get();
        if (!client.pollingTurnServers || !client.getTurnServers().length) return;

        let setTurnServer: (server: ITurnServer) => void;
        let setError: (error: Error) => void;

        const onTurnServers = ([server]: IClientTurnServer[]) => setTurnServer(normalizeTurnServer(server));
        const onTurnServersError = (error: Error, fatal: boolean) => { if (fatal) setError(error); };

        client.on(ClientEvent.TurnServers, onTurnServers);
        client.on(ClientEvent.TurnServersError, onTurnServersError);

        try {
            const initialTurnServer = client.getTurnServers()[0];
            yield normalizeTurnServer(initialTurnServer);

            // Repeatedly listen for new TURN servers until an error occurs or
            // the caller stops this generator
            while (true) {
                yield await new Promise<ITurnServer>((resolve, reject) => {
                    setTurnServer = resolve;
                    setError = reject;
                });
            }
        } finally {
            // The loop was broken - clean up
            client.off(ClientEvent.TurnServers, onTurnServers);
            client.off(ClientEvent.TurnServersError, onTurnServersError);
        }
    }
}
