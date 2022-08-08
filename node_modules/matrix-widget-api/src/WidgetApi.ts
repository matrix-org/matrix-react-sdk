/*
 * Copyright 2020 - 2021 The Matrix.org Foundation C.I.C.
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

import { EventEmitter } from "events";
import { Capability } from "./interfaces/Capabilities";
import { IWidgetApiRequest, IWidgetApiRequestEmptyData } from "./interfaces/IWidgetApiRequest";
import { WidgetApiDirection } from "./interfaces/WidgetApiDirection";
import {
    ISupportedVersionsActionRequest,
    ISupportedVersionsActionResponseData,
} from "./interfaces/SupportedVersionsAction";
import { ApiVersion, CurrentApiVersions, UnstableApiVersion } from "./interfaces/ApiVersion";
import {
    ICapabilitiesActionRequest,
    ICapabilitiesActionResponseData,
    INotifyCapabilitiesActionRequest,
    IRenegotiateCapabilitiesRequestData,
} from "./interfaces/CapabilitiesAction";
import { ITransport } from "./transport/ITransport";
import { PostmessageTransport } from "./transport/PostmessageTransport";
import { WidgetApiFromWidgetAction, WidgetApiToWidgetAction } from "./interfaces/WidgetApiAction";
import { IWidgetApiErrorResponseData } from "./interfaces/IWidgetApiErrorResponse";
import { IStickerActionRequestData } from "./interfaces/StickerAction";
import { IStickyActionRequestData, IStickyActionResponseData } from "./interfaces/StickyAction";
import {
    IGetOpenIDActionRequestData,
    IGetOpenIDActionResponse,
    IOpenIDCredentials,
    OpenIDRequestState,
} from "./interfaces/GetOpenIDAction";
import { IOpenIDCredentialsActionRequest } from "./interfaces/OpenIDCredentialsAction";
import { MatrixWidgetType, WidgetType } from "./interfaces/WidgetType";
import {
    BuiltInModalButtonID,
    IModalWidgetCreateData,
    IModalWidgetOpenRequestData,
    IModalWidgetOpenRequestDataButton,
    IModalWidgetReturnData,
    ModalButtonID,
} from "./interfaces/ModalWidgetActions";
import { ISetModalButtonEnabledActionRequestData } from "./interfaces/SetModalButtonEnabledAction";
import { ISendEventFromWidgetRequestData, ISendEventFromWidgetResponseData } from "./interfaces/SendEventAction";
import { EventDirection, WidgetEventCapability } from "./models/WidgetEventCapability";
import { INavigateActionRequestData } from "./interfaces/NavigateAction";
import { IReadEventFromWidgetRequestData, IReadEventFromWidgetResponseData } from "./interfaces/ReadEventAction";
import { Symbols } from "./Symbols";

/**
 * API handler for widgets. This raises events for each action
 * received as `action:${action}` (eg: "action:screenshot").
 * Default handling can be prevented by using preventDefault()
 * on the raised event. The default handling varies for each
 * action: ones which the SDK can handle safely are acknowledged
 * appropriately and ones which are unhandled (custom or require
 * the widget to do something) are rejected with an error.
 *
 * Events which are preventDefault()ed must reply using the
 * transport. The events raised will have a detail of an
 * IWidgetApiRequest interface.
 *
 * When the WidgetApi is ready to start sending requests, it will
 * raise a "ready" CustomEvent. After the ready event fires, actions
 * can be sent and the transport will be ready.
 */
export class WidgetApi extends EventEmitter {
    public readonly transport: ITransport;

    private capabilitiesFinished = false;
    private supportsMSC2974Renegotiate = false;
    private requestedCapabilities: Capability[] = [];
    private approvedCapabilities: Capability[];
    private cachedClientVersions: ApiVersion[];

    /**
     * Creates a new API handler for the given widget.
     * @param {string} widgetId The widget ID to listen for. If not supplied then
     * the API will use the widget ID from the first valid request it receives.
     * @param {string} clientOrigin The origin of the client, or null if not known.
     */
    public constructor(widgetId: string = null, private clientOrigin: string = null) {
        super();
        if (!window.parent) {
            throw new Error("No parent window. This widget doesn't appear to be embedded properly.");
        }
        this.transport = new PostmessageTransport(
            WidgetApiDirection.FromWidget,
            widgetId,
            window.parent,
            window,
        );
        this.transport.targetOrigin = clientOrigin;
        this.transport.on("message", this.handleMessage.bind(this));
    }

