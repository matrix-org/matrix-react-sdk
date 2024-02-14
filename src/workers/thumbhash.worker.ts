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

import { rgbaToThumbHash } from "thumbhash";

import { WorkerPayload } from "./worker";

const ctx: Worker = self as any;

export interface Request {
    imageData: ImageData;
}

export interface Response {
    thumbhash: string;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

ctx.addEventListener("message", async (event: MessageEvent<Request & WorkerPayload>): Promise<void> => {
    const { seq, imageData } = event.data;

    // We need to resize it to a max of 100px square in order for the lib to process it
    const maxSize = 100;
    const width = imageData.width;
    const height = imageData.height;

    const scale = Math.min(maxSize / width, maxSize / height);
    const resizedWidth = Math.floor(width * scale);
    const resizedHeight = Math.floor(height * scale);

    const canvas = new OffscreenCanvas(resizedWidth, resizedHeight);
    const canvasCtx = canvas.getContext("2d")!;
    const bitmap = await createImageBitmap(imageData);
    canvasCtx.drawImage(bitmap, 0, 0, resizedWidth, resizedHeight);

    const rgba = new Uint8Array(canvasCtx.getImageData(0, 0, resizedWidth, resizedHeight).data.buffer);
    const thumbhash = arrayBufferToBase64(rgbaToThumbHash(resizedWidth, resizedHeight, rgba));

    ctx.postMessage({ seq, thumbhash });
});
