/*
 * Copyright 2020, 2021 The Matrix.org Foundation C.I.C.
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

import { IWidget } from "..";

export interface ITemplateParams {
    widgetRoomId?: string;
    currentUserId: string;
    userDisplayName?: string;
    userHttpAvatarUrl?: string;
    clientId?: string;
    clientTheme?: string;
    clientLanguage?: string;
}

export function runTemplate(url: string, widget: IWidget, params: ITemplateParams): string {
    // Always apply the supplied params over top of data to ensure the data can't lie about them.
    const variables = Object.assign({}, widget.data, {
        'matrix_room_id': params.widgetRoomId || "",
        'matrix_user_id': params.currentUserId,
        'matrix_display_name': params.userDisplayName || params.currentUserId,
        'matrix_avatar_url': params.userHttpAvatarUrl || "",
        'matrix_widget_id': widget.id,

        // TODO: Convert to stable (https://github.com/matrix-org/matrix-doc/pull/2873)
        'org.matrix.msc2873.client_id': params.clientId || "",
        'org.matrix.msc2873.client_theme': params.clientTheme || "",
        'org.matrix.msc2873.client_language': params.clientLanguage || "",
    });
    let result = url;
    for (const key of Object.keys(variables)) {
        // Regex escape from https://stackoverflow.com/a/6969486/7037379
        const pattern = `$${key}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
        const rexp = new RegExp(pattern, 'g');

        // This is technically not what we're supposed to do for a couple reasons:
        // 1. We are assuming that there won't later be a $key match after we replace a variable.
        // 2. We are assuming that the variable is in a place where it can be escaped (eg: path or query string).
        result = result.replace(rexp, encodeURIComponent(toString(variables[key])));
    }
    return result;
}

export function toString(a: unknown): string {
    if (a === null || a === undefined) {
        return `${a}`;
    }
    return a.toString();
}
