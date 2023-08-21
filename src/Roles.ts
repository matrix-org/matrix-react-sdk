/*
Copyright 2017 Vector Creations Ltd

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

import { safeSet } from "matrix-js-sdk/src/utils";

import SdkConfig from "./SdkConfig";
import { _t, pickBestLanguage } from "./languageHandler";

export function levelRoleMap(usersDefault: number): Record<number | "undefined", string> {
    const customPowerLevelRoles = SdkConfig.get().custom_power_level_roles;
    if (customPowerLevelRoles) {
        const mappings: Record<number | "undefined", string> = {
            undefined: _t("Default"),
        };

        Object.entries(customPowerLevelRoles).forEach(([levelString, langs]) => {
            const lang = pickBestLanguage(Object.keys(langs));
            if (lang && langs[lang]) {
                safeSet(mappings, parseInt(levelString), langs[lang]);
            }
        });

        if (Object.keys(mappings).length > 1) {
            return mappings;
        }
    }

    return {
        undefined: _t("Default"),
        0: _t("Restricted"),
        [usersDefault]: _t("Default"),
        50: _t("Moderator"),
        100: _t("Admin"),
    };
}

export function textualPowerLevel(level: number, usersDefault: number): string {
    const LEVEL_ROLE_MAP = levelRoleMap(usersDefault);
    if (LEVEL_ROLE_MAP[level]) {
        return LEVEL_ROLE_MAP[level];
    } else {
        return _t("Custom (%(level)s)", { level });
    }
}
