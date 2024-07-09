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

/**
 * Test reporter which compares the reported screenshots vs those on disk to find stale screenshots
 * Only intended to run from within GitHub Actions
 */

import path from "node:path";
import { glob } from "glob";

import type { Reporter, TestCase } from "@playwright/test/reporter";

const snapshotRoot = path.join(__dirname, "snapshots");

class StaleScreenshotReporter implements Reporter {
    private screenshots = new Set<string>();

    public onTestEnd(test: TestCase): void {
        for (const annotation of test.annotations) {
            if (annotation.type === "_screenshot") {
                this.screenshots.add(annotation.description);
            }
        }
    }

    public async onExit(): Promise<void> {
        const screenshotFiles = new Set(await glob(`**/*.png`, { cwd: snapshotRoot }));
        for (const screenshot of this.screenshots) {
            screenshotFiles.delete(screenshot);
        }
        console.log("~~", screenshotFiles);
    }
}

export default StaleScreenshotReporter;
