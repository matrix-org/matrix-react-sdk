/* eslint @typescript-eslint/no-unused-vars: ["error", { "varsIgnorePattern": "^_" }] */

/*
Copyright 2023 The Matrix.org Foundation C.I.C.

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

import { act, renderHook } from "@testing-library/react-hooks";

import { useSetting } from "../../src/hooks/useSettings";
import { SETTINGS } from "../../src/settings/Settings";
import SettingsStore from "../../src/settings/SettingsStore";

describe("useSetting", () => {
    it("should return the default value", () => {
        const settingId = "alwaysShowTimestamps";
        const { result } = renderHook(() => useSetting<boolean>(settingId));
        const [value, _set] = result.current;
        expect(value).toBe(SETTINGS[settingId].default);
    });

    it("should update the actual setting", async () => {
        const settingId = "language";
        const { result } = renderHook(() => useSetting<string>(settingId));

        const newValue = "es-ES";
        await act(async () => {
            const [_value, set] = result.current;
            return await set(newValue);
        });

        expect(SettingsStore.getValue(settingId)).toBe(newValue);
    });

    it("should rerender on update", async () => {
        const settingId = "autocompleteDelay";
        const { result } = renderHook(() => useSetting<number>(settingId));
        const beforeLength = result.all.length;

        await act(async () => {
            const [_value, set] = result.current;
            return await set((old) => old + 1);
        });

        expect(result.all).toHaveLength(beforeLength + 1);
    });
});
