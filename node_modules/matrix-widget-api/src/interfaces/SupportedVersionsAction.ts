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

import { IWidgetApiRequest, IWidgetApiRequestEmptyData } from "./IWidgetApiRequest";
import { WidgetApiFromWidgetAction, WidgetApiToWidgetAction } from "./WidgetApiAction";
import { ApiVersion } from "./ApiVersion";
import { IWidgetApiResponseData } from "./IWidgetApiResponse";

export interface ISupportedVersionsActionRequest extends IWidgetApiRequest {
    action: WidgetApiFromWidgetAction.SupportedApiVersions | WidgetApiToWidgetAction.SupportedApiVersions;
    data: IWidgetApiRequestEmptyData;
}

export interface ISupportedVersionsActionResponseData extends IWidgetApiResponseData {
    supported_versions: ApiVersion[]; // eslint-disable-line camelcase
}

export interface ISupportedVersionsActionResponse extends ISupportedVersionsActionRequest {
    response: ISupportedVersionsActionResponseData;
}
