/*
Copyright 2020 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { SettingLevel } from "../models";

export interface ISettingDisplayNames {
    // @ts-ignore - TS wants this to be a string, but we know better.
    [settingLevel: SettingLevel]: string;
}

/**
 * Represents a setting within the application.
 */
export interface ISetting<T> {
    /**
     * The name of the setting.
     */
    readonly name: string;

    /**
     * The display name(s), dummy translated, for the setting.
     */
    readonly displayName: string | ISettingDisplayNames;

    /**
     * The levels at which this setting is supported.
     */
    readonly supportedLevels: SettingLevel[];

    /**
     * The default value for the setting.
     */
    readonly defaultValue: T;
}
