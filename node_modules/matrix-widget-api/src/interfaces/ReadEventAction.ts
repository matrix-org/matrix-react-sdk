/*
 * Copyright 2021 The Matrix.org Foundation C.I.C.
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
import { WidgetApiFromWidgetAction } from "./WidgetApiAction";
import { IWidgetApiResponseData } from "./IWidgetApiResponse";
import { IRoomEvent } from "./IRoomEvent";
import { Symbols } from "../Symbols";

export interface IReadEventFromWidgetRequestData extends IWidgetApiRequestData {
    state_key?: string | boolean; // eslint-disable-line camelcase
    msgtype?: string;
    type: string;
    limit?: number;
    room_ids?: Symbols.AnyRoom | string[]; // eslint-disable-line camelcase
}

export interface IReadEventFromWidgetActionRequest extends IWidgetApiRequest {
    action: WidgetApiFromWidgetAction.MSC2876ReadEvents;
    data: IReadEventFromWidgetRequestData;
}

export interface IReadEventFromWidgetResponseData extends IWidgetApiResponseData {
    events: IRoomEvent[];
}

export interface IReadEventFromWidgetActionResponse extends IReadEventFromWidgetActionRequest {
    response: IReadEventFromWidgetResponseData;
}
