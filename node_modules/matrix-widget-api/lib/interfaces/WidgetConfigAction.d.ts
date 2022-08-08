import { IWidgetApiRequest } from "./IWidgetApiRequest";
import { WidgetApiToWidgetAction } from "./WidgetApiAction";
import { IWidgetApiAcknowledgeResponseData, IWidgetApiResponse } from "./IWidgetApiResponse";
import { IModalWidgetOpenRequestData } from "./ModalWidgetActions";
export interface IWidgetConfigRequest extends IWidgetApiRequest {
    action: WidgetApiToWidgetAction.WidgetConfig;
    data: IModalWidgetOpenRequestData;
}
export interface IWidgetConfigResponse extends IWidgetApiResponse {
    response: IWidgetApiAcknowledgeResponseData;
}
