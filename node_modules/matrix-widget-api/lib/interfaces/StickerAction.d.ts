import { IWidgetApiRequest, IWidgetApiRequestData } from "./IWidgetApiRequest";
import { WidgetApiFromWidgetAction } from "./WidgetApiAction";
import { IWidgetApiAcknowledgeResponseData } from "./IWidgetApiResponse";
export interface IStickerActionRequestData extends IWidgetApiRequestData {
    name: string;
    description?: string;
    content: {
        url: string;
        info?: {
            h?: number;
            w?: number;
            mimetype?: string;
            size?: number;
            thumbnail_info?: {
                h?: number;
                w?: number;
                mimetype?: string;
                size?: number;
            };
        };
    };
}
export interface IStickerActionRequest extends IWidgetApiRequest {
    action: WidgetApiFromWidgetAction.SendSticker;
    data: IStickerActionRequestData;
}
export interface IStickerActionResponse extends IStickerActionRequest {
    response: IWidgetApiAcknowledgeResponseData;
}
