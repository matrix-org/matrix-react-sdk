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

import { SettingID, AppSettings, SettingType } from "./Types";
import { RoomListSettings, SettingsCategory } from "./Categories";
import { DeepFlatten, ValuesOf } from "../../utils/ts";

// This is just to create a type which maps setting ID to setting ID. This might seem pointless,
// but it's an intermediary type to create an interface that Settings.get() can later use.
export type SettingMap = {
    [P in SettingID]: P;
};

// This is our "All Settings Map" where we actually build the map defined by the SettingMap
// type we created above.
const AllSettingsMap = Object.keys(AppSettings).reduce((p, c) => {
    p[c] = c;
    return p;
}, {}) as SettingMap;

// This looks useless in terms of code, and arguably it is, however it does an important job
// to enforce typechecking on the incoming map. All this definition does is allows us to use
// friendlier names for our settings by putting them into categories for dot exploration. For
// example, a hypothetical RoomListLayout setting might want to be recorded as RoomList.Layout,
// which is hard to do or ugly to represent in code (property names can't have dots, which means
// making them strings, which means our access looks like S["RoomList.Layout"] instead of a
// cleaner S.RoomList.Layout). By defining a SettingsCategory we are able to help make this
// mapping possible, and need to typecheck it for reasons explained in Categories.ts
//
// TLDR: We return the same thing because we're just typechecking our fancy map of setting values.
type MappedSettings<T extends SettingsCategory> = { [P in keyof T]: T[P] };
function remap<T extends SettingsCategory>(cat: T): MappedSettings<T> {
    return cat;
}

// We define our mapped settings ahead of the global definition so it is easier to exclude settings
// which are mapped to categories. We mostly want to do this to help developers use the right setting
// even if others are technically possible: for example, if we have S.RoomList.Layout then we don't
// want someone to accidentally use S["RoomList.Layout"] as their IDE might suggest. By defining the
// mapped types (S.RoomList.*) ahead of the definition, we can omit the mapped values from the top
// level definition. Inspecting the type of S or the Omit<> below should give a better idea of what
// is going on.
const mappedSettings = {
    RoomList: remap(RoomListSettings),
};

// Finally, this is our accessor for setting IDs. Yes, code can use the setting IDs as strings,
// but that can conflict with some "find usages of..." tooling available in IDEs and GitHub.
// This is pretty much just a cheap way to continue using that tooling while also being descriptive
// in code.
//
// As for why we call this just "S": `S.Breadcrumbs` is the same number of characters that are needed
// for `"Breadcrumbs"` - we are actively trying to avoid making lines of code larger by optimizing for
// IDE tooling. The S denotes "Setting ID".
export const S = {
    ...AllSettingsMap as Omit<typeof AllSettingsMap, ValuesOf<DeepFlatten<typeof mappedSettings>>>,
    ...mappedSettings,
};

function getValue<K extends SettingID>(id: K): SettingType<K> {
    if (id === S.RoomList.Breadcrumbs) {
        return ['test'];
    } else if (id === S.ShowReadReceipts) {
        return false;
    } else if (id === S["Video.TestDevice"]) {
        return "ok";
    }
    return null;
}

// const inspect1 = AllSettingsMap;
// const inspect2 = mappedSettings;
// const test1: string[] = getValue(S.RoomListBreadcrumbs);
// const test2: string[] = getValue(S.RoomList.Breadcrumbs);
