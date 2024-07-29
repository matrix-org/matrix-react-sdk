/*
Copyright 2024 The Matrix.org Foundation C.I.C.

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

import { SettingLevel } from "./settings/SettingLevel";
import SettingsStore from "./settings/SettingsStore";

export const USER_TIMEZONE_KEY = "userTimezone";

export function getUserTimezone(): string | undefined {
    const tz = SettingsStore.getValueAt(SettingLevel.DEVICE, USER_TIMEZONE_KEY);
    return tz ? tz : undefined;
}

export function setUserTimezone(timezone: string): Promise<void> {
    return SettingsStore.setValue(USER_TIMEZONE_KEY, null, SettingLevel.DEVICE, timezone);
}

export function getAllTimezones(): string[] {
    return Intl.supportedValuesOf("timeZone");
}

export function shortBrowserTimezone(): stirng {
    return new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
        .formatToParts(new Date())
        .find((x) => x.type === "timeZoneName").value;
}
