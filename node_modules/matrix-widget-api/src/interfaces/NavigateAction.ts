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

import { IWidgetApiRequest, IWidgetApiRequestData } from "./IWidgetApiRequest";
import { WidgetApiFromWidgetAction } from "./WidgetApiAction";
import { IWidgetApiAcknowledgeResponseData } from "./IWidgetApiResponse";

export interface INavigateActionRequest extends IWidgetApiRequest {
    action: WidgetApiFromWidgetAction.MSC2931Navigate;
    data: INavigateActionRequestData;
}

export interface INavigateActionRequestData extends IWidgetApiRequestData {
    uri: string;
}

export interface INavigateActionResponse extends INavigateActionRequest {
    response: IWidgetApiAcknowledgeResponseData;
}