    /**
     * Determines if the widget was granted a particular capability. Note that on
     * clients where the capabilities are not fed back to the widget this function
     * will rely on requested capabilities instead.
     * @param {Capability} capability The capability to check for approval of.
     * @returns {boolean} True if the widget has approval for the given capability.
     */
    public hasCapability(capability: Capability): boolean {
        if (Array.isArray(this.approvedCapabilities)) {
            return this.approvedCapabilities.includes(capability);
        }
        return this.requestedCapabilities.includes(capability);
    }

    /**
     * Request a capability from the client. It is not guaranteed to be allowed,
     * but will be asked for.
     * @param {Capability} capability The capability to request.
     * @throws Throws if the capabilities negotiation has already started and the
     * widget is unable to request additional capabilities.
     */
    public requestCapability(capability: Capability) {
        if (this.capabilitiesFinished && !this.supportsMSC2974Renegotiate) {
            throw new Error("Capabilities have already been negotiated");
        }

        this.requestedCapabilities.push(capability);
    }

    /**
     * Request capabilities from the client. They are not guaranteed to be allowed,
     * but will be asked for if the negotiation has not already happened.
     * @param {Capability[]} capabilities The capabilities to request.
     * @throws Throws if the capabilities negotiation has already started.
     */
    public requestCapabilities(capabilities: Capability[]) {
        capabilities.forEach(cap => this.requestCapability(cap));
    }

    /**
     * Requests the capability to interact with rooms other than the user's currently
     * viewed room. Applies to event receiving and sending.
     * @param {string | Symbols.AnyRoom} roomId The room ID, or `Symbols.AnyRoom` to
     * denote all known rooms.
     */
    public requestCapabilityForRoomTimeline(roomId: string | Symbols.AnyRoom) {
        this.requestCapability(`org.matrix.msc2762.timeline:${roomId}`);
    }

    /**
     * Requests the capability to send a given state event with optional explicit
     * state key. It is not guaranteed to be allowed, but will be asked for if the
     * negotiation has not already happened.
     * @param {string} eventType The state event type to ask for.
     * @param {string} stateKey If specified, the specific state key to request.
     * Otherwise all state keys will be requested.
     */
    public requestCapabilityToSendState(eventType: string, stateKey?: string) {
        this.requestCapability(WidgetEventCapability.forStateEvent(EventDirection.Send, eventType, stateKey).raw);
    }

    /**
     * Requests the capability to receive a given state event with optional explicit
     * state key. It is not guaranteed to be allowed, but will be asked for if the
     * negotiation has not already happened.
     * @param {string} eventType The state event type to ask for.
     * @param {string} stateKey If specified, the specific state key to request.
     * Otherwise all state keys will be requested.
     */
    public requestCapabilityToReceiveState(eventType: string, stateKey?: string) {
        this.requestCapability(WidgetEventCapability.forStateEvent(EventDirection.Receive, eventType, stateKey).raw);
    }

    /**
     * Requests the capability to send a given room event. It is not guaranteed to be
     * allowed, but will be asked for if the negotiation has not already happened.
     * @param {string} eventType The room event type to ask for.
     */
    public requestCapabilityToSendEvent(eventType: string) {
        this.requestCapability(WidgetEventCapability.forRoomEvent(EventDirection.Send, eventType).raw);
    }

    /**
     * Requests the capability to receive a given room event. It is not guaranteed to be
     * allowed, but will be asked for if the negotiation has not already happened.
     * @param {string} eventType The room event type to ask for.
     */
    public requestCapabilityToReceiveEvent(eventType: string) {
        this.requestCapability(WidgetEventCapability.forRoomEvent(EventDirection.Receive, eventType).raw);
    }

    /**
     * Requests the capability to send a given message event with optional explicit
     * `msgtype`. It is not guaranteed to be allowed, but will be asked for if the
     * negotiation has not already happened.
     * @param {string} msgtype If specified, the specific msgtype to request.
     * Otherwise all message types will be requested.
     */
    public requestCapabilityToSendMessage(msgtype?: string) {
        this.requestCapability(WidgetEventCapability.forRoomMessageEvent(EventDirection.Send, msgtype).raw);
    }

