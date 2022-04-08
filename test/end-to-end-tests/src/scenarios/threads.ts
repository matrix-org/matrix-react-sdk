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
import { clickTimelineThreadSummary, enableThreads, sendThreadMessage, startThread } from "../usecases/threads";
import { sendMessage } from "../usecases/send-message";
import { closeRoomRightPanel, openThreadListPanel } from "../usecases/rightpanel";

export async function threadsScenarios(alice: ElementSession, bob: ElementSession): Promise<void> {
    console.log(" enabling threads:");

    await enableThreads(alice);
    await enableThreads(bob);

    // Alice sends message
    await sendMessage(alice, "Hey bob, what do you think about X?");
    // Bob responds via a thread
    await startThread(bob, "I think its Y!");
    // Alice sees thread summary and opens thread panel
    await clickTimelineThreadSummary(alice);
    // Bob closes right panel
    await closeRoomRightPanel(bob);
    // Alice responds in thread
    await sendThreadMessage(alice, "Great!");
    // Bob opens thread list and inspects it
    await openThreadListPanel(bob);
    // Bob opens thread in right panel via thread list
    // TODO
    // A & B both inspect their views
    // TODO
}
