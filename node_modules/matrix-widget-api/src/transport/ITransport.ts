/*
 * Copyright 2020 The Matrix.org Foundation C.I.C.
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
import {
    IWidgetApiAcknowledgeResponseData,
    IWidgetApiRequest,
    IWidgetApiRequestData,
    IWidgetApiResponse,
    IWidgetApiResponseData,
    WidgetApiAction,
} from "..";

/**
 * A transport for widget requests/responses. All actions
 * get raised through a "message" CustomEvent with detail
 * of the IWidgetApiRequest.
 */
export interface ITransport extends EventEmitter {
    /**
     * True if the transport is ready to start sending, false otherwise.
     */
    readonly ready: boolean;

    /**
     * The widget ID, if known. If not known, null.
     */
    readonly widgetId: string;

    /**
     * If true, the transport will refuse requests from origins other than the
     * widget's current origin. This is intended to be used only by widgets which
     * need excess security.
     */
    strictOriginCheck: boolean;

    /**
     * The origin the transport should be replying/sending to. If not known, leave
     * null.
     */
    targetOrigin: string;

    /**
     * The number of seconds an outbound request is allowed to take before it
     * times out.
     */
    timeoutSeconds: number;

    /**
     * Starts the transport for listening
     */
    start();

    /**
     * Stops the transport. It cannot be re-started.
     */
    stop();

    /**
     * Sends a request to the remote end.
     * @param {WidgetApiAction} action The action to send.
     * @param {IWidgetApiRequestData} data The request data.
     * @returns {Promise<IWidgetApiResponseData>} A promise which resolves
     * to the remote end's response, or throws with an Error if the request
     * failed.
     */
    send<T extends IWidgetApiRequestData, R extends IWidgetApiResponseData = IWidgetApiAcknowledgeResponseData>(
        action: WidgetApiAction,
        data: T
    ): Promise<R>;

    /**
     * Sends a request to the remote end. This is similar to the send() function
     * however this version returns the full response rather than just the response
     * data.
     * @param {WidgetApiAction} action The action to send.
     * @param {IWidgetApiRequestData} data The request data.
     * @returns {Promise<IWidgetApiResponseData>} A promise which resolves
     * to the remote end's response, or throws with an Error if the request
     * failed.
     */
    sendComplete<T extends IWidgetApiRequestData, R extends IWidgetApiResponse>(action: WidgetApiAction, data: T)
        : Promise<R>;

    /**
     * Replies to a request.
     * @param {IWidgetApiRequest} request The request to reply to.
     * @param {IWidgetApiResponseData} responseData The response data to reply with.
     */
    reply<T extends IWidgetApiResponseData>(request: IWidgetApiRequest, responseData: T);
}
