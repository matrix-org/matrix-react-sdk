import { IWidgetApiRequest, IWidgetApiRequestEmptyData } from "./IWidgetApiRequest";
import { WidgetApiFromWidgetAction, WidgetApiToWidgetAction } from "./WidgetApiAction";
import { ApiVersion } from "./ApiVersion";
import { IWidgetApiResponseData } from "./IWidgetApiResponse";
export interface ISupportedVersionsActionRequest extends IWidgetApiRequest {
    action: WidgetApiFromWidgetAction.SupportedApiVersions | WidgetApiToWidgetAction.SupportedApiVersions;
    data: IWidgetApiRequestEmptyData;
}
export interface ISupportedVersionsActionResponseData extends IWidgetApiResponseData {
    supported_versions: ApiVersion[];
}
export interface ISupportedVersionsActionResponse extends ISupportedVersionsActionRequest {
    response: ISupportedVersionsActionResponseData;
}
