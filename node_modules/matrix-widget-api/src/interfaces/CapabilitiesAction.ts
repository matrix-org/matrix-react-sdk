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

import { IWidgetApiRequest, IWidgetApiRequestData, IWidgetApiRequestEmptyData } from "./IWidgetApiRequest";
import { WidgetApiFromWidgetAction, WidgetApiToWidgetAction } from "./WidgetApiAction";
import { Capability } from "./Capabilities";
import { IWidgetApiAcknowledgeResponseData, IWidgetApiResponseData } from "./IWidgetApiResponse";

export interface ICapabilitiesActionRequest extends IWidgetApiRequest {
    action: WidgetApiToWidgetAction.Capabilities;
    data: IWidgetApiRequestEmptyData;
}

export interface ICapabilitiesActionResponseData extends IWidgetApiResponseData {
    capabilities: Capability[];
}

export interface ICapabilitiesActionResponse extends ICapabilitiesActionRequest {
    response: ICapabilitiesActionResponseData;
}

export interface INotifyCapabilitiesActionRequestData extends IWidgetApiRequestData {
    requested: Capability[];
    approved: Capability[];
}

export interface INotifyCapabilitiesActionRequest extends IWidgetApiRequest {
    action: WidgetApiToWidgetAction.NotifyCapabilities;
    data: INotifyCapabilitiesActionRequestData;
}

export interface INotifyCapabilitiesActionResponse extends INotifyCapabilitiesActionRequest {
    response: IWidgetApiAcknowledgeResponseData;
}

export interface IRenegotiateCapabilitiesActionRequest extends IWidgetApiRequest {
    action: WidgetApiFromWidgetAction.MSC2974RenegotiateCapabilities;
    data: IRenegotiateCapabilitiesRequestData;
}

export interface IRenegotiateCapabilitiesRequestData extends IWidgetApiResponseData {
    capabilities: Capability[];
}

export interface IRenegotiateCapabilitiesActionResponse extends IRenegotiateCapabilitiesActionRequest {
    // nothing
}
