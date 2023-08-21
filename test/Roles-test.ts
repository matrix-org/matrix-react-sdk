/*
Copyright 2023 Nordeck IT + Consulting GmbH.

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

import { levelRoleMap } from "../src/Roles";
import SdkConfig from "../src/SdkConfig";
import { setLanguage } from "../src/languageHandler";

describe("levelRoleMap", () => {
    beforeEach(async () => {
        await setLanguage("en");
    });

    it("returns default role labels", async () => {
        expect(levelRoleMap(0)).toEqual({
            undefined: "Default",
            0: "Default",
            50: "Moderator",
            100: "Admin",
        });
    });

    it("returns a restricted level with custom default user level", async () => {
        expect(levelRoleMap(10)).toEqual({
            undefined: "Default",
            0: "Restricted",
            10: "Default",
            50: "Moderator",
            100: "Admin",
        });
    });

    it("returns custom levels if present in the configuration", async () => {
        SdkConfig.put({
            custom_power_level_roles: {
                "0": { en: "Regular" },
                "1": { en: "Mod" },
                "2": { en: "Admin" },
            },
        });

        expect(levelRoleMap(0)).toEqual({
            undefined: "Default",
            0: "Regular",
            1: "Mod",
            2: "Admin",
        });
    });

    it("returns custom levels in the correct language", async () => {
        SdkConfig.put({
            custom_power_level_roles: {
                "0": { en: "Regular", de: "Normal" },
                "1": { "en": "Mod", "de-DE": "Moderator" },
                "2": { en: "Admin" },
            },
        });

        await setLanguage("de");

        expect(levelRoleMap(0)).toEqual({
            undefined: "Standard",
            0: "Normal",
            1: "Moderator",
            2: "Admin",
        });
    });

    it("returns default levels if custom configuration is empty", async () => {
        SdkConfig.put({ custom_power_level_roles: { "0": {} } });

        expect(levelRoleMap(0)).toEqual({
            undefined: "Default",
            0: "Default",
            50: "Moderator",
            100: "Admin",
        });
    });
});
