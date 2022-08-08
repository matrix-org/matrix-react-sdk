import { IWidgetApiRequest, IWidgetApiRequestData } from "./IWidgetApiRequest";
import { WidgetApiFromWidgetAction } from "./WidgetApiAction";
import { IWidgetApiResponseData } from "./IWidgetApiResponse";
export declare enum OpenIDRequestState {
    Allowed = "allowed",
    Blocked = "blocked",
    PendingUserConfirmation = "request"
}
export interface IOpenIDCredentials {
    access_token?: string;
    expires_in?: number;
    matrix_server_name?: string;
    token_type?: "Bearer" | string;
}
export interface IGetOpenIDActionRequestData extends IWidgetApiRequestData {
}
export interface IGetOpenIDActionRequest extends IWidgetApiRequest {
    action: WidgetApiFromWidgetAction.GetOpenIDCredentials;
    data: IGetOpenIDActionRequestData;
}
export interface IGetOpenIDActionResponseData extends IWidgetApiResponseData, IOpenIDCredentials {
    state: OpenIDRequestState;
}
export interface IGetOpenIDActionResponse extends IGetOpenIDActionRequest {
    response: IGetOpenIDActionResponseData;
}
