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

import { Capability, IOpenIDCredentials, OpenIDRequestState, SimpleObservable } from "..";

export interface ISendEventDetails {
    roomId: string;
    eventId: string;
}

export interface IOpenIDUpdate {
    state: OpenIDRequestState;
    token?: IOpenIDCredentials;
}

/**
 * Represents the functions and behaviour the widget-api is unable to
 * do, such as prompting the user for information or interacting with
 * the UI. Clients are expected to implement this class and override
 * any functions they need/want to support.
 *
 * This class assumes the client will have a context of a Widget
 * instance already.
 */
export abstract class WidgetDriver {
    /**
     * Verifies the widget's requested capabilities, returning the ones
     * it is approved to use. Mutating the requested capabilities will
     * have no effect.
     *
     * This SHOULD result in the user being prompted to approve/deny
     * capabilities.
     *
     * By default this rejects all capabilities (returns an empty set).
     * @param {Set<Capability>} requested The set of requested capabilities.
     * @returns {Promise<Set<Capability>>} Resolves to the allowed capabilities.
     */
    public validateCapabilities(requested: Set<Capability>): Promise<Set<Capability>> {
        return Promise.resolve(new Set());
    }

    /**
     * Sends an event into a room. If `roomId` is falsy, the client should send the event
     * into the room the user is currently looking at. The widget API will have already
     * verified that the widget is capable of sending the event to that room.
     * @param {string} eventType The event type to be sent.
     * @param {*} content The content for the event.
     * @param {string|null} stateKey The state key if this is a state event, otherwise null.
     * May be an empty string.
     * @param {string|null} roomId The room ID to send the event to. If falsy, the room the
     * user is currently looking at.
     * @returns {Promise<ISendEventDetails>} Resolves when the event has been sent with
     * details of that event.
     * @throws Rejected when the event could not be sent.
     */
    public sendEvent(
        eventType: string,
        content: unknown,
        stateKey: string = null,
        roomId: string = null,
    ): Promise<ISendEventDetails> {
        return Promise.reject(new Error("Failed to override function"));
    }

    /**
     * Reads all events of the given type, and optionally `msgtype` (if applicable/defined),
     * the user has access to. The widget API will have already verified that the widget is
     * capable of receiving the events. Less events than the limit are allowed to be returned,
     * but not more. If `roomIds` is supplied, it may contain `Symbols.AnyRoom` to denote that
     * `limit` in each of the client's known rooms should be returned. When `null`, only the
     * room the user is currently looking at should be considered.
     * @param eventType The event type to be read.
     * @param msgtype The msgtype of the events to be read, if applicable/defined.
     * @param limit The maximum number of events to retrieve per room. Will be zero to denote "as many
     * as possible".
     * @param roomIds When null, the user's currently viewed room. Otherwise, the list of room IDs
     * to look within, possibly containing Symbols.AnyRoom to denote all known rooms.
     * @returns {Promise<*[]>} Resolves to the room events, or an empty array.
     */
    public readRoomEvents(
        eventType: string,
        msgtype: string | undefined,
        limit: number,
        roomIds: string[] = null,
    ): Promise<unknown[]> {
        return Promise.resolve([]);
    }

    /**
     * Reads all events of the given type, and optionally state key (if applicable/defined),
     * the user has access to. The widget API will have already verified that the widget is
     * capable of receiving the events. Less events than the limit are allowed to be returned,
     * but not more. If `roomIds` is supplied, it may contain `Symbols.AnyRoom` to denote that
     * `limit` in each of the client's known rooms should be returned. When `null`, only the
     * room the user is currently looking at should be considered.
     * @param eventType The event type to be read.
     * @param stateKey The state key of the events to be read, if applicable/defined.
     * @param limit The maximum number of events to retrieve. Will be zero to denote "as many
     * as possible".
     * @param roomIds When null, the user's currently viewed room. Otherwise, the list of room IDs
     * to look within, possibly containing Symbols.AnyRoom to denote all known rooms.
     * @returns {Promise<*[]>} Resolves to the state events, or an empty array.
     */
    public readStateEvents(
        eventType: string,
        stateKey: string | undefined,
        limit: number,
        roomIds: string[] = null,
    ): Promise<unknown[]> {
        return Promise.resolve([]);
    }

    /**
     * Asks the user for permission to validate their identity through OpenID Connect. The
     * interface for this function is an observable which accepts the state machine of the
     * OIDC exchange flow. For example, if the client/user blocks the request then it would
     * feed back a `{state: Blocked}` into the observable. Similarly, if the user already
     * approved the widget then a `{state: Allowed}` would be fed into the observable alongside
     * the token itself. If the client is asking for permission, it should feed in a
     * `{state: PendingUserConfirmation}` followed by the relevant Allowed or Blocked state.
     *
     * The widget API will reject the widget's request with an error if this contract is not
     * met properly. By default, the widget driver will block all OIDC requests.
     * @param {SimpleObservable<IOpenIDUpdate>} observer The observable to feed updates into.
     */
    public askOpenID(observer: SimpleObservable<IOpenIDUpdate>) {
        observer.update({state: OpenIDRequestState.Blocked});
    }

    /**
     * Navigates the client with a matrix.to URI. In future this function will also be provided
     * with the Matrix URIs once matrix.to is replaced. The given URI will have already been
     * lightly checked to ensure it looks like a valid URI, though the implementation is recommended
     * to do further checks on the URI.
     * @param {string} uri The URI to navigate to.
     * @returns {Promise<void>} Resolves when complete.
     * @throws Throws if there's a problem with the navigation, such as invalid format.
     */
    public navigate(uri: string): Promise<void> {
        throw new Error("Navigation is not implemented");
    }
}
