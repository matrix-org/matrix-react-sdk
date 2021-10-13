/*
Copyright 2018-2021 New Vector Ltd

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

const fs = require('fs');
const program = require('commander');
const puppeteer = require('puppeteer');

program
    .description(`\
Generates screenshots of components of element-web and stores them in \
./screenshots.

Example:
$ cd test/end-to-end-tests/
$ node screenshots.js --app-url http://localhost:8080
Writing screenshot 'screenshots/DevicesPanel_2_devices_wide.png'
...
$ xdg-open screenshots/DevicesPanel_2_devices_wide.png`,
    )
    .option('--app-url [url]', "url for element-web", "http://localhost:5000")
    .parse(process.argv);

async function makeScreenshots() {
    const t = { timeout: 5000 };
    const puppeteerOptions = {};
    const browser = await puppeteer.launch(puppeteerOptions);
    const page = await browser.newPage();
    await page.goto(`${program.appUrl}/screenshots.html`);
    await page.waitForSelector("#select_screenshot", t);
    const screenshotNames = await page.$$eval(
        "#select_screenshot > option",
        (opts) => opts.map((opt) => opt.value).filter((opt) => opt !== ""),
    );

    fs.mkdir("screenshots", async () => {
        for (const name of screenshotNames) {
            await singleScreenshot(page, t, name);
        }
        await browser.close();
    });
}

async function singleScreenshot(page, t, name) {
    await page.select("#select_screenshot", name);
    const screenshotWidth = parseInt(
        await page.$eval("#screenshot_width", (el) => el.value));
    const screenshotHeight = parseInt(
        await page.$eval("#screenshot_height", (el) => el.value));
    const screenshotClass = await page.$eval("#screenshot_class", (el) => el.value);

    await page.waitForSelector(`.${screenshotClass}`, t);
    await page.setViewport({
        width: screenshotWidth,
        height: screenshotHeight,
    });
    const filePath = `screenshots/${name}.png`;
    console.log(`Writing screenshot '${filePath}'`);
    await page.screenshot({ path: filePath });
}

makeScreenshots().catch(function(err) {
    console.log(err);
    process.exit(-1);
});
