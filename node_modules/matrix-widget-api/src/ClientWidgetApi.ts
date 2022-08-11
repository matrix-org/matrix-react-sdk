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
import { ITransport } from "./transport/ITransport";
import { Widget } from "./models/Widget";
import { PostmessageTransport } from "./transport/PostmessageTransport";
import { WidgetApiDirection } from "./interfaces/WidgetApiDirection";
import { IWidgetApiRequest, IWidgetApiRequestEmptyData } from "./interfaces/IWidgetApiRequest";
import { IContentLoadedActionRequest } from "./interfaces/ContentLoadedAction";
import { WidgetApiFromWidgetAction, WidgetApiToWidgetAction } from "./interfaces/WidgetApiAction";
import { IWidgetApiErrorResponseData } from "./interfaces/IWidgetApiErrorResponse";
import { Capability, MatrixCapabilities } from "./interfaces/Capabilities";
import { IOpenIDUpdate, ISendEventDetails, WidgetDriver } from "./driver/WidgetDriver";
import {
    ICapabilitiesActionResponseData,
    INotifyCapabilitiesActionRequestData,
    IRenegotiateCapabilitiesActionRequest,
} from "./interfaces/CapabilitiesAction";
import {
    ISupportedVersionsActionRequest,
    ISupportedVersionsActionResponseData,
} from "./interfaces/SupportedVersionsAction";
import { CurrentApiVersions } from "./interfaces/ApiVersion";
import { IScreenshotActionResponseData } from "./interfaces/ScreenshotAction";
import { IVisibilityActionRequestData } from "./interfaces/VisibilityAction";
import { IWidgetApiAcknowledgeResponseData, IWidgetApiResponseData } from "./interfaces/IWidgetApiResponse";
import {
    IModalWidgetButtonClickedRequestData,
    IModalWidgetOpenRequestData,
    IModalWidgetOpenRequestDataButton,
    IModalWidgetReturnData,
} from "./interfaces/ModalWidgetActions";
import {
    ISendEventFromWidgetActionRequest,
    ISendEventFromWidgetResponseData,
    ISendEventToWidgetRequestData,
} from "./interfaces/SendEventAction";
import {
    ISendToDeviceFromWidgetActionRequest,
    ISendToDeviceFromWidgetResponseData,
    ISendToDeviceToWidgetRequestData,
} from "./interfaces/SendToDeviceAction";
import { EventDirection, WidgetEventCapability } from "./models/WidgetEventCapability";
import { IRoomEvent } from "./interfaces/IRoomEvent";
import {
    IGetOpenIDActionRequest,
    IGetOpenIDActionResponseData,
    IOpenIDCredentials,
    OpenIDRequestState,
} from "./interfaces/GetOpenIDAction";
import { SimpleObservable } from "./util/SimpleObservable";
import { IOpenIDCredentialsActionRequestData } from "./interfaces/OpenIDCredentialsAction";
import { INavigateActionRequest } from "./interfaces/NavigateAction";
import { IReadEventFromWidgetActionRequest, IReadEventFromWidgetResponseData } from "./interfaces/ReadEventAction";
import {
    ITurnServer,
    IWatchTurnServersRequest,
    IUnwatchTurnServersRequest,
    IUpdateTurnServersRequestData,
} from "./interfaces/TurnServerActions";
import { Symbols } from "./Symbols";

/**
 * API handler for the client side of widgets. This raises events
 * for each action received as `action:${action}` (eg: "action:screenshot").
 * Default handling can be prevented by using preventDefault() on the
 * raised event. The default handling varies for each action: ones
 * which the SDK can handle safely are acknowledged appropriately and
 * ones which are unhandled (custom or require the client to do something)
 * are rejected with an error.
 *
 * Events which are preventDefault()ed must reply using the transport.
 * The events raised will have a default of an IWidgetApiRequest
 * interface.
 *
 * When the ClientWidgetApi is ready to start sending requests, it will
 * raise a "ready" CustomEvent. After the ready event fires, actions can
 * be sent and the transport will be ready.
 *
 * When the widget has indicated it has loaded, this class raises a
 * "preparing" CustomEvent. The preparing event does not indicate that
 * the widget is ready to receive communications - that is signified by
 * the ready event exclusively.
 *
 * This class only handles one widget at a time.
 */
