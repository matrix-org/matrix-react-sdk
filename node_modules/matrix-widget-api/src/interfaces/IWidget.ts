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

import { WidgetType } from "./WidgetType";

/**
 * Widget data.
 */
export interface IWidgetData {
    /**
     * Optional title for the widget.
     */
    title?: string;

    /**
     * Custom keys for inclusion in the template URL.
     */
    [key: string]: unknown;
}

/**
 * Common properties of a widget.
 * https://matrix.org/docs/spec/widgets/latest#widgetcommonproperties-schema
 */
export interface IWidget {
    /**
     * The ID of the widget.
     */
    id: string;

    /**
     * The user ID who originally created the widget.
     */
    creatorUserId: string;

    /**
     * Optional name for the widget.
     */
    name?: string;

    /**
     * The type of widget.
     */
    type: WidgetType;

    /**
     * The URL for the widget, with template variables.
     */
    url: string;

    /**
     * Optional flag to indicate whether or not the client should initiate communication
     * right after the iframe loads (default, true) or when the widget indicates it is
     * ready (false).
     */
    waitForIframeLoad?: boolean;

    /**
     * Data for the widget.
     */
    data?: IWidgetData;
}
