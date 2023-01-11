/*
Copyright 2020 - 2023 The Matrix.org Foundation C.I.C.

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

import { useEffect, useState } from "react";

import { SettingLevel } from "../settings/SettingLevel";
import SettingsStore from "../settings/SettingsStore";

/** Async version of {@link React.Dispatch} */
type DispatchAsync<A> = (value: A) => Promise<void>;

// Hook to fetch the value of a setting and dynamically update when it changes
export const useSettingValue = <T>(settingName: string, roomId: string | null = null, excludeDefault = false) => {
    const [value, setValue] = useState(SettingsStore.getValue<T>(settingName, roomId, excludeDefault));

    useEffect(() => {
        const ref = SettingsStore.watchSetting(settingName, roomId, () => {
            setValue(SettingsStore.getValue<T>(settingName, roomId, excludeDefault));
        });
        // clean-up
        return () => {
            SettingsStore.unwatchSetting(ref);
        };
    }, [settingName, roomId, excludeDefault]);

    return value;
};

/**
 * Hook for retrieving a setting's value, along with a function to update it.
 * Similar to {@link useState}, but for settings.
 *
 * The setter (i.e. the second value in the returned tuple), returns a promise
 * that resolves when the setting has been fully flushed.
 *
 * @see {@link useSettingValue} if updating is not necessary
 * @see {@link SettingsStore}
 */
export function useSetting<T>(
    settingName: string,
    roomId: string | null = null,
    excludeDefault = false,
    settingLevel = SettingLevel.DEVICE,
): [T, DispatchAsync<React.SetStateAction<T>>] {
    const value = useSettingValue<T>(settingName, roomId, excludeDefault);

    function set(updater: T | ((oldValue: T) => T)) {
        const newValue: T =
            typeof updater === "function"
                ? (updater as ((oldValue: T) => T))(value)
                : updater;
        return SettingsStore.setValue(settingName, roomId, settingLevel, newValue);
    }

    return [value, set];
}

// Hook to fetch whether a feature is enabled and dynamically update when that changes
export const useFeatureEnabled = (featureName: string, roomId: string | null = null): boolean => {
    const [enabled, setEnabled] = useState(SettingsStore.getValue<boolean>(featureName, roomId));

    useEffect(() => {
        const ref = SettingsStore.watchSetting(featureName, roomId, () => {
            setEnabled(SettingsStore.getValue(featureName, roomId));
        });
        // clean-up
        return () => {
            SettingsStore.unwatchSetting(ref);
        };
    }, [featureName, roomId]);

    return enabled;
};
