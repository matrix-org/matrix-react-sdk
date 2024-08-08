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

import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env["BASE_URL"] ?? "http://localhost:8080";

const chromeOptions = {
    permissions: ["clipboard-write", "clipboard-read", "microphone"],
    launchOptions: {
        args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--mute-audio"],
    },
};

export default defineConfig({
    use: {
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
        video: "retain-on-failure",
        baseURL,
        trace: "on-first-retry",
    },
    webServer: {
        command: process.env.CI ? "npx serve -p 8080 -L ../webapp" : "yarn --cwd ../element-web start",
        url: `${baseURL}/config.json`,
        reuseExistingServer: true,
    },
    projects: [
        /* Test against desktop browsers */
        {
            name: "chromium",
            use: {
                ...devices["Desktop Chrome"],
                contextOptions: chromeOptions,
            },
        },
        {
            name: "firefox",
            use: {
                ...devices["Desktop Firefox"],
                launchOptions: {
                    firefoxUserPrefs: {
                        "dom.events.asyncClipboard.writeText": true,
                        "dom.events.asyncClipboard.readText": true,
                        "dom.events.testing.asyncClipboard": true,
                    },
                },
            },
        },
        {
            name: "webkit",
            use: { ...devices["Desktop Safari"] },
        },
        {
            name: "chrome",
            use: {
                ...devices["Desktop Chrome"],
                channel: "chrome",
                contextOptions: chromeOptions,
            },
        },
        {
            name: "edge",
            use: {
                ...devices["Desktop Edge"],
                channel: "msedge",
                contextOptions: chromeOptions,
            },
        },
    ],
    testDir: "playwright/e2e",
    outputDir: "playwright/test-results",
    workers: 1,
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? [["blob"], ["github"]] : [["html", { outputFolder: "playwright/html-report" }]],
    snapshotDir: "playwright/snapshots",
    snapshotPathTemplate: "{snapshotDir}/{testFilePath}/{arg}-{platform}{ext}",
    forbidOnly: !!process.env.CI,
});
