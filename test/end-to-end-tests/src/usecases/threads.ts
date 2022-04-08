/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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

import { ElementSession } from "../session";
import { strict as assert } from "assert";

export async function enableThreads(session: ElementSession): Promise<void> {
    session.log.step(`enables threads`);
    await session.page.evaluate(() => {
        window["mxSettingsStore"].setValue("feature_thread", null, "device");
    });
    session.log.done();
}

async function clickReplyInThread(session: ElementSession): Promise<void> {
    const buttons = await session.queryAll(".mx_MessageActionBar_threadButton");
    await buttons[buttons.length - 1].click();
}

export async function sendThreadMessage(session: ElementSession, message: string): Promise<void> {
    session.log.step(`sends thread response "${message}"`);
    const composer = await session.query(".mx_ThreadView mx_BasicMessageComposer_input");
    await composer.click();
    await composer.type(message);

    const text = await session.innerText(composer);
    assert.equal(text.trim(), message.trim());
    await composer.press("Enter");
    // wait for the message to appear sent
    await session.query(".mx_ThreadView .mx_EventTile_last:not(.mx_EventTile_sending)");
    session.log.done();
}

export async function startThread(session: ElementSession, response: string): Promise<void> {
    session.log.step(`creates thread on latest message`);

    await clickReplyInThread(session);
    await sendThreadMessage(session, response);

    session.log.done();
}

export async function clickTimelineThreadSummary(session: ElementSession): Promise<void> {
    session.log.step(`clicks the latest thread summary in the timeline`);

    const summaries = await session.queryAll(".mx_MainSplit_timeline .mx_ThreadInfo");
    await summaries[summaries.length - 1].click();
}
