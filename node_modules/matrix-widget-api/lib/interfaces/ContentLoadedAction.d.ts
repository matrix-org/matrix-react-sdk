import { IWidgetApiRequest, IWidgetApiRequestEmptyData } from "./IWidgetApiRequest";
import { WidgetApiFromWidgetAction } from "./WidgetApiAction";
import { IWidgetApiAcknowledgeResponseData } from "./IWidgetApiResponse";
export interface IContentLoadedActionRequest extends IWidgetApiRequest {
    action: WidgetApiFromWidgetAction.ContentLoaded;
    data: IWidgetApiRequestEmptyData;
}
export interface IContentLoadedActionResponse extends IContentLoadedActionRequest {
    response: IWidgetApiAcknowledgeResponseData;
}
