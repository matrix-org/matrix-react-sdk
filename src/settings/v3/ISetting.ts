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

export enum SettingLevel {
    Device = "device",
    RoomDevice = "room-device",
    RoomAccount = "room-account",
    Account = "account",
    Config = "config",
    Default = "default",
}

export interface ISetting<T> {
    /**
     * Default value for the setting. May be null.
     */
    default: T;

    /**
     * The display name for the setting. May be an object to denote the display name
     * changes depending on the level.
     */
    displayName?: string | {
        [level in SettingLevel]?: string;
    };

    /**
     * If not supported at each level, which levels the setting is supported at. Note
     * that this array is ordered. The Default level will always be appended to the end.
     */
    levels?: SettingLevel[];
}

export class CommonLevels {
    public static readonly LabsFeature = [SettingLevel.Device, SettingLevel.Config];

    private constructor() {
        // readonly class
    }
}
