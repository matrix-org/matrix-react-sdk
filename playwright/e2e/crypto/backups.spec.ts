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
    await expect(page.locator(".mx_SecureBackupPanel_statusList tr:nth-child(5) td")).toHaveText(
        version + " (Algorithm: m.megolm_backup.v1.curve25519-aes-sha2)",
    );

    await expect(page.locator(".mx_SecureBackupPanel_statusList tr:nth-child(6) td")).toHaveText(version);
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
        const dialog = page.locator(".mx_Dialog");

        // It's the first time and secure storage not setup, so it will create one
        await expect(dialog.getByRole("heading", { name: "Set up Secure Backup" })).toBeVisible();
        await dialog.getByRole("button", { name: "Continue", exact: true }).click();

        await expect(dialog.getByRole("heading", { name: "Save your Security Key" })).toBeVisible();
        await dialog.getByRole("button", { name: "Copy", exact: true }).click();

        // copy the recovery key to use it later
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

        await tab.getByRole("button", { name: "Delete Backup", exact: true }).click();
        {
            const dialog = await app.getDialogByTitle("Delete Backup", 60000);
            // Delete it
            await dialog.getByTestId("dialog-primary-button").click(); // Click "Delete Backup"

            // Create another
            await tab.getByRole("button", { name: "Set up", exact: true }).click();

            const dialog2 = await app.getDialogByTitle("Security Key", 60000);

            await dialog2.getByLabel("Security Key").fill(securityKey);
            await dialog2.getByRole("button", { name: "Continue", exact: true }).click();

            const dialog3 = await app.getDialogByTitle("Success!", 60000);

            await dialog3.getByRole("button", { name: "OK", exact: true }).click();
        }

        // Open the settings again
        await app.settings.openUserSettings("Security & Privacy");
        await expect(tab.getByRole("heading", { name: "Secure Backup" })).toBeVisible();

        // expand the advanced section to see the active version in the reports
        await page
            .locator(".mx_Dialog .mx_SettingsSubsection_content details .mx_SecureBackupPanel_advanced")
            .locator("..")
            .click();

        await expectBackupVersionToBe(page, "2");

        // ==
        // Ensure that if you don't have the secret storage passphrase the backup won't be created
        // ==

        // First delete version 2
        await tab.getByRole("button", { name: "Delete Backup", exact: true }).click();
        {
            const dialog = await app.getDialogByTitle("Delete Backup", 60000);
            await dialog.getByTestId("dialog-primary-button").click(); // Click "Delete Backup"

            // Try to create another
            await tab.getByRole("button", { name: "Set up", exact: true }).click();

            const dialog2 = await app.getDialogByTitle("Security Key", 60000);
            // But cancel the security key dialog, to simulate not having the secret storage passphrase
            await dialog2.getByTestId("dialog-cancel-button").click();

            const dialog3 = await app.getDialogByTitle("Starting backup…", 60000);
            // check that it failed
            await expect(dialog3.getByText("Unable to create key backup")).toBeVisible();

            // cancel
            await dialog3.getByTestId("dialog-cancel-button").click();

            // go back to the settings to check that no backup was created (the setup button should still be there)
            const tab2 = await app.settings.openUserSettings("Security & Privacy");
            await expect(tab2.getByRole("button", { name: "Set up", exact: true })).toBeVisible();
        }
    });
});