    /**
     * Requests the capability to receive a given message event with optional explicit
     * `msgtype`. It is not guaranteed to be allowed, but will be asked for if the
     * negotiation has not already happened.
     * @param {string} msgtype If specified, the specific msgtype to request.
     * Otherwise all message types will be requested.
     */
    public requestCapabilityToReceiveMessage(msgtype?: string) {
        this.requestCapability(WidgetEventCapability.forRoomMessageEvent(EventDirection.Receive, msgtype).raw);
    }

    /**
     * Requests an OpenID Connect token from the client for the currently logged in
     * user. This token can be validated server-side with the federation API. Note
     * that the widget is responsible for validating the token and caching any results
     * it needs.
     * @returns {Promise<IOpenIDCredentials>} Resolves to a token for verification.
     * @throws Throws if the user rejected the request or the request failed.
     */
    public requestOpenIDConnectToken(): Promise<IOpenIDCredentials> {
        return new Promise<IOpenIDCredentials>((resolve, reject) => {
            this.transport.sendComplete<IGetOpenIDActionRequestData, IGetOpenIDActionResponse>(
                WidgetApiFromWidgetAction.GetOpenIDCredentials, {},
            ).then(response => {
                const rdata = response.response;
                if (rdata.state === OpenIDRequestState.Allowed) {
                    resolve(rdata);
                } else if (rdata.state === OpenIDRequestState.Blocked) {
                    reject(new Error("User declined to verify their identity"));
                } else if (rdata.state === OpenIDRequestState.PendingUserConfirmation) {
                    const handlerFn = (ev: CustomEvent<IOpenIDCredentialsActionRequest>) => {
                        ev.preventDefault();
                        const request = ev.detail;
                        if (request.data.original_request_id !== response.requestId) return;
                        if (request.data.state === OpenIDRequestState.Allowed) {
                            resolve(request.data);
                            this.transport.reply(request, <IWidgetApiRequestEmptyData>{}); // ack
                        } else if (request.data.state === OpenIDRequestState.Blocked) {
                            reject(new Error("User declined to verify their identity"));
                            this.transport.reply(request, <IWidgetApiRequestEmptyData>{}); // ack
                        } else {
                            reject(new Error("Invalid state on reply: " + rdata.state));
                            this.transport.reply(request, <IWidgetApiErrorResponseData>{
                                error: {
                                    message: "Invalid state",
                                },
                            });
                        }
                        this.off(`action:${WidgetApiToWidgetAction.OpenIDCredentials}`, handlerFn);
                    };
                    this.on(`action:${WidgetApiToWidgetAction.OpenIDCredentials}`, handlerFn);
                } else {
                    reject(new Error("Invalid state: " + rdata.state));
                }
            }).catch(reject);
        });
    }

    /**
     * Asks the client for additional capabilities. Capabilities can be queued for this
     * request with the requestCapability() functions.
     * @returns {Promise<void>} Resolves when complete. Note that the promise resolves when
     * the capabilities request has gone through, not when the capabilities are approved/denied.
     * Use the WidgetApiToWidgetAction.NotifyCapabilities action to detect changes.
     */
    public updateRequestedCapabilities(): Promise<void> {
        return this.transport.send(WidgetApiFromWidgetAction.MSC2974RenegotiateCapabilities,
            <IRenegotiateCapabilitiesRequestData>{
                capabilities: this.requestedCapabilities,
            }).then();
    }

    /**
     * Tell the client that the content has been loaded.
     * @returns {Promise} Resolves when the client acknowledges the request.
     */
    public sendContentLoaded(): Promise<void> {
        return this.transport.send(WidgetApiFromWidgetAction.ContentLoaded, <IWidgetApiRequestEmptyData>{}).then();
    }

    /**
     * Sends a sticker to the client.
     * @param {IStickerActionRequestData} sticker The sticker to send.
     * @returns {Promise} Resolves when the client acknowledges the request.
     */
    public sendSticker(sticker: IStickerActionRequestData): Promise<void> {
        return this.transport.send(WidgetApiFromWidgetAction.SendSticker, sticker).then();
    }

    /**
     * Asks the client to set the always-on-screen status for this widget.
     * @param {boolean} value The new state to request.
     * @returns {Promise<boolean>} Resolve with true if the client was able to fulfill
     * the request, resolves to false otherwise. Rejects if an error occurred.
     */
    public setAlwaysOnScreen(value: boolean): Promise<boolean> {
        return this.transport.send<IStickyActionRequestData, IStickyActionResponseData>(
            WidgetApiFromWidgetAction.UpdateAlwaysOnScreen, {value},
        ).then(res => res.success);
    }

