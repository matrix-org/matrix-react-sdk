import { IWidgetApiRequest, IWidgetApiRequestData, IWidgetApiRequestEmptyData } from "./IWidgetApiRequest";
import { WidgetApiFromWidgetAction, WidgetApiToWidgetAction } from "./WidgetApiAction";
import { Capability } from "./Capabilities";
import { IWidgetApiAcknowledgeResponseData, IWidgetApiResponseData } from "./IWidgetApiResponse";
export interface ICapabilitiesActionRequest extends IWidgetApiRequest {
    action: WidgetApiToWidgetAction.Capabilities;
    data: IWidgetApiRequestEmptyData;
}
export interface ICapabilitiesActionResponseData extends IWidgetApiResponseData {
    capabilities: Capability[];
}
export interface ICapabilitiesActionResponse extends ICapabilitiesActionRequest {
    response: ICapabilitiesActionResponseData;
}
export interface INotifyCapabilitiesActionRequestData extends IWidgetApiRequestData {
    requested: Capability[];
    approved: Capability[];
}
export interface INotifyCapabilitiesActionRequest extends IWidgetApiRequest {
    action: WidgetApiToWidgetAction.NotifyCapabilities;
    data: INotifyCapabilitiesActionRequestData;
}
export interface INotifyCapabilitiesActionResponse extends INotifyCapabilitiesActionRequest {
    response: IWidgetApiAcknowledgeResponseData;
}
export interface IRenegotiateCapabilitiesActionRequest extends IWidgetApiRequest {
    action: WidgetApiFromWidgetAction.MSC2974RenegotiateCapabilities;
    data: IRenegotiateCapabilitiesRequestData;
}
export interface IRenegotiateCapabilitiesRequestData extends IWidgetApiResponseData {
    capabilities: Capability[];
}
export interface IRenegotiateCapabilitiesActionResponse extends IRenegotiateCapabilitiesActionRequest {
}
