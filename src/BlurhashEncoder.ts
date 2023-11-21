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
import { Request, Response } from "./workers/blurhash.worker.ts";
import { WorkerManager } from "./WorkerManager";
import blurhashWorkerFactory from "./workers/blurhashWorkerFactory";

export class BlurhashEncoder {
    private static internalInstance = new BlurhashEncoder();

    public static get instance(): BlurhashEncoder {
        return BlurhashEncoder.internalInstance;
    }

    private readonly worker = new WorkerManager<Request, Response>(blurhashWorkerFactory());

    public getBlurhash(imageData: ImageData): Promise<string> {
        return this.worker.call({ imageData }).then((resp) => resp.blurhash);
    }
}