    /**
     * Opens a modal widget.
     * @param {string} url The URL to the modal widget.
     * @param {string} name The name of the widget.
     * @param {IModalWidgetOpenRequestDataButton[]} buttons The buttons to have on the widget.
     * @param {IModalWidgetCreateData} data Data to supply to the modal widget.
     * @param {WidgetType} type The type of modal widget.
     * @returns {Promise<void>} Resolves when the modal widget has been opened.
     */
    public openModalWidget(
        url: string,
        name: string,
        buttons: IModalWidgetOpenRequestDataButton[] = [],
        data: IModalWidgetCreateData = {},
        type: WidgetType = MatrixWidgetType.Custom,
    ): Promise<void> {
        return this.transport.send<IModalWidgetOpenRequestData>(
            WidgetApiFromWidgetAction.OpenModalWidget, { type, url, name, buttons, data },
        ).then();
    }

    /**
     * Closes the modal widget. The widget's session will be terminated shortly after.
     * @param {IModalWidgetReturnData} data Optional data to close the modal widget with.
     * @returns {Promise<void>} Resolves when complete.
     */
    public closeModalWidget(data: IModalWidgetReturnData = {}): Promise<void> {
        return this.transport.send<IModalWidgetReturnData>(WidgetApiFromWidgetAction.CloseModalWidget, data).then();
    }

    public sendRoomEvent(
        eventType: string,
        content: unknown,
        roomId?: string,
    ): Promise<ISendEventFromWidgetResponseData> {
        return this.transport.send<ISendEventFromWidgetRequestData, ISendEventFromWidgetResponseData>(
            WidgetApiFromWidgetAction.SendEvent,
            {type: eventType, content, room_id: roomId},
        );
    }

    public sendStateEvent(
        eventType: string,
        stateKey: string,
        content: unknown,
        roomId?: string,
    ): Promise<ISendEventFromWidgetResponseData> {
        return this.transport.send<ISendEventFromWidgetRequestData, ISendEventFromWidgetResponseData>(
            WidgetApiFromWidgetAction.SendEvent,
            {type: eventType, content, state_key: stateKey, room_id: roomId},
        );
    }

    public readRoomEvents(
        eventType: string,
        limit = 25,
        msgtype?: string,
        roomIds?: (string | Symbols.AnyRoom)[],
    ): Promise<unknown> {
        const data: IReadEventFromWidgetRequestData = {type: eventType, msgtype: msgtype, limit};
        if (roomIds) {
            if (roomIds.includes(Symbols.AnyRoom)) {
                data.room_ids = Symbols.AnyRoom;
            } else {
                data.room_ids = roomIds;
            }
        }
        return this.transport.send<IReadEventFromWidgetRequestData, IReadEventFromWidgetResponseData>(
            WidgetApiFromWidgetAction.MSC2876ReadEvents,
            data,
        ).then(r => r.events);
    }

    public readStateEvents(
        eventType: string,
        limit = 25,
        stateKey?: string,
        roomIds?: (string | Symbols.AnyRoom)[],
    ): Promise<unknown> {
        const data: IReadEventFromWidgetRequestData = {
            type: eventType,
            state_key: stateKey === undefined ? true : stateKey,
            limit,
        };
        if (roomIds) {
            if (roomIds.includes(Symbols.AnyRoom)) {
                data.room_ids = Symbols.AnyRoom;
            } else {
                data.room_ids = roomIds;
            }
        }
        return this.transport.send<IReadEventFromWidgetRequestData, IReadEventFromWidgetResponseData>(
            WidgetApiFromWidgetAction.MSC2876ReadEvents,
            data,
        ).then(r => r.events);
    }

    /**
     * Sets a button as disabled or enabled on the modal widget. Buttons are enabled by default.
     * @param {ModalButtonID} buttonId The button ID to enable/disable.
     * @param {boolean} isEnabled Whether or not the button is enabled.
     * @returns {Promise<void>} Resolves when complete.
     * @throws Throws if the button cannot be disabled, or the client refuses to disable the button.
     */
    public setModalButtonEnabled(buttonId: ModalButtonID, isEnabled: boolean): Promise<void> {
        if (buttonId === BuiltInModalButtonID.Close) {
            throw new Error("The close button cannot be disabled");
        }
        return this.transport.send<ISetModalButtonEnabledActionRequestData>(
            WidgetApiFromWidgetAction.SetModalButtonEnabled, {button: buttonId, enabled: isEnabled},
        ).then();
    }

