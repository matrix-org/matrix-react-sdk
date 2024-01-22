/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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

// @ts-ignore - `.ts` is needed here to make TS happy
import { Request, Response } from "./workers/thumbhash.worker.ts";
import { WorkerManager } from "./WorkerManager";
import blurhashWorkerFactory from "./workers/thumbhashWorkerFactory";

export class ThumbhashEncoder {
    private static internalInstance = new ThumbhashEncoder();

    public static get instance(): ThumbhashEncoder {
        return ThumbhashEncoder.internalInstance;
    }

    private readonly worker = new WorkerManager<Request, Response>(blurhashWorkerFactory());

    public getThumbhash(imageData: ImageData): Promise<string> {
        return this.worker.call({ imageData }).then((resp) => resp.thumbhash);
    }
}

export function base64ToArrayBuffer(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}
