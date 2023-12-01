/*
Copyright 2023 Suguru Hirahara

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
import { viewRoomSummaryByName } from "./utils";

const ROOM_NAME = "Test room";
const NAME = "Alice";

async function uploadFile(page: Page, file: string) {
    // Upload a file from the message composer
    await page.locator(".mx_MessageComposer_actions input[type='file']").setInputFiles(file);

    await page.locator(".mx_Dialog").getByRole("button", { name: "Upload" }).click();

    // Wait until the file is sent
    await expect(page.locator(".mx_RoomView_statusArea_expanded")).not.toBeVisible();
    await expect(page.locator(".mx_EventTile.mx_EventTile_last .mx_EventTile_receiptSent")).toBeVisible();
}

test.describe("FilePanel", () => {
    test.use({
        displayName: NAME,
    });

    test.beforeEach(async ({ page, user, app }) => {
        await app.client.createRoom({ name: ROOM_NAME });

        // Open the file panel
        await viewRoomSummaryByName(page, app, ROOM_NAME);
        await page.getByRole("menuitem", { name: "Files" }).click();
        await expect(page.locator(".mx_FilePanel")).toBeVisible();
    });

    test.describe("render", () => {
        test("should render empty state", async ({ page }) => {
            // Wait until the information about the empty state is rendered
            await expect(page.locator(".mx_FilePanel_empty")).toBeVisible();

            // Take a snapshot of RightPanel - fix https://github.com/vector-im/element-web/issues/25332
            await expect(page.locator(".mx_RightPanel")).toHaveScreenshot("empty.png");
        });

        test("should list tiles on the panel", async ({ page }) => {
            // Upload multiple files
            await uploadFile(page, "cypress/fixtures/riot.png"); // Image
            await uploadFile(page, "cypress/fixtures/1sec.ogg"); // Audio
            await uploadFile(page, "cypress/fixtures/matrix-org-client-versions.json"); // JSON

            const roomViewBody = page.locator(".mx_RoomView_body");
            // Assert that all of the file were uploaded and rendered
            await expect(roomViewBody.locator(".mx_EventTile[data-layout='group']")).toHaveCount(3);

            // Assert that the image exists and has the alt string
            await expect(roomViewBody.locator(".mx_EventTile[data-layout='group'] img[alt='riot.png']")).toBeVisible();

            // Assert that the audio player is rendered
            await expect(
                roomViewBody.locator(".mx_EventTile[data-layout='group'] .mx_AudioPlayer_container"),
            ).toBeVisible();

            // Assert that the file button exists
            await expect(
                roomViewBody.locator(".mx_EventTile_last[data-layout='group'] .mx_MFileBody", { hasText: ".json" }),
            ).toBeVisible();

            const filePanel = page.locator(".mx_FilePanel");
            // Assert that the file panel is opened inside mx_RightPanel and visible
            await expect(filePanel).toBeVisible();

            const filePanelMessageList = filePanel.locator(".mx_RoomView_MessageList");

            // Assert that data-layout attribute is not applied to file tiles on the panel
            await expect(filePanelMessageList.locator(".mx_EventTile[data-layout]")).not.toBeVisible();

            // Assert that all of the file tiles are rendered
            await expect(filePanelMessageList.locator(".mx_EventTile")).toHaveCount(3);

            // Assert that the download links are rendered
            await expect(filePanelMessageList.locator(".mx_MFileBody_download")).toHaveCount(3);

            // Assert that the sender of the files is rendered on all of the tiles
            await expect(filePanelMessageList.getByText(NAME)).toHaveCount(3);

            // Detect the image file
            const image = filePanelMessageList.locator(".mx_EventTile_mediaLine.mx_EventTile_image .mx_MImageBody");
            // Assert that the image is specified as thumbnail and has the alt string
            await expect(image.locator("img[class='mx_MImageBody_thumbnail']")).toBeVisible();
            await expect(image.locator("img[alt='riot.png']")).toBeVisible();

            // Detect the audio file
            const audio = filePanelMessageList.locator(
                ".mx_EventTile_mediaLine .mx_MAudioBody .mx_AudioPlayer_container",
            );
            // Assert that the play button is rendered
            await expect(audio.getByRole("button", { name: "Play" })).toBeVisible();

            // Detect the JSON file
            // Assert that the tile is rendered as a button
            const file = filePanelMessageList.locator(
                ".mx_EventTile_mediaLine .mx_MFileBody .mx_MFileBody_info[role='button'] .mx_MFileBody_info_filename",
            );
            // Assert that the file name is rendered inside the button with ellipsis
            await expect(file.getByText(/matrix.*?\.json/)).toBeVisible();

            // Make the viewport tall enough to display all of the file tiles on FilePanel
            await page.setViewportSize({ width: 800, height: 1000 });

            // In case the panel is scrollable on the resized viewport
            // Assert that the value for flexbox is applied
            await expect(filePanel.locator(".mx_ScrollPanel .mx_RoomView_MessageList")).toHaveCSS(
                "justify-content",
                "flex-end",
            );
            // Assert that all of the file tiles are visible before taking a snapshot
            await expect(filePanelMessageList.locator(".mx_MImageBody")).toBeVisible(); // top
            await expect(filePanelMessageList.locator(".mx_MAudioBody")).toBeVisible(); // middle
            const senderDetails = filePanelMessageList.locator(".mx_EventTile_last .mx_EventTile_senderDetails");
            await expect(senderDetails.locator(".mx_DisambiguatedProfile")).toBeVisible();
            await expect(senderDetails.locator(".mx_MessageTimestamp")).toBeVisible();

            // Take a snapshot of file tiles list on FilePanel
            // XXX: We remove the RM as masking it in different locations causes a false positive
            await page.evaluate(() => {
                document.querySelectorAll(".mx_MessagePanel_myReadMarker").forEach((e) => e.remove());
            });
            await expect(filePanelMessageList).toHaveScreenshot("file-tiles-list.png", {
                // Exclude timestamps, profiles, avatars & flaky seek bar from snapshot
                mask: [
                    page.locator(
                        ".mx_MessageTimestamp, .mx_DisambiguatedProfile, .mx_BaseAvatar, .mx_AudioPlayer_seek",
                    ),
                ],
            });
        });

        test("should render the audio player and play the audio file on the panel", async ({ page }) => {
            // Upload an image file
            await uploadFile(page, "cypress/fixtures/1sec.ogg");

            const audioBody = page.locator(
                ".mx_FilePanel .mx_RoomView_MessageList .mx_EventTile_mediaLine .mx_MAudioBody .mx_AudioPlayer_container",
            );
            // Assert that the audio player is rendered
            // Assert that the audio file information is rendered
            const mediaInfo = audioBody.locator(".mx_AudioPlayer_mediaInfo");
            await expect(mediaInfo.locator(".mx_AudioPlayer_mediaName").getByText("1sec.ogg")).toBeVisible();
            await expect(mediaInfo.locator(".mx_AudioPlayer_byline", { hasText: "00:01" })).toBeVisible();
            await expect(mediaInfo.locator(".mx_AudioPlayer_byline", { hasText: "(3.56 KB)" })).toBeVisible(); // actual size

            // Assert that the duration counter is 00:01 before clicking the play button
            await expect(audioBody.locator(".mx_AudioPlayer_mediaInfo time", { hasText: "00:01" })).toBeVisible();

            // Assert that the counter is zero before clicking the play button
            await expect(audioBody.locator(".mx_AudioPlayer_seek [role='timer']", { hasText: "00:00" })).toBeVisible();

            // Click the play button
            await audioBody.getByRole("button", { name: "Play" }).click();

            // Assert that the pause button is rendered
            await expect(audioBody.getByRole("button", { name: "Pause" })).toBeVisible();

            // Assert that the timer is reset when the audio file finished playing
            await expect(audioBody.locator(".mx_AudioPlayer_seek [role='timer']", { hasText: "00:00" })).toBeVisible();

            // Assert that the play button is rendered
            await expect(audioBody.getByRole("button", { name: "Play" })).toBeVisible();
        });

        test("should render file size in kibibytes on a file tile", async ({ page }) => {
            const size = "1.12 KB"; // actual file size in kibibytes (1024 bytes)

            // Upload a file
            await uploadFile(page, "cypress/fixtures/matrix-org-client-versions.json");

            const tile = page.locator(".mx_FilePanel .mx_EventTile");
            // Assert that the file size is displayed in kibibytes, not kilobytes (1000 bytes)
            // See: https://github.com/vector-im/element-web/issues/24866
            await expect(tile.locator(".mx_MFileBody_info_filename", { hasText: size })).toBeVisible();
            await expect(tile.locator(".mx_MFileBody_download a", { hasText: size })).toBeVisible();
            await expect(tile.locator(".mx_MFileBody_download .mx_MImageBody_size", { hasText: size })).toBeVisible();
        });
    });

    test.describe("download", () => {
        test("should download an image via the link on the panel", async ({ page, context }) => {
            // Upload an image file
            await uploadFile(page, "cypress/fixtures/riot.png");

            // Detect the image file on the panel
            const imageBody = page.locator(
                ".mx_FilePanel .mx_RoomView_MessageList .mx_EventTile_mediaLine.mx_EventTile_image .mx_MImageBody",
            );

            const link = imageBody.locator(".mx_MFileBody_download a");

            const newPagePromise = context.waitForEvent("page");
            // const downloadPromise = page.waitForEvent("download");

            // Click the anchor link (not the image itself)
            await link.click();

            const newPage = await newPagePromise;
            // XXX: Clicking the link opens the image in a new tab on some browsers rather than downloading, so handle that case
            await expect(newPage).toHaveURL("*/_matrix/media/*/download/*");
            // .catch(async () => {
            //     const download = await downloadPromise;
            //     expect(download.suggestedFilename()).toBe("riot.png");
            // });
        });
    });
});
