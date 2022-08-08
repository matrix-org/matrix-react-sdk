import { IWidgetApiRequest, IWidgetApiRequestData } from "./IWidgetApiRequest";
import { WidgetApiFromWidgetAction } from "./WidgetApiAction";
import { IWidgetApiAcknowledgeResponseData } from "./IWidgetApiResponse";
import { ModalButtonID } from "./ModalWidgetActions";
export interface ISetModalButtonEnabledActionRequestData extends IWidgetApiRequestData {
    enabled: boolean;
    button: ModalButtonID;
}
export interface ISetModalButtonEnabledActionRequest extends IWidgetApiRequest {
    action: WidgetApiFromWidgetAction.SetModalButtonEnabled;
    data: ISetModalButtonEnabledActionRequestData;
}
export interface ISetModalButtonEnabledActionResponse extends ISetModalButtonEnabledActionRequest {
    response: IWidgetApiAcknowledgeResponseData;
}
