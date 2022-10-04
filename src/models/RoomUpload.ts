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

import { IEventRelation, Upload } from "matrix-js-sdk/src/matrix";

import { IEncryptedFile } from "../customisations/models/IMediaEventContent";

export class RoomUpload {
    private fileUpload: Upload;
    private abortController = new AbortController();

    constructor(
        public readonly roomId: string,
        public readonly fileName: string,
        public readonly relation?: IEventRelation,
        public readonly fileSize?: number,
    ) {}

    public associate(upload: Upload): void {
        this.fileUpload = upload;
        if (this.cancelled) {
            upload.abortController.abort();
        }
    }

    public abort(): void {
        this.abortController.abort();
    }

    public get cancelled(): boolean {
        return this.fileUpload?.abortController.signal.aborted ?? this.abortController.signal.aborted;
    }

    public get total(): number {
        return this.fileUpload?.total ?? this.fileSize ?? 0;
    }

    public get loaded(): number {
        return this.fileUpload?.loaded ?? 0;
    }

    promise: Promise<{ url?: string, file?: IEncryptedFile }>;
}
