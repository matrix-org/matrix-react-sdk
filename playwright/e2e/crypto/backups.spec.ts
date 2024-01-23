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
import { MatrixClient } from "matrix-js-sdk/src/matrix";

import { test, expect } from "../../element-web-test";
import { Bot } from "../../pages/bot";
import { Credentials, HomeserverInstance } from "../../plugins/homeserver";

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
        const securityTab = await app.settings.openUserSettings("Security & Privacy");

        await expect(securityTab.getByRole("heading", { name: "Secure Backup" })).toBeVisible();
        await securityTab.getByRole("button", { name: "Set up", exact: true }).click();

        const currentDialogLocator = page.locator(".mx_Dialog");

        // It's the first time and secure storage is not set up, so it will create one
        await expect(currentDialogLocator.getByRole("heading", { name: "Set up Secure Backup" })).toBeVisible();
        await currentDialogLocator.getByRole("button", { name: "Continue", exact: true }).click();
        await expect(currentDialogLocator.getByRole("heading", { name: "Save your Security Key" })).toBeVisible();
        await currentDialogLocator.getByRole("button", { name: "Copy", exact: true }).click();
        // copy the recovery key to use it later
        const securityKey = await app.getClipboard();
        await currentDialogLocator.getByRole("button", { name: "Continue", exact: true }).click();

        await expect(currentDialogLocator.getByRole("heading", { name: "Secure Backup successful" })).toBeVisible();
        await currentDialogLocator.getByRole("button", { name: "Done", exact: true }).click();

        // Open the settings again
        await app.settings.openUserSettings("Security & Privacy");
        await expect(securityTab.getByRole("heading", { name: "Secure Backup" })).toBeVisible();

        // expand the advanced section to see the active version in the reports
        await page
            .locator(".mx_Dialog .mx_SettingsSubsection_content details .mx_SecureBackupPanel_advanced")
            .locator("..")
            .click();

        await expectBackupVersionToBe(page, "1");

        await securityTab.getByRole("button", { name: "Delete Backup", exact: true }).click();
        await expect(currentDialogLocator.getByRole("heading", { name: "Delete Backup" })).toBeVisible();
        // Delete it
        await currentDialogLocator.getByTestId("dialog-primary-button").click(); // Click "Delete Backup"

        // Create another
        await securityTab.getByRole("button", { name: "Set up", exact: true }).click();
        await expect(currentDialogLocator.getByRole("heading", { name: "Security Key" })).toBeVisible();
        await currentDialogLocator.getByLabel("Security Key").fill(securityKey);
        await currentDialogLocator.getByRole("button", { name: "Continue", exact: true }).click();

        // Should be successful
        await expect(currentDialogLocator.getByRole("heading", { name: "Success!" })).toBeVisible();
        await currentDialogLocator.getByRole("button", { name: "OK", exact: true }).click();

        // Open the settings again
        await app.settings.openUserSettings("Security & Privacy");
        await expect(securityTab.getByRole("heading", { name: "Secure Backup" })).toBeVisible();

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
        await securityTab.getByRole("button", { name: "Delete Backup", exact: true }).click();
        await expect(currentDialogLocator.getByRole("heading", { name: "Delete Backup" })).toBeVisible();
        // Click "Delete Backup"
        await currentDialogLocator.getByTestId("dialog-primary-button").click();

        // Try to create another
        await securityTab.getByRole("button", { name: "Set up", exact: true }).click();
        await expect(currentDialogLocator.getByRole("heading", { name: "Security Key" })).toBeVisible();
        // But cancel the security key dialog, to simulate not having the secret storage passphrase
        await currentDialogLocator.getByTestId("dialog-cancel-button").click();

        await expect(currentDialogLocator.getByRole("heading", { name: "Starting backup…" })).toBeVisible();
        // check that it failed
        await expect(currentDialogLocator.getByText("Unable to create key backup")).toBeVisible();
        // cancel
        await currentDialogLocator.getByTestId("dialog-cancel-button").click();

        // go back to the settings to check that no backup was created (the setup button should still be there)
        await app.settings.openUserSettings("Security & Privacy");
        await expect(securityTab.getByRole("button", { name: "Set up", exact: true })).toBeVisible();
    });

    test.describe("Backups change from other sessions", () => {
        async function createRoom(page) {
            await page.getByRole("button", { name: "Add room" }).click();

            await page.locator(".mx_IconizedContextMenu").getByRole("menuitem", { name: "New room" }).click();

            const dialog = page.locator(".mx_Dialog");

            await dialog.getByLabel("Name").fill("Room A");
            await dialog.getByRole("button", { name: "Create room" }).click();
        }

        /**
         * Creates a new device for the current user and run the given action with it.
         */
        async function withNewDevice(page: Page, homeserver: HomeserverInstance, credentials: Credentials) {
            // Create a new device for alice
            const aliceBotClient = new Bot(page, homeserver, {
                bootstrapCrossSigning: false,
                bootstrapSecretStorage: false,
            });

            aliceBotClient.setCredentials(await homeserver.loginUser(credentials.userId, credentials.password));
            return await aliceBotClient.prepareClient();
        }

        // setup recovery before each
        test.beforeEach(async ({ page, user, app, cryptoBackend }, workerInfo) => {
            test.skip(cryptoBackend === "legacy", "hard to reproduce the detection on legacy");

            const securityTab = await app.settings.openUserSettings("Security & Privacy");

            await expect(securityTab.getByRole("heading", { name: "Secure Backup" })).toBeVisible();
            await securityTab.getByRole("button", { name: "Set up", exact: true }).click();

            const currentDialogLocator = page.locator(".mx_Dialog");

            // It's the first time and secure storage is not set up, so it will create one
            await expect(currentDialogLocator.getByRole("heading", { name: "Set up Secure Backup" })).toBeVisible();
            await currentDialogLocator.getByRole("button", { name: "Continue", exact: true }).click();
            await expect(currentDialogLocator.getByRole("heading", { name: "Save your Security Key" })).toBeVisible();
            await currentDialogLocator.getByRole("button", { name: "Copy", exact: true }).click();

            await currentDialogLocator.getByRole("button", { name: "Continue", exact: true }).click();

            await expect(currentDialogLocator.getByRole("heading", { name: "Secure Backup successful" })).toBeVisible();
            await currentDialogLocator.getByRole("button", { name: "Done", exact: true }).click();
        });

        test("Should notify when backup deleted by other session", async ({
            page,
            user,
            app,
            homeserver,
            credentials,
            cryptoBackend,
        }, workerInfo) => {
            test.skip(cryptoBackend === "legacy", "hard to reproduce the detection on legacy");

            await createRoom(page);

            const newDevice = await withNewDevice(page, homeserver, credentials);
            await newDevice.evaluate(async (cli: MatrixClient) => {
                await cli.getCrypto()!.deleteKeyBackupVersion("1");
            });

            // send a message (will be the first one so will create a new megolm session)
            await page.locator(".mx_MessageComposer").getByRole("textbox").fill("Hello World");
            await page.getByTestId("sendmessagebtn").click();

            const currentDialogLocator = page.locator(".mx_Dialog");
            // The app will try to back up the keys, but it will fail because the backup was deleted.
            // There is some random delay before the message is uploaded we want to increase a bit the timeout.
            await expect(currentDialogLocator.getByRole("heading", { name: "Recovery Method Removed" })).toBeVisible({
                timeout: 15000,
            });
        });

        test("Should notify when backup updated by other session", async ({
            page,
            user,
            app,
            homeserver,
            credentials,
        }, workerInfo) => {
            await createRoom(page);

            const newDevice = await withNewDevice(page, homeserver, credentials);
            await newDevice.evaluate(async (cli: MatrixClient) => {
                try {
                    await cli.getCrypto()!.resetKeyBackup();
                } catch (e) {
                    // it will fail to update 4S but not important for this test
                    // as we just want the backup to be updated
                }
            });

            // send a message (will be the first one so will create a new megolm session)
            await page.locator(".mx_MessageComposer").getByRole("textbox").fill("Hello World");
            await page.getByTestId("sendmessagebtn").click();

            const currentDialogLocator = page.locator(".mx_Dialog");
            // The app will try to back up the keys, but it will fail because there is a new backup version.
            // There is some random delay before the message is uploaded we want to increase a bit the timeout.
            await expect(currentDialogLocator.getByRole("heading", { name: "New Recovery Method" })).toBeVisible({
                timeout: 15000,
            });
        });
    });
});
