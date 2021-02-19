/*
 * Copyright 2021 The Matrix.org Foundation C.I.C.
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

import {SettingID} from "./Types";

export type SettingsCategory = Record<string, SettingID>;

// Note: None of the categories listed here are typed to be a SettingsCategory. This
// is because TypeScript wipes out our types, which makes the Settings.get() function
// return a union of all types instead of just the specified setting's type, making
// manual casting a requirement. Instead, we use TypeScript's implied interface support
// and hope that the remap() function in AppSettings.ts will error if someone creates
// an invalid setting map.

// Note: In order to make Settings.get() return the right type, use the syntax shown
// below: 'RoomListBreadcrumbs' as 'RoomListBreadcrumbs' - This maps the value to a
// setting name and forces the parent object's type to be of that type rather than
// string, which is why we don't type these categories to SettingsCategory here.

export const RoomListSettings = {
    Breadcrumbs: 'RoomListBreadcrumbs' as 'RoomListBreadcrumbs',
};
