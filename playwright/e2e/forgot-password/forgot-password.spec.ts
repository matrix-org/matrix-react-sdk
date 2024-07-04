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

import { expect, test } from "../../element-web-test";
import { selectHomeserver } from "../utils";

test.describe("Forgot Password", () => {
    test("renders properly", async ({ page, homeserver }) => {
        await page.goto("/");

        await page.getByRole("link", { name: "Sign in" }).click();

        // need to select a homeserver at this stage, before entering the forgot password flow
        await selectHomeserver(page, homeserver.config.baseUrl);

        await page.getByRole("button", { name: "Forgot password?" }).click();

        await expect(page.getByRole("main")).toMatchScreenshot("server-picker.png");
    });
});
