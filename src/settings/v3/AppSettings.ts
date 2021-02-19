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

import { SettingID, Settings, SettingType } from "./Types";
import { RoomListSettings, SettingsCategory } from "./Categories";

export type SettingMap<T extends SettingID> = {
    [P in T]: P;
};

// We end up using this for everything, but hide available properties by 
const AllSettingsMap: SettingMap<SettingID> = Object.keys(Settings).reduce((p, c) => {
    p[c] = c;
    return p;
}, {}) as SettingMap<SettingID>;

type MappedSettings<T extends SettingsCategory> = { [P in keyof T]: T[P] };

function remap<T extends SettingsCategory>(cat: T): MappedSettings<T> {
    return Object.entries(cat).reduce((p, [prop, mapped]) => {
        // We cast to `any` because the compiler isn't smart enough to know what is going on here.
        // What we're doing is essentially defining MappedSettings<T> with keys from `cat`, mapping
        // them to the definitions populated by AllSettingsMap so the typing magically works.
        (p as any)[prop] = AllSettingsMap[mapped];
        return p;
    }, {} as MappedSettings<T>);
}

export const S = {
    ...AllSettingsMap,
    RoomList: remap(RoomListSettings),
};

function getValue<K extends SettingID>(id: K): SettingType<K> {
    if (id === S.RoomListBreadcrumbs) {
        return ['test'];
    } else if (id === S.ShowReadReceipts) {
        return false;
    } else if (id === S["Video.TestDevice"]) {
        return "ok";
    }
    return null;
}

const test1: string[] = getValue(S.RoomListBreadcrumbs);
const test2: string[] = getValue(S.RoomList.Breadcrumbs);
