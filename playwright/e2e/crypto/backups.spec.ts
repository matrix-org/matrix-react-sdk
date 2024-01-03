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

import { type Page } from "@playwright/test";

import { test, expect } from "../../element-web-test";

async function expectBackupVersionToBe(page: Page, version: string) {
    const serverVersion = await page
        .locator(".mx_Dialog .mx_SecureBackupPanel_statusList tr:nth-child(5) td")
        .textContent();
    expect(serverVersion.trim()).toBe(version + " (Algorithm: m.megolm_backup.v1.curve25519-aes-sha2)");

    const activeVersion = await page
        .locator(".mx_Dialog .mx_SecureBackupPanel_statusList tr:nth-child(6) td")
        .textContent();
    expect(activeVersion.trim()).toBe(version);
}

test.describe("Backups", () => {
    test.use({
        displayName: "Hanako",
    });

    test("Create, delete and recreate a keys backup", async ({ page, user, app }, workerInfo) => {
        // Create a backup
        const tab = await app.settings.openUserSettings("Security & Privacy");

        await expect(tab.getByRole("heading", { name: "Secure Backup" })).toBeVisible();
        await tab.getByRole("button", { name: "Set up", exact: true }).click();
        const dialog = await app.getDialogByTitle("Set up Secure Backup", 60000);
        await dialog.getByRole("button", { name: "Continue", exact: true }).click();
        await expect(dialog.getByRole("heading", { name: "Save your Security Key" })).toBeVisible();
        await dialog.getByRole("button", { name: "Copy", exact: true }).click();
        const securityKey = await app.getClipboard();
        await dialog.getByRole("button", { name: "Continue", exact: true }).click();
        await expect(dialog.getByRole("heading", { name: "Secure Backup successful" })).toBeVisible();
        await dialog.getByRole("button", { name: "Done", exact: true }).click();

        // Open the settings again
        await app.settings.openUserSettings("Security & Privacy");
        await expect(tab.getByRole("heading", { name: "Secure Backup" })).toBeVisible();

        // expand the advanced section to see the active version in the reports
        await page
            .locator(".mx_Dialog .mx_SettingsSubsection_content details .mx_SecureBackupPanel_advanced")
            .locator("..")
            .click();

        await expectBackupVersionToBe(page, "1");

        // Delete it
        await tab.getByRole("button", { name: "Delete Backup", exact: true }).click();
        await dialog.getByTestId("dialog-primary-button").click(); // Click "Delete Backup"

        // Create another
        await tab.getByRole("button", { name: "Set up", exact: true }).click();
        dialog.getByLabel("Security Key").fill(securityKey);
        await dialog.getByRole("button", { name: "Continue", exact: true }).click();
        await expect(dialog.getByRole("heading", { name: "Success!" })).toBeVisible();
        await dialog.getByRole("button", { name: "OK", exact: true }).click();

        // Open the settings again
        await app.settings.openUserSettings("Security & Privacy");
        await expect(tab.getByRole("heading", { name: "Secure Backup" })).toBeVisible();

        // expand the advanced section to see the active version in the reports
        await page
            .locator(".mx_Dialog .mx_SettingsSubsection_content details .mx_SecureBackupPanel_advanced")
            .locator("..")
            .click();

        await expectBackupVersionToBe(page, "2");

        await page.pause();
    });
});
