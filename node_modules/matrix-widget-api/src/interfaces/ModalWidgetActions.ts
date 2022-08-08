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
import { WidgetApiFromWidgetAction, WidgetApiToWidgetAction } from "./WidgetApiAction";
import { IWidgetApiAcknowledgeResponseData, IWidgetApiResponse } from "./IWidgetApiResponse";
import { IWidget } from "./IWidget";
import { ModalButtonKind } from "./ModalButtonKind";

export enum BuiltInModalButtonID {
    Close = "m.close",
}
export type ModalButtonID = BuiltInModalButtonID | string;

export interface IModalWidgetCreateData extends IWidgetApiRequestData {
    [key: string]: unknown;
}

export interface IModalWidgetReturnData {
    [key: string]: unknown;
}

// Types for a normal modal requesting the opening a modal widget
export interface IModalWidgetOpenRequestDataButton {
    id: ModalButtonID;
    label: string;
    kind: ModalButtonKind | string;
    disabled?: boolean;
}

export interface IModalWidgetOpenRequestData extends IModalWidgetCreateData, Omit<IWidget, "id" | "creatorUserId"> {
    buttons?: IModalWidgetOpenRequestDataButton[];
}

export interface IModalWidgetOpenRequest extends IWidgetApiRequest {
    action: WidgetApiFromWidgetAction.OpenModalWidget;
    data: IModalWidgetOpenRequestData;
}

export interface IModalWidgetOpenResponse extends IWidgetApiResponse {
    response: IWidgetApiAcknowledgeResponseData;
}

// Types for a modal widget receiving notifications that its buttons have been pressed
export interface IModalWidgetButtonClickedRequestData extends IWidgetApiRequestData {
    id: IModalWidgetOpenRequestDataButton["id"];
}

export interface IModalWidgetButtonClickedRequest extends IWidgetApiRequest {
    action: WidgetApiToWidgetAction.ButtonClicked;
    data: IModalWidgetButtonClickedRequestData;
}

export interface IModalWidgetButtonClickedResponse extends IWidgetApiResponse {
    response: IWidgetApiAcknowledgeResponseData;
}

// Types for a modal widget requesting close
export interface IModalWidgetCloseRequest extends IWidgetApiRequest {
    action: WidgetApiFromWidgetAction.CloseModalWidget;
    data: IModalWidgetReturnData;
}

export interface IModalWidgetCloseResponse extends IWidgetApiResponse {
    response: IWidgetApiAcknowledgeResponseData;
}

// Types for a normal widget being notified that the modal widget it opened has been closed
export interface IModalWidgetCloseNotificationRequest extends IWidgetApiRequest {
    action: WidgetApiToWidgetAction.CloseModalWidget;
    data: IModalWidgetReturnData;
}

export interface IModalWidgetCloseNotificationResponse extends IWidgetApiResponse {
    response: IWidgetApiAcknowledgeResponseData;
}
