import { IWidgetData } from "./IWidget";
/**
 * Widget data for m.custom specifically.
 */
export interface ICustomWidgetData extends IWidgetData {
    /**
     * The URL for the widget if the templated URL is not exactly what will be loaded.
     */
    url?: string;
}
