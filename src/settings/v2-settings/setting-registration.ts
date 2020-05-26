/*
Copyright 2020 The Matrix.org Foundation C.I.C.

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

import { ISetting } from "./ISetting";

export interface SettingConstructor<T> {
    new(): ISetting<T>;
}

const registeredSettings: ISetting<any>[] = [];

function isRegistered(name: string): boolean {
    return !!registeredSettings.find(s => s.name === name);
}

function register<T>(instance: ISetting<T>): void {
    if (isRegistered(instance.name)) {
        throw new Error(`Setting "${instance.name}" is already registered`);
    }

    registeredSettings.push(instance);
    console.log("Registered setting:", instance.name);
}

export function setting<T>(constructor: SettingConstructor<T>) {
    const instance = new constructor();
    register(instance);
}

export function getSettingByType<V>(initializer: SettingConstructor<V>) {
    return registeredSettings.find(s => s instanceof initializer);
}
