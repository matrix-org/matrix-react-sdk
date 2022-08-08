import { IWidgetApiRequest, IWidgetApiRequestData } from "./IWidgetApiRequest";
import { WidgetApiFromWidgetAction } from "./WidgetApiAction";
import { IWidgetApiResponseData } from "./IWidgetApiResponse";
export interface IStickyActionRequestData extends IWidgetApiRequestData {
    value: boolean;
}
export interface IStickyActionRequest extends IWidgetApiRequest {
    action: WidgetApiFromWidgetAction.UpdateAlwaysOnScreen;
    data: IStickyActionRequestData;
}
export interface IStickyActionResponseData extends IWidgetApiResponseData {
    success: boolean;
}
export interface IStickyActionResponse extends IStickyActionRequest {
    response: IStickyActionResponseData;
}
