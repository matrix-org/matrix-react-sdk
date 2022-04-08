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

import uuidv4 = require('uuid/v4');

import { RestSession } from "./session";
import { Logger } from "../logger";

/* no pun intended */
export class RestThread {
    constructor(
        readonly session: RestSession,
        readonly roomId: string,
        readonly threadId: string,
        readonly log: Logger,
    ) {}

    async talk(message: string): Promise<void> {
        this.log.step(`says "${message}" in ${this.roomId}`);
        const txId = uuidv4();
        await this.session.put(`/rooms/${this.roomId}/send/m.room.message/${txId}`, {
            "msgtype": "m.text",
            "body": message,
            "m.relates_to": {
                "rel_type": "m.thread",
                "event_id": this.threadId,
            },
        });
        this.log.done();
        return txId;
    }
}
