import { IWidgetApiRequest, IWidgetApiRequestData } from "./IWidgetApiRequest";
import { WidgetApiToWidgetAction } from "./WidgetApiAction";
import { IWidgetApiAcknowledgeResponseData } from "./IWidgetApiResponse";
export interface IVisibilityActionRequestData extends IWidgetApiRequestData {
    visible: boolean;
}
export interface IVisibilityActionRequest extends IWidgetApiRequest {
    action: WidgetApiToWidgetAction.UpdateVisibility;
    data: IVisibilityActionRequestData;
}
export interface IVisibilityActionResponse extends IVisibilityActionRequest {
    response: IWidgetApiAcknowledgeResponseData;
}
