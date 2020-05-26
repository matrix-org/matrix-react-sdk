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

export interface ListeningSetting<T> {
    /**
     * Called when the setting's value has changed at any level. Note that the calculatedValue is
     * the final value (after overrides) determined by the store and may not have experienced a
     * change.
     * @param inRoomId The room ID where the setting has changed, if any.
     * @param atLevel The level at which the setting has changed.
     * @param levelValue The value for the particular level of the setting (after override).
     * @param calculatedValue The final value for the setting (after override).
     */
    onChange(inRoomId: string, atLevel: SettingLevel, levelValue: T, calculatedValue: T): void;
}
