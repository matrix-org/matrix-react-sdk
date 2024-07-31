/*
Copyright 2024 The Matrix.org Foundation C.I.C.

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

/* See readme.md for tips on writing these tests. */

import { Locator, Page } from "playwright-core";

import { test, expect } from "../../element-web-test";

async function sendMessage(page: Page, message: string): Promise<void> {
    await page.getByRole("textbox", { name: "Send a message…" }).fill(message);
    await page.getByRole("button", { name: "Send message" }).click();
}

async function editMessage(page: Page, message: Locator, newMsg: string): Promise<void> {
    const line = message.locator(".mx_EventTile_line");
    await line.hover();
    await line.getByRole("button", { name: "Edit" }).click();
    const editComposer = page.getByRole("textbox", { name: "Edit message" });
    await editComposer.hover(); // Just to un-hover the message line
    await editComposer.fill(newMsg);
    await editComposer.press("Enter");
}

async function getLastMessage(page: Page): Promise<Locator> {
    return await page.locator(".mx_EventTile_last");
}

test.describe("Message rendering", () => {
    [
        { direction: "ltr", displayName: "Quentin" },
        { direction: "rtl", displayName: "كوينتين" },
    ].forEach(({ direction, displayName }) => {
        test.describe(`with ${direction} display name`, () => {
            test.use({
                displayName,
                room: async ({ user, app }, use) => {
                    const roomId = await app.client.createRoom({ name: "Test room" });
                    await use({ roomId });
                },
            });

            test("should render a basic LTR text message", async ({ page, user, app, room }) => {
                await page.goto(`#/room/${room.roomId}`);

                await sendMessage(page, "Hello, world!");
                const lastMsg = await getLastMessage(page);
                await expect(lastMsg).toMatchScreenshot(`basic-message-ltr-${direction}displayname.png`, {
                    mask: [page.locator(".mx_MessageTimestamp")],
                });
            });

            test("should render an LTR emote", async ({ page, user, app, room }) => {
                await page.goto(`#/room/${room.roomId}`);

                await sendMessage(page, "/me lays an egg");
                const lastMsg = await getLastMessage(page);
                await expect(lastMsg).toMatchScreenshot(`emote-ltr-${direction}displayname.png`);
            });

            test("should render an edited LTR message", async ({ page, user, app, room }) => {
                await page.goto(`#/room/${room.roomId}`);

                await sendMessage(page, "Hello, world!");
                const lastMsg = await getLastMessage(page);

                await editMessage(page, lastMsg, "Hello, universe!");

                await expect(lastMsg).toMatchScreenshot(`edited-message-ltr-${direction}displayname.png`, {
                    mask: [page.locator(".mx_MessageTimestamp")],
                });
            });

            test("should render a basic RTL text message", async ({ page, user, app, room }) => {
                await page.goto(`#/room/${room.roomId}`);

                await sendMessage(page, "مرحبا بالعالم!");
                const lastMsg = await getLastMessage(page);
                await expect(lastMsg).toMatchScreenshot(`basic-message-rtl-${direction}displayname.png`, {
                    mask: [page.locator(".mx_MessageTimestamp")],
                });
            });

            test("should render an RTL emote", async ({ page, user, app, room }) => {
                await page.goto(`#/room/${room.roomId}`);

                await sendMessage(page, "/me يضع بيضة");
                const lastMsg = await getLastMessage(page);
                await expect(lastMsg).toMatchScreenshot(`emote-rtl-${direction}displayname.png`);
            });

            test("should render an edited RTL message", async ({ page, user, app, room }) => {
                await page.goto(`#/room/${room.roomId}`);

                await sendMessage(page, "مرحبا بالعالم!");
                const lastMsg = await getLastMessage(page);

                await editMessage(page, lastMsg, "مرحبا بالكون!");

                await expect(lastMsg).toMatchScreenshot(`edited-message-rtl-${direction}displayname.png`, {
                    mask: [page.locator(".mx_MessageTimestamp")],
                });
            });
        });
    });
});
