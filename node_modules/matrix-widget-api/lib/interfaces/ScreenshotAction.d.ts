import { IWidgetApiRequest, IWidgetApiRequestEmptyData } from "./IWidgetApiRequest";
import { WidgetApiToWidgetAction } from "./WidgetApiAction";
import { IWidgetApiResponseData } from "./IWidgetApiResponse";
export interface IScreenshotActionRequest extends IWidgetApiRequest {
    action: WidgetApiToWidgetAction.TakeScreenshot;
    data: IWidgetApiRequestEmptyData;
}
export interface IScreenshotActionResponseData extends IWidgetApiResponseData {
    screenshot: Blob;
}
export interface IScreenshotActionResponse extends IScreenshotActionRequest {
    response: IScreenshotActionResponseData;
}
