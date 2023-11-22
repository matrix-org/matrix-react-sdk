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

import { type Locator, type Page } from "@playwright/test";
import { SettingLevel } from "../../src/settings/SettingLevel";
import type SettingsStore from "../../src/settings/SettingsStore";

export class ElementAppPage {
    constructor(private readonly page: Page) {}

    /**
     * Returns the SettingsStore
     */
    async getSettingsStore(): Promise<typeof SettingsStore> {
        return this.page.evaluate(() => (window as any).mxSettingsStore);
    }

    /**
     * Sets the value for a setting. The room ID is optional if the
     * setting is not being set for a particular room, otherwise it
     * should be supplied. The value may be null to indicate that the
     * level should no longer have an override.
     * @param {string} name The name of the setting to change.
     * @param {String} roomId The room ID to change the value in, may be
     * null.
     * @param {SettingLevel} level The level to change the value at.
     * @param {*} value The new value of the setting, may be null.
     * @return {Promise} Resolves when the setting has been changed.
     */
    async setSettingsValue(name: string, roomId: string, level: SettingLevel, value: any): Promise<void> {
        const store = await this.getSettingsStore();
        await store.setValue(name, roomId, level, value);
    }

    /**
     * Gets the value of a setting. The room ID is optional if the
     * setting is not to be applied to any particular room, otherwise it
     * should be supplied.
     * @param {string} name The name of the setting to read the
     * value of.
     * @param {String} roomId The room ID to read the setting value in,
     * may be null.
     * @param {boolean} excludeDefault True to disable using the default
     * value.
     * @return {*} The value, or null if not found
     */
    async getSettingsValue(name: string, roomId?: string, excludeDefault?: boolean): Promise<any> {
        const store = await this.getSettingsStore();
        return store.getValue(name, roomId, excludeDefault);
    }

    /**
     * Open the top left user menu, returning a Locator to the resulting context menu.
     */
    async openUserMenu(): Promise<Locator> {
        await this.page.getByRole("button", { name: "User menu" }).click();
        const locator = this.page.locator(".mx_ContextualMenu");
        await locator.waitFor();
        return locator;
    }

    /**
     * Switch settings tab to the one by the given name
     * @param tab the name of the tab to switch to.
     */
    async switchTab(tab: string): Promise<void> {
        await this.page
            .locator(".mx_TabbedView_tabLabels")
            .locator("mx_TabbedView_tabLabel")
            .filter({ hasText: tab })
            .click();
    }

    /**
     * Open user settings (via user menu), returns a locator to the dialog
     * @param tab the name of the tab to switch to after opening, optional.
     */
    async openUserSettings(tab?: string): Promise<Locator> {
        const locator = await this.openUserMenu();
        await locator.getByRole("menuitem", { name: "All settings" }).click();
        if (tab) await this.switchTab(tab);
        return this.page.locator(".mx_UserSettingsDialog");
    }

    /**
     * Open room settings (via room header menu), returns a locator to the dialog
     * @param tab the name of the tab to switch to after opening, optional.
     */
    async openRoomSettings(tab?: string): Promise<Locator> {
        await this.page.getByRole("button", { name: "Room options" }).click();
        await this.page.locator(".mx_RoomTile_contextMenu").getByRole("menuitem", { name: "Settings" }).click();
        if (tab) await this.switchTab(tab);
        return this.page.locator(".mx_RoomSettingsDialog");
    }

    /**
     * Close dialog
     */
    async closeDialog(): Promise<void> {
        await this.page.getByRole("button", { name: "Close dialog" }).click();
    }

    /**
     * Join the given beta, the `Labs` tab must already be opened,
     * @param name the name of the beta to join.
     */
    async joinBeta(name: string): Promise<void> {
        await this.page
            .locator(".mx_BetaCard")
            .filter({ hasText: name })
            .locator("mx_BetaCard_buttons")
            .getByRole("button", { name: "Join the beta" })
            .click();
    }

    /**
     * Leave the given beta, the `Labs` tab must already be opened,
     * @param name the name of the beta to leave.
     */
    async leaveBeta(name: string): Promise<void> {
        await this.page
            .locator(".mx_BetaCard")
            .filter({ hasText: name })
            .locator("mx_BetaCard_buttons")
            .getByRole("button", { name: "Leave the beta" })
            .click();
    }
}