export class ClientWidgetApi extends EventEmitter {
    public readonly transport: ITransport;

    // contentLoadedActionSent is used to check that only one ContentLoaded request is send.
    private contentLoadedActionSent = false;
    private allowedCapabilities = new Set<Capability>();
    private allowedEvents: WidgetEventCapability[] = [];
    private isStopped = false;
    private turnServers: AsyncGenerator<ITurnServer> | null = null;

    /**
     * Creates a new client widget API. This will instantiate the transport
     * and start everything. When the iframe is loaded under the widget's
     * conditions, a "ready" event will be raised.
     * @param {Widget} widget The widget to communicate with.
     * @param {HTMLIFrameElement} iframe The iframe the widget is in.
     * @param {WidgetDriver} driver The driver for this widget/client.
     */
    public constructor(
        public readonly widget: Widget,
        private iframe: HTMLIFrameElement,
        private driver: WidgetDriver,
    ) {
        super();
        if (!iframe?.contentWindow) {
            throw new Error("No iframe supplied");
        }
        if (!widget) {
            throw new Error("Invalid widget");
        }
        if (!driver) {
            throw new Error("Invalid driver");
        }
        this.transport = new PostmessageTransport(
            WidgetApiDirection.ToWidget,
            widget.id,
            iframe.contentWindow,
            window,
        );
        this.transport.targetOrigin = widget.origin;
        this.transport.on("message", this.handleMessage.bind(this));

        iframe.addEventListener("load", this.onIframeLoad.bind(this));

        this.transport.start();
    }

    public hasCapability(capability: Capability): boolean {
        return this.allowedCapabilities.has(capability);
    }

    public canUseRoomTimeline(roomId: string | Symbols.AnyRoom): boolean {
        return this.hasCapability(`org.matrix.msc2762.timeline:${Symbols.AnyRoom}`)
            || this.hasCapability(`org.matrix.msc2762.timeline:${roomId}`);
    }

    public canSendRoomEvent(eventType: string, msgtype: string = null): boolean {
        return this.allowedEvents.some(e => e.matchesAsRoomEvent(EventDirection.Send, eventType, msgtype));
    }

    public canSendStateEvent(eventType: string, stateKey: string): boolean {
        return this.allowedEvents.some(e => e.matchesAsStateEvent(EventDirection.Send, eventType, stateKey));
    }

    public canSendToDeviceEvent(eventType: string): boolean {
        return this.allowedEvents.some(e => e.matchesAsToDeviceEvent(EventDirection.Send, eventType));
    }

    public canReceiveRoomEvent(eventType: string, msgtype: string = null): boolean {
        return this.allowedEvents.some(e => e.matchesAsRoomEvent(EventDirection.Receive, eventType, msgtype));
    }

    public canReceiveStateEvent(eventType: string, stateKey: string): boolean {
        return this.allowedEvents.some(e => e.matchesAsStateEvent(EventDirection.Receive, eventType, stateKey));
    }

    public canReceiveToDeviceEvent(eventType: string): boolean {
        return this.allowedEvents.some(e => e.matchesAsToDeviceEvent(EventDirection.Receive, eventType));
    }

    public stop() {
        this.isStopped = true;
        this.transport.stop();
    }

    private beginCapabilities() {
        // widget has loaded - tell all the listeners that
        this.emit("preparing");

        let requestedCaps: Capability[];
        this.transport.send<IWidgetApiRequestEmptyData, ICapabilitiesActionResponseData>(
            WidgetApiToWidgetAction.Capabilities, {},
        ).then(caps => {
            requestedCaps = caps.capabilities;
            return this.driver.validateCapabilities(new Set(caps.capabilities));
        }).then(allowedCaps => {
            console.log(`Widget ${this.widget.id} is allowed capabilities:`, Array.from(allowedCaps));
            this.allowedCapabilities = allowedCaps;
            this.allowedEvents = WidgetEventCapability.findEventCapabilities(allowedCaps);
            this.notifyCapabilities(requestedCaps);
            this.emit("ready");
        });
    }

