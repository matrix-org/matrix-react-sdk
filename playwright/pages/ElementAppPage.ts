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

import { expect, type Locator, type Page } from "@playwright/test";
import { SettingLevel } from "../../src/settings/SettingLevel";
import type SettingsStore from "../../src/settings/SettingsStore";

export class ElementAppPage {
    constructor(private readonly page: Page) {}

    async getSettingsStore(): Promise<typeof SettingsStore> {
        return this.page.evaluate(() => (window as any).mxSettingsStore);
    }

    async setSettingsValue(name: string, roomId: string, level: SettingLevel, value: any): Promise<void> {
        const store = await this.getSettingsStore();
        await store.setValue(name, roomId, level, value);
    }

    // todo: make sure that we don't need a type param here
    async getSettingsValue(name: string, roomId?: string, excludeDefault?: boolean): Promise<any> {
        const store = await this.getSettingsStore();
        return store.getValue(name, roomId, excludeDefault);
    }

    async openUserMenu(): Promise<Locator> {
        await this.page.getByRole("button", { name: "User menu" }).click();
        const locator = this.page.locator(".mx_ContextualMenu");
        await locator.waitFor();
        return locator;
    }

    async switchTab(tab: string): Promise<void> {
        await this.page
            .locator(".mx_TabbedView_tabLabels")
            .locator("mx_TabbedView_tabLabel")
            .filter({ hasText: tab })
            .click();
    }

    async openUserSettings(tab?: string): Promise<void> {
        const locator = await this.openUserMenu();
        await locator.getByRole("menuitem", { name: "All settings" }).click();
        if (tab) await this.switchTab(tab);
    }

    async openRoomSettings(tab?: string): Promise<void> {
        await this.page.getByRole("button", { name: "Room options" }).click();
        await this.page.locator(".mx_RoomTile_contextMenu").getByRole("menuitem", { name: "Settings" }).click();
        if (tab) await this.switchTab(tab);
    }

    async closeDialog(): Promise<void> {
        await this.page.getByRole("button", { name: "Close dialog" }).click();
    }
}
