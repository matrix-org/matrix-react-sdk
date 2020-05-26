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

export interface OverridableSetting<T> {
    /**
     * Overrides the setting's value. If this returns null, the value will not be overridden. This
     * is called as the last step before the setting value is returned to the caller. It is called
     * every time the setting value is read.
     * @param inRoomId The room ID in where the setting is being requested, if any.
     * @param atLevel The level at which the setting is being requested.
     * @param value The calculated value of the setting before it is to be returned.
     * @returns The overridden value for the setting, or null to indicate no override.
     */
    getOverrideValue(inRoomId: string, atLevel: SettingLevel, value: T): T | null;
}