    private notifyCapabilities(requested: Capability[]) {
        this.transport.send(WidgetApiToWidgetAction.NotifyCapabilities, <INotifyCapabilitiesActionRequestData>{
            requested: requested,
            approved: Array.from(this.allowedCapabilities),
        }).catch(e => {
            console.warn("non-fatal error notifying widget of approved capabilities:", e);
        }).then(() => {
            this.emit("capabilitiesNotified")
        });
    }

    private onIframeLoad(ev: Event) {
        if (this.widget.waitForIframeLoad) {
            // If the widget is set to waitForIframeLoad the capabilities immediatly get setup after load.
            // The client does not wait for the ContentLoaded action.
            this.beginCapabilities();
        } else {
            // Reaching this means, that the Iframe got reloaded/loaded and
            // the clientApi is awaiting the FIRST ContentLoaded action.
            this.contentLoadedActionSent = false;
        }
    }

    private handleContentLoadedAction(action: IContentLoadedActionRequest) {
        if (this.contentLoadedActionSent) {
            throw new Error("Improper sequence: ContentLoaded Action can only be send once after the widget loaded "
                            +"and should only be used if waitForIframeLoad is false (default=true)");
        }
        if (this.widget.waitForIframeLoad) {
            this.transport.reply(action, <IWidgetApiErrorResponseData>{
                error: {
                    message: "Improper sequence: not expecting ContentLoaded event if "
                    +"waitForIframLoad is true (default=true)",
                },
            });
        } else {
            this.transport.reply(action, <IWidgetApiRequestEmptyData>{});
            this.beginCapabilities();
        }
        this.contentLoadedActionSent = true;
    }

    private replyVersions(request: ISupportedVersionsActionRequest) {
        this.transport.reply<ISupportedVersionsActionResponseData>(request, {
            supported_versions: CurrentApiVersions,
        });
    }

    private handleCapabilitiesRenegotiate(request: IRenegotiateCapabilitiesActionRequest) {
        // acknowledge first
        this.transport.reply<IWidgetApiAcknowledgeResponseData>(request, {});

        const requested = request.data?.capabilities || [];
        const newlyRequested = new Set(requested.filter(r => !this.hasCapability(r)));
        if (newlyRequested.size === 0) {
            // Nothing to do - notify capabilities
            return this.notifyCapabilities([]);
        }

        this.driver.validateCapabilities(newlyRequested).then(allowed => {
            allowed.forEach(c => this.allowedCapabilities.add(c));

            const allowedEvents = WidgetEventCapability.findEventCapabilities(allowed);
            allowedEvents.forEach(c => this.allowedEvents.push(c));

            return this.notifyCapabilities(Array.from(newlyRequested));
        });
    }

    private handleNavigate(request: INavigateActionRequest) {
        if (!this.hasCapability(MatrixCapabilities.MSC2931Navigate)) {
            return this.transport.reply<IWidgetApiErrorResponseData>(request, {
                error: {message: "Missing capability"},
            });
        }

        if (!request.data?.uri || !request.data?.uri.toString().startsWith("https://matrix.to/#")) {
            return this.transport.reply<IWidgetApiErrorResponseData>(request, {
                error: {message: "Invalid matrix.to URI"},
            });
        }

        const onErr = (e) => {
            console.error("[ClientWidgetApi] Failed to handle navigation: ", e);
            return this.transport.reply<IWidgetApiErrorResponseData>(request, {
                error: {message: "Error handling navigation"},
            });
        };

        try {
            this.driver.navigate(request.data.uri.toString()).catch(e => onErr(e)).then(() => {
                return this.transport.reply<IWidgetApiAcknowledgeResponseData>(request, {});
            });
        } catch (e) {
            return onErr(e);
        }
    }

