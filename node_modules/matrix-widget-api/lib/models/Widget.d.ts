import { IWidget, IWidgetData, WidgetType } from "..";
import { ITemplateParams } from "..";
/**
 * Represents the barest form of widget.
 */
export declare class Widget {
    private definition;
    constructor(definition: IWidget);
    /**
     * The user ID who created the widget.
     */
    get creatorUserId(): string;
    /**
     * The type of widget.
     */
    get type(): WidgetType;
    /**
     * The ID of the widget.
     */
    get id(): string;
    /**
     * The name of the widget, or null if not set.
     */
    get name(): string | null;
    /**
     * The title for the widget, or null if not set.
     */
    get title(): string | null;
    /**
     * The templated URL for the widget.
     */
    get templateUrl(): string;
    /**
     * The origin for this widget.
     */
    get origin(): string;
    /**
     * Whether or not the client should wait for the iframe to load. Defaults
     * to true.
     */
    get waitForIframeLoad(): boolean;
    /**
     * The raw data for the widget. This will always be defined, though
     * may be empty.
     */
    get rawData(): IWidgetData;
    /**
     * Gets a complete widget URL for the client to render.
     * @param {ITemplateParams} params The template parameters.
     * @returns {string} A templated URL.
     */
    getCompleteUrl(params: ITemplateParams): string;
}
