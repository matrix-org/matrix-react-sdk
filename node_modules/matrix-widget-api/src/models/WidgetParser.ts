/*
 * Copyright 2020 The Matrix.org Foundation C.I.C.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Widget } from "./Widget";
import { IWidget } from "..";
import { isValidUrl } from "./validation/url";

export interface IStateEvent {
    event_id: string; // eslint-disable-line camelcase
    room_id: string; // eslint-disable-line camelcase
    type: string;
    sender: string;
    origin_server_ts: number; // eslint-disable-line camelcase
    unsigned?: unknown;
    content: unknown;
    state_key: string; // eslint-disable-line camelcase
}

export interface IAccountDataWidgets {
    [widgetId: string]: {
        type: "m.widget";
        // the state_key is also the widget's ID
        state_key: string; // eslint-disable-line camelcase
        sender: string; // current user's ID
        content: IWidget;
        id?: string; // off-spec, but possible
    };
}

export class WidgetParser {
    private constructor() {
        // private constructor because this is a util class
    }

    /**
     * Parses widgets from the "m.widgets" account data event. This will always
     * return an array, though may be empty if no valid widgets were found.
     * @param {IAccountDataWidgets} content The content of the "m.widgets" account data.
     * @returns {Widget[]} The widgets in account data, or an empty array.
     */
    public static parseAccountData(content: IAccountDataWidgets): Widget[] {
        if (!content) return [];

        const result: Widget[] = [];
        for (const widgetId of Object.keys(content)) {
            const roughWidget = content[widgetId];
            if (!roughWidget) continue;
            if (roughWidget.type !== "m.widget" && roughWidget.type !== "im.vector.modular.widgets") continue;
            if (!roughWidget.sender) continue;

            const probableWidgetId = roughWidget.state_key || roughWidget.id;
            if (probableWidgetId !== widgetId) continue;

            const asStateEvent: IStateEvent = {
                content: roughWidget.content,
                sender: roughWidget.sender,
                type: "m.widget",
                state_key: widgetId,
                event_id: "$example",
                room_id: "!example",
                origin_server_ts: 1,
            };

            const widget = WidgetParser.parseRoomWidget(asStateEvent);
            if (widget) result.push(widget);
        }

        return result;
    }

    /**
     * Parses all the widgets possible in the given array. This will always return
     * an array, though may be empty if no widgets could be parsed.
     * @param {IStateEvent[]} currentState The room state to parse.
     * @returns {Widget[]} The widgets in the state, or an empty array.
     */
    public static parseWidgetsFromRoomState(currentState: IStateEvent[]): Widget[] {
        if (!currentState) return [];
        const result: Widget[] = [];
        for (const state of currentState) {
            const widget = WidgetParser.parseRoomWidget(state);
            if (widget) result.push(widget);
        }
        return result;
    }

    /**
     * Parses a state event into a widget. If the state event does not represent
     * a widget (wrong event type, invalid widget, etc) then null is returned.
     * @param {IStateEvent} stateEvent The state event.
     * @returns {Widget|null} The widget, or null if invalid
     */
    public static parseRoomWidget(stateEvent: IStateEvent): Widget | null {
        if (!stateEvent) return null;

        // TODO: [Legacy] Remove legacy support
        if (stateEvent.type !== "m.widget" && stateEvent.type !== "im.vector.modular.widgets") {
            return null;
        }

        // Dev note: Throughout this function we have null safety to ensure that
        // if the caller did not supply something useful that we don't error. This
        // is done against the requirements of the interface because not everyone
        // will have an interface to validate against.

        const content = stateEvent.content || {};

        // Form our best approximation of a widget with the information we have
        const estimatedWidget: IWidget = {
            id: stateEvent.state_key,
            creatorUserId: content['creatorUserId'] || stateEvent.sender,
            name: content['name'],
            type: content['type'],
            url: content['url'],
            waitForIframeLoad: content['waitForIframeLoad'],
            data: content['data'],
        };

        // Finally, process that widget
        return WidgetParser.processEstimatedWidget(estimatedWidget);
    }

    private static processEstimatedWidget(widget: IWidget): Widget | null {
        // Validate that the widget has the best chance of passing as a widget
        if (!widget.id || !widget.creatorUserId || !widget.type) {
            return null;
        }
        if (!isValidUrl(widget.url)) {
            return null;
        }
        // TODO: Validate data for known widget types
        return new Widget(widget);
    }
}
