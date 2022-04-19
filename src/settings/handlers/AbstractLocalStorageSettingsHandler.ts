/*
Copyright 2019 - 2022 The Matrix.org Foundation C.I.C.

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

import SettingsHandler from "./SettingsHandler";

/**
 * Abstract settings handler wrapping around localStorage making getValue calls cheaper
 * by caching the values and listening for localStorage updates from other tabs.
 */
export default abstract class AbstractLocalStorageSettingsHandler extends SettingsHandler {
    private itemCache = new Map<string, any>();
    private objectCache = new Map<string, object>();

    protected constructor() {
        super();

        // Listen for storage changes from other tabs
        window.addEventListener("storage", (e: StorageEvent) => {
            if (this.itemCache.has(e.key)) {
                this.itemCache.set(e.key, e.newValue);
            }

            if (this.objectCache.has(e.key)) {
                try {
                    this.objectCache.set(e.key, JSON.parse(e.newValue));
                } catch (err) {
                    console.error("Failed to parse localStorage object", err);
                    this.objectCache.delete(e.key);
                }
            }
        });
    }

    protected getItem(key: string): any {
        if (!this.itemCache.has(key)) {
            const value = localStorage.getItem(key);
            this.itemCache.set(key, value);
            return value;
        }

        return this.itemCache.get(key);
    }

    protected getObject<T extends object>(key: string): T {
        if (!this.objectCache.has(key)) {
            try {
                const value = JSON.parse(localStorage.getItem(key));
                this.objectCache.set(key, value);
                return value;
            } catch (err) {
                console.error("Failed to parse localStorage object", err);
                this.objectCache.delete(key);
                return null;
            }
        }

        return this.objectCache.get(key) as T;
    }

    protected setItem(key: string, value: any): void {
        this.itemCache.set(key, value);
        localStorage.setItem(key, value);
    }

    protected setObject(key: string, value: object): void {
        this.itemCache.set(key, value);
        localStorage.setItem(key, JSON.stringify(value));
    }

    protected removeItem(key: string): void {
        localStorage.removeItem(key);
        this.itemCache.delete(key);
    }

    protected removeObject(key: string): void {
        localStorage.removeItem(key);
        this.objectCache.delete(key);
    }

    public isSupported(): boolean {
        return localStorage !== undefined && localStorage !== null;
    }
}