    private handleOIDC(request: IGetOpenIDActionRequest) {
        let phase = 1; // 1 = initial request, 2 = after user manual confirmation

        const replyState = (state: OpenIDRequestState, credential?: IOpenIDCredentials) => {
            credential = credential || {};
            if (phase > 1) {
                return this.transport.send<IOpenIDCredentialsActionRequestData>(
                    WidgetApiToWidgetAction.OpenIDCredentials,
                    {
                        state: state,
                        original_request_id: request.requestId,
                        ...credential,
                    },
                );
            } else {
                return this.transport.reply<IGetOpenIDActionResponseData>(request, {
                    state: state,
                    ...credential,
                });
            }
        };

        const replyError = (msg: string) => {
            console.error("[ClientWidgetApi] Failed to handle OIDC: ", msg);
            if (phase > 1) {
                // We don't have a way to indicate that a random error happened in this flow, so
                // just block the attempt.
                return replyState(OpenIDRequestState.Blocked);
            } else {
                return this.transport.reply<IWidgetApiErrorResponseData>(request, {
                    error: {message: msg},
                });
            }
        };

        const observer = new SimpleObservable<IOpenIDUpdate>(update => {
            if (update.state === OpenIDRequestState.PendingUserConfirmation && phase > 1) {
                observer.close();
                return replyError("client provided out-of-phase response to OIDC flow");
            }

            if (update.state === OpenIDRequestState.PendingUserConfirmation) {
                replyState(update.state);
                phase++;
                return;
            }

            if (update.state === OpenIDRequestState.Allowed && !update.token) {
                return replyError("client provided invalid OIDC token for an allowed request");
            }
            if (update.state === OpenIDRequestState.Blocked) {
                update.token = null; // just in case the client did something weird
            }

            observer.close();
            return replyState(update.state, update.token);
        });

        this.driver.askOpenID(observer);
    }

    private handleReadEvents(request: IReadEventFromWidgetActionRequest) {
        if (!request.data.type) {
            return this.transport.reply<IWidgetApiErrorResponseData>(request, {
                error: {message: "Invalid request - missing event type"},
            });
        }
        if (request.data.limit !== undefined && (!request.data.limit || request.data.limit < 0)) {
            return this.transport.reply<IWidgetApiErrorResponseData>(request, {
                error: {message: "Invalid request - limit out of range"},
            });
        }

        let askRoomIds: string[] = null; // null denotes current room only
        if (request.data.room_ids) {
            askRoomIds = request.data.room_ids as string[];
            if (!Array.isArray(askRoomIds)) {
                askRoomIds = [askRoomIds as any as string];
            }
            for (const roomId of askRoomIds) {
                if (!this.canUseRoomTimeline(roomId)) {
                    return this.transport.reply<IWidgetApiErrorResponseData>(request, {
                        error: {message: `Unable to access room timeline: ${roomId}`},
                    });
                }
            }
        }

        const limit = request.data.limit || 0;

        let events: Promise<IRoomEvent[]> = Promise.resolve([]);
        if (request.data.state_key !== undefined) {
            const stateKey = request.data.state_key === true ? undefined : request.data.state_key.toString();
            if (!this.canReceiveStateEvent(request.data.type, stateKey)) {
                return this.transport.reply<IWidgetApiErrorResponseData>(request, {
                    error: {message: "Cannot read state events of this type"},
                });
            }
            events = this.driver.readStateEvents(request.data.type, stateKey, limit, askRoomIds);
        } else {
            if (!this.canReceiveRoomEvent(request.data.type, request.data.msgtype)) {
                return this.transport.reply<IWidgetApiErrorResponseData>(request, {
                    error: {message: "Cannot read room events of this type"},
                });
            }
            events = this.driver.readRoomEvents(request.data.type, request.data.msgtype, limit, askRoomIds);
        }

        return events.then(evs => this.transport.reply<IReadEventFromWidgetResponseData>(request, {events: evs}));
    }

