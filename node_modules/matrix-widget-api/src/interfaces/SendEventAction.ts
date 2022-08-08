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

import { IWidgetApiRequest, IWidgetApiRequestData } from "./IWidgetApiRequest";
import { WidgetApiFromWidgetAction, WidgetApiToWidgetAction } from "./WidgetApiAction";
import { IWidgetApiResponseData } from "./IWidgetApiResponse";
import { IRoomEvent } from "./IRoomEvent";

export interface ISendEventFromWidgetRequestData extends IWidgetApiRequestData {
    state_key?: string; // eslint-disable-line camelcase
    type: string;
    content: unknown;
    room_id?: string; // eslint-disable-line camelcase
}

export interface ISendEventFromWidgetActionRequest extends IWidgetApiRequest {
    action: WidgetApiFromWidgetAction.SendEvent;
    data: ISendEventFromWidgetRequestData;
}

export interface ISendEventFromWidgetResponseData extends IWidgetApiResponseData {
    room_id: string; // eslint-disable-line camelcase
    event_id: string; // eslint-disable-line camelcase
}

export interface ISendEventFromWidgetActionResponse extends ISendEventFromWidgetActionRequest {
    response: ISendEventFromWidgetResponseData;
}

export interface ISendEventToWidgetRequestData extends IWidgetApiRequestData, IRoomEvent {
}

export interface ISendEventToWidgetActionRequest extends IWidgetApiRequest {
    action: WidgetApiToWidgetAction.SendEvent;
    data: ISendEventToWidgetRequestData;
}

export interface ISendEventToWidgetResponseData extends IWidgetApiResponseData {
    // nothing
}

export interface ISendEventToWidgetActionResponse extends ISendEventToWidgetActionRequest {
    response: ISendEventToWidgetResponseData;
}
