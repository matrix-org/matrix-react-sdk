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

import {CustomSettings} from "./CustomSettings";

// First let's define a variable which will help with the rest of this making sense. We just want
// an object which has all of the settings, custom and built-in, so we just map directly to the
// custom settings because they extend the built-in ones.
export const AppSettings = CustomSettings;

// Next we want a type to represent all the setting names. This will be a type which is a union
// of all property names on the AppSettings object. We take off 'prototype' because we don't want
// that to be considered a setting.
export type SettingID = keyof Omit<typeof AppSettings, 'prototype'>;

// This just defines a type which references the `ISetting<T>` for each setting ID. Essentially
// we're making a dynamic interface of AppSettings here, mapping the property names to ISetting<T>
// types.
export type SettingDefinition<K extends SettingID> = (typeof AppSettings)[K];

// Finally we can pull out the setting types by using the same dynamic interface trick from above:
// we map setting IDs (property names) to the type of the definition's `default` property. The value
// of the default can be whatever - we're just stripping the type off of it from the ISetting<T>
// contracts.
export type SettingType<K extends SettingID> = SettingDefinition<K>['default'];