    /**
     * Attempts to navigate the client to the given URI. This can only be called with Matrix URIs
     * (currently only matrix.to, but in future a Matrix URI scheme will be defined).
     * @param {string} uri The URI to navigate to.
     * @returns {Promise<void>} Resolves when complete.
     * @throws Throws if the URI is invalid or cannot be processed.
     * @deprecated This currently relies on an unstable MSC (MSC2931).
     */
    public navigateTo(uri: string): Promise<void> {
        if (!uri || !uri.startsWith("https://matrix.to/#")) {
            throw new Error("Invalid matrix.to URI");
        }

        return this.transport.send<INavigateActionRequestData>(
            WidgetApiFromWidgetAction.MSC2931Navigate, {uri},
        ).then();
    }

    /**
     * Starts the communication channel. This should be done early to ensure
     * that messages are not missed. Communication can only be stopped by the client.
     */
    public start() {
        this.transport.start();
        this.getClientVersions().then(v => {
            if (v.includes(UnstableApiVersion.MSC2974)) {
                this.supportsMSC2974Renegotiate = true;
            }
        });
    }

    private handleMessage(ev: CustomEvent<IWidgetApiRequest>) {
        const actionEv = new CustomEvent(`action:${ev.detail.action}`, {
            detail: ev.detail,
            cancelable: true,
        });
        this.emit(`action:${ev.detail.action}`, actionEv);
        if (!actionEv.defaultPrevented) {
            switch (ev.detail.action) {
                case WidgetApiToWidgetAction.SupportedApiVersions:
                    return this.replyVersions(<ISupportedVersionsActionRequest>ev.detail);
                case WidgetApiToWidgetAction.Capabilities:
                    return this.handleCapabilities(<ICapabilitiesActionRequest>ev.detail);
                case WidgetApiToWidgetAction.UpdateVisibility:
                    return this.transport.reply(ev.detail, <IWidgetApiRequestEmptyData>{}); // ack to avoid error spam
                case WidgetApiToWidgetAction.NotifyCapabilities:
                    return this.transport.reply(ev.detail, <IWidgetApiRequestEmptyData>{}); // ack to avoid error spam
                default:
                    return this.transport.reply(ev.detail, <IWidgetApiErrorResponseData>{
                        error: {
                            message: "Unknown or unsupported action: " + ev.detail.action,
                        },
                    });
            }
        }
    }

    private replyVersions(request: ISupportedVersionsActionRequest) {
        this.transport.reply<ISupportedVersionsActionResponseData>(request, {
            supported_versions: CurrentApiVersions,
        });
    }

    private getClientVersions(): Promise<ApiVersion[]> {
        if (Array.isArray(this.cachedClientVersions)) {
            return Promise.resolve(this.cachedClientVersions);
        }

        return this.transport.send<IWidgetApiRequestEmptyData, ISupportedVersionsActionResponseData>(
            WidgetApiFromWidgetAction.SupportedApiVersions, {},
        ).then(r => {
            this.cachedClientVersions = r.supported_versions;
            return r.supported_versions;
        }).catch(e => {
            console.warn("non-fatal error getting supported client versions: ", e);
            return [];
        });
    }

    private handleCapabilities(request: ICapabilitiesActionRequest) {
        if (this.capabilitiesFinished) {
            return this.transport.reply<IWidgetApiErrorResponseData>(request, {
                error: {
                    message: "Capability negotiation already completed",
                },
            });
        }

        // See if we can expect a capabilities notification or not
        return this.getClientVersions().then(v => {
            if (v.includes(UnstableApiVersion.MSC2871)) {
                this.once(
                    `action:${WidgetApiToWidgetAction.NotifyCapabilities}`,
                    (ev: CustomEvent<INotifyCapabilitiesActionRequest>) => {
                        this.approvedCapabilities = ev.detail.data.approved;
                        this.emit("ready");
                    },
                );
            } else {
                // if we can't expect notification, we're as done as we can be
                this.emit("ready");
            }

            // in either case, reply to that capabilities request
            this.capabilitiesFinished = true;
            return this.transport.reply<ICapabilitiesActionResponseData>(request, {
                capabilities: this.requestedCapabilities,
            });
        });
    }
}