    private handleSendEvent(request: ISendEventFromWidgetActionRequest) {
        if (!request.data.type) {
            return this.transport.reply<IWidgetApiErrorResponseData>(request, {
                error: {message: "Invalid request - missing event type"},
            });
        }

        if (!!request.data.room_id && !this.canUseRoomTimeline(request.data.room_id)) {
            return this.transport.reply<IWidgetApiErrorResponseData>(request, {
                error: {message: `Unable to access room timeline: ${request.data.room_id}`},
            });
        }

        const isState = request.data.state_key !== null && request.data.state_key !== undefined;
        let sendEventPromise: Promise<ISendEventDetails>;
        if (isState) {
            if (!this.canSendStateEvent(request.data.type, request.data.state_key)) {
                return this.transport.reply<IWidgetApiErrorResponseData>(request, {
                    error: {message: "Cannot send state events of this type"},
                });
            }

            sendEventPromise = this.driver.sendEvent(
                request.data.type,
                request.data.content || {},
                request.data.state_key,
                request.data.room_id,
            );
        } else {
            const content = request.data.content || {};
            const msgtype = content['msgtype'];
            if (!this.canSendRoomEvent(request.data.type, msgtype)) {
                return this.transport.reply<IWidgetApiErrorResponseData>(request, {
                    error: {message: "Cannot send room events of this type"},
                });
            }

            sendEventPromise = this.driver.sendEvent(
                request.data.type,
                content,
                null, // not sending a state event
                request.data.room_id,
            );
        }

        sendEventPromise.then(sentEvent => {
            return this.transport.reply<ISendEventFromWidgetResponseData>(request, {
                room_id: sentEvent.roomId,
                event_id: sentEvent.eventId,
            });
        }).catch(e => {
            console.error("error sending event: ", e);
            return this.transport.reply<IWidgetApiErrorResponseData>(request, {
                error: {message: "Error sending event"},
            });
        });
    }

    private async handleSendToDevice(request: ISendToDeviceFromWidgetActionRequest): Promise<void> {
        if (!request.data.type) {
            await this.transport.reply<IWidgetApiErrorResponseData>(request, {
                error: {message: "Invalid request - missing event type"},
            });
        } else if (!request.data.messages) {
            await this.transport.reply<IWidgetApiErrorResponseData>(request, {
                error: {message: "Invalid request - missing event contents"},
            });
        } else if (typeof request.data.encrypted !== "boolean") {
            await this.transport.reply<IWidgetApiErrorResponseData>(request, {
                error: {message: "Invalid request - missing encryption flag"},
            });
        } else if (!this.canSendToDeviceEvent(request.data.type)) {
            await this.transport.reply<IWidgetApiErrorResponseData>(request, {
                error: {message: "Cannot send to-device events of this type"},
            });
        } else {
            try {
                await this.driver.sendToDevice(request.data.type, request.data.encrypted, request.data.messages);
                await this.transport.reply<ISendToDeviceFromWidgetResponseData>(request, {});
            } catch (e) {
                console.error("error sending to-device event", e);
                await this.transport.reply<IWidgetApiErrorResponseData>(request, {
                    error: {message: "Error sending event"},
                });
            }
        }
    }

    private async pollTurnServers(turnServers: AsyncGenerator<ITurnServer>, initialServer: ITurnServer) {
        try {
            await this.transport.send<IUpdateTurnServersRequestData>(
                WidgetApiToWidgetAction.UpdateTurnServers,
                initialServer as IUpdateTurnServersRequestData, // it's compatible, but missing the index signature
            );

            // Pick the generator up where we left off
            for await (const server of turnServers) {
                await this.transport.send<IUpdateTurnServersRequestData>(
                    WidgetApiToWidgetAction.UpdateTurnServers,
                    server as IUpdateTurnServersRequestData, // it's compatible, but missing the index signature
                );
            }
        } catch (e) {
            console.error("error polling for TURN servers", e);
        }
    }

