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
