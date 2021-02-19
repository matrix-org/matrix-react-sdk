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

import {SettingID, Settings, SettingType} from "./Types";
import {RoomListSettings} from "./Categories";

export type SettingMap<T extends SettingID> = {
    [P in T]: P;
};

// We end up using this for everything, but hide available properties by 
const AllSettingsMap: SettingMap<SettingID> = Object.keys(Settings).reduce((p, c) => {
    p[c] = c;
    return p;
}, {}) as SettingMap<SettingID>;


export const S = {
    ...AllSettingsMap,
    RoomList: AllSettingsMap as SettingMap<RoomListSettings>,
};

function getValue<K extends SettingID>(id: K): SettingType<K> {
    if (id === S.Breadcrumbs) {
        return ['test'];
    } else if (id === S.ShowReadReceipts) {
        return false;
    } else if (id === S["Video.TestDevice"]) {
        return "ok";
    }
    return null;
}

const test1 = getValue(S.Breadcrumbs);
const test2 = getValue(S.RoomList.Breadcrumbs);
