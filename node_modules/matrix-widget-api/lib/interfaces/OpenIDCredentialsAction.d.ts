import { IWidgetApiRequest, IWidgetApiRequestData } from "./IWidgetApiRequest";
import { WidgetApiToWidgetAction } from "./WidgetApiAction";
import { IWidgetApiResponseData } from "./IWidgetApiResponse";
import { IOpenIDCredentials, OpenIDRequestState } from "./GetOpenIDAction";
export interface IOpenIDCredentialsActionRequestData extends IWidgetApiRequestData, IOpenIDCredentials {
    state: OpenIDRequestState;
    original_request_id: string;
}
export interface IOpenIDCredentialsActionRequest extends IWidgetApiRequest {
    action: WidgetApiToWidgetAction.OpenIDCredentials;
    data: IOpenIDCredentialsActionRequestData;
}
export interface IOpenIDCredentialsActionResponseData extends IWidgetApiResponseData {
}
export interface IOpenIDCredentialsIDActionResponse extends IOpenIDCredentialsActionRequest {
    response: IOpenIDCredentialsActionResponseData;
}