    private async handleWatchTurnServers(request: IWatchTurnServersRequest): Promise<void> {
        if (!this.hasCapability(MatrixCapabilities.MSC3846TurnServers)) {
            await this.transport.reply<IWidgetApiErrorResponseData>(request, {
                error: {message: "Missing capability"},
            });
        } else if (this.turnServers) {
            // We're already polling, so this is a no-op
            await this.transport.reply<IWidgetApiAcknowledgeResponseData>(request, {});
        } else {
            try {
                const turnServers = this.driver.getTurnServers();

                // Peek at the first result, so we can at least verify that the
                // client isn't banned from getting TURN servers entirely
                const { done, value } = await turnServers.next();
                if (done) throw new Error("Client refuses to provide any TURN servers");
                await this.transport.reply<IWidgetApiAcknowledgeResponseData>(request, {});

                // Start the poll loop, sending the widget the initial result
                this.pollTurnServers(turnServers, value);
                this.turnServers = turnServers;
            } catch (e) {
                console.error("error getting first TURN server results", e);
                await this.transport.reply<IWidgetApiErrorResponseData>(request, {
                    error: {message: "TURN servers not available"},
                });
            }
        }
    }

    private async handleUnwatchTurnServers(request: IUnwatchTurnServersRequest): Promise<void> {
        if (!this.hasCapability(MatrixCapabilities.MSC3846TurnServers)) {
            await this.transport.reply<IWidgetApiErrorResponseData>(request, {
                error: {message: "Missing capability"},
            });
        } else if (!this.turnServers) {
            // We weren't polling anyways, so this is a no-op
            await this.transport.reply<IWidgetApiAcknowledgeResponseData>(request, {});
        } else {
            // Stop the generator, allowing it to clean up
            await this.turnServers.return(undefined);
            this.turnServers = null;
            await this.transport.reply<IWidgetApiAcknowledgeResponseData>(request, {});
        }
    }

    private handleMessage(ev: CustomEvent<IWidgetApiRequest>) {
        if (this.isStopped) return;
        const actionEv = new CustomEvent(`action:${ev.detail.action}`, {
            detail: ev.detail,
            cancelable: true,
        });
        this.emit(`action:${ev.detail.action}`, actionEv);
        if (!actionEv.defaultPrevented) {
            switch (ev.detail.action) {
                case WidgetApiFromWidgetAction.ContentLoaded:
                    return this.handleContentLoadedAction(<IContentLoadedActionRequest>ev.detail);
                case WidgetApiFromWidgetAction.SupportedApiVersions:
                    return this.replyVersions(<ISupportedVersionsActionRequest>ev.detail);
                case WidgetApiFromWidgetAction.SendEvent:
                    return this.handleSendEvent(<ISendEventFromWidgetActionRequest>ev.detail);
                case WidgetApiFromWidgetAction.SendToDevice:
                    return this.handleSendToDevice(<ISendToDeviceFromWidgetActionRequest>ev.detail);
                case WidgetApiFromWidgetAction.GetOpenIDCredentials:
                    return this.handleOIDC(<IGetOpenIDActionRequest>ev.detail);
                case WidgetApiFromWidgetAction.MSC2931Navigate:
                    return this.handleNavigate(<INavigateActionRequest>ev.detail);
                case WidgetApiFromWidgetAction.MSC2974RenegotiateCapabilities:
                    return this.handleCapabilitiesRenegotiate(<IRenegotiateCapabilitiesActionRequest>ev.detail);
                case WidgetApiFromWidgetAction.MSC2876ReadEvents:
                    return this.handleReadEvents(<IReadEventFromWidgetActionRequest>ev.detail);
                case WidgetApiFromWidgetAction.WatchTurnServers:
                    return this.handleWatchTurnServers(<IWatchTurnServersRequest>ev.detail);
                case WidgetApiFromWidgetAction.UnwatchTurnServers:
                    return this.handleUnwatchTurnServers(<IUnwatchTurnServersRequest>ev.detail);
                default:
                    return this.transport.reply(ev.detail, <IWidgetApiErrorResponseData>{
                        error: {
                            message: "Unknown or unsupported action: " + ev.detail.action,
                        },
                    });
            }
        }
    }

