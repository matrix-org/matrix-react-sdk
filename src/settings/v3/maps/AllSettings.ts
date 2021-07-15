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

// This is just to create a type which maps setting ID to setting ID. This might seem pointless,
// but it's an intermediary type to create an interface that Settings.get() can later use.
import { RawAppSettings, SettingID } from "./types";

export type SettingMap = {
    [P in SettingID]: P;
};

// This is our "All Settings Map" where we actually build the map defined by the SettingMap
// type we created above.
export const AllSettingsMap = Object.keys(RawAppSettings).reduce((p, c) => {
    p[c] = c;
    return p;
}, {}) as SettingMap;
