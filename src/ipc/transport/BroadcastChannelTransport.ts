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

import { ITransport, TRANSPORT_EVENT } from "./ITransport";
import EventEmitter from "events";
import { Operation } from "../types";

const CHANNEL = "mx-rsdk-ipc";

export class BroadcastChannelTransport extends EventEmitter implements ITransport {
    private channel: BroadcastChannel;

    public constructor() {
        super();

        this.channel = new BroadcastChannel(CHANNEL);
        this.channel.onmessage = this.onMessage;
    }

    private onMessage = (msg: MessageEvent<Operation>) => {
        this.emit(TRANSPORT_EVENT, msg.data);
    };

    public send(op: Operation): void {
        this.channel.postMessage(op);
    }

    public static isSupported(): boolean {
        try {
            return !!window.BroadcastChannel;
        } catch (_) {
            return false;
        }
    }
}