    /**
     * Takes a screenshot of the widget.
     * @returns Resolves to the widget's screenshot.
     * @throws Throws if there is a problem.
     */
    public takeScreenshot(): Promise<IScreenshotActionResponseData> {
        return this.transport.send(WidgetApiToWidgetAction.TakeScreenshot, <IWidgetApiRequestEmptyData>{});
    }

    /**
     * Alerts the widget to whether or not it is currently visible.
     * @param {boolean} isVisible Whether the widget is visible or not.
     * @returns {Promise<IWidgetApiResponseData>} Resolves when the widget acknowledges the update.
     */
    public updateVisibility(isVisible: boolean): Promise<IWidgetApiResponseData> {
        return this.transport.send(WidgetApiToWidgetAction.UpdateVisibility, <IVisibilityActionRequestData>{
            visible: isVisible,
        });
    }

    public sendWidgetConfig(data: IModalWidgetOpenRequestData): Promise<void> {
        return this.transport.send<IModalWidgetOpenRequestData>(WidgetApiToWidgetAction.WidgetConfig, data).then();
    }

    public notifyModalWidgetButtonClicked(id: IModalWidgetOpenRequestDataButton["id"]): Promise<void> {
        return this.transport.send<IModalWidgetButtonClickedRequestData>(
            WidgetApiToWidgetAction.ButtonClicked, {id},
        ).then();
    }

    public notifyModalWidgetClose(data: IModalWidgetReturnData): Promise<void> {
        return this.transport.send<IModalWidgetReturnData>(
            WidgetApiToWidgetAction.CloseModalWidget, data,
        ).then();
    }

    /**
     * Feeds an event to the widget. If the widget is not able to accept the event due to
     * permissions, this will no-op and return calmly. If the widget failed to handle the
     * event, this will raise an error.
     * @param {IRoomEvent} rawEvent The event to (try to) send to the widget.
     * @param {string} currentViewedRoomId The room ID the user is currently interacting with.
     * Not the room ID of the event.
     * @returns {Promise<void>} Resolves when complete, rejects if there was an error sending.
     */
    public async feedEvent(rawEvent: IRoomEvent, currentViewedRoomId: string): Promise<void> {
        if (rawEvent.room_id !== currentViewedRoomId && !this.canUseRoomTimeline(rawEvent.room_id)) {
            return; // no-op
        }

        if (rawEvent.state_key !== undefined && rawEvent.state_key !== null) {
            // state event
            if (!this.canReceiveStateEvent(rawEvent.type, rawEvent.state_key)) {
                return; // no-op
            }
        } else {
            // message event
            if (!this.canReceiveRoomEvent(rawEvent.type, rawEvent.content?.["msgtype"])) {
                return; // no-op
            }
        }

        // Feed the event into the widget
        await this.transport.send<ISendEventToWidgetRequestData>(
            WidgetApiToWidgetAction.SendEvent,
            rawEvent as ISendEventToWidgetRequestData, // it's compatible, but missing the index signature
        );
    }

    /**
     * Feeds a to-device event to the widget. If the widget is not able to accept the
     * event due to permissions, this will no-op and return calmly. If the widget failed
     * to handle the event, this will raise an error.
     * @param {IRoomEvent} rawEvent The event to (try to) send to the widget.
     * @param {boolean} encrypted Whether the event contents were encrypted.
     * @returns {Promise<void>} Resolves when complete, rejects if there was an error sending.
     */
    public async feedToDevice(rawEvent: IRoomEvent, encrypted: boolean): Promise<void> {
        if (this.canReceiveToDeviceEvent(rawEvent.type)) {
            await this.transport.send<ISendToDeviceToWidgetRequestData>(
                WidgetApiToWidgetAction.SendToDevice,
                // it's compatible, but missing the index signature
                { ...rawEvent, encrypted } as ISendToDeviceToWidgetRequestData,
            );
        }
    }
}
