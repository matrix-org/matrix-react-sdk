import { Widget } from "./Widget";
import { IWidget } from "..";
export interface IStateEvent {
    event_id: string;
    room_id: string;
    type: string;
    sender: string;
    origin_server_ts: number;
    unsigned?: unknown;
    content: unknown;
    state_key: string;
}
export interface IAccountDataWidgets {
    [widgetId: string]: {
        type: "m.widget";
        state_key: string;
        sender: string;
        content: IWidget;
        id?: string;
    };
}
export declare class WidgetParser {
    private constructor();
    /**
     * Parses widgets from the "m.widgets" account data event. This will always
     * return an array, though may be empty if no valid widgets were found.
     * @param {IAccountDataWidgets} content The content of the "m.widgets" account data.
     * @returns {Widget[]} The widgets in account data, or an empty array.
     */
    static parseAccountData(content: IAccountDataWidgets): Widget[];
    /**
     * Parses all the widgets possible in the given array. This will always return
     * an array, though may be empty if no widgets could be parsed.
     * @param {IStateEvent[]} currentState The room state to parse.
     * @returns {Widget[]} The widgets in the state, or an empty array.
     */
    static parseWidgetsFromRoomState(currentState: IStateEvent[]): Widget[];
    /**
     * Parses a state event into a widget. If the state event does not represent
     * a widget (wrong event type, invalid widget, etc) then null is returned.
     * @param {IStateEvent} stateEvent The state event.
     * @returns {Widget|null} The widget, or null if invalid
     */
    static parseRoomWidget(stateEvent: IStateEvent): Widget | null;
    private static processEstimatedWidget;
}
