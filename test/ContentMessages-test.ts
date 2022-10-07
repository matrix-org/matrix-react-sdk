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

import { mocked } from "jest-mock";
import { IImageInfo, ISendEventResponse, MatrixClient, Upload } from "matrix-js-sdk/src/matrix";
import encrypt from "matrix-encrypt-attachment";

import ContentMessages, { uploadFile } from "../src/ContentMessages";
import { doMaybeLocalRoomAction } from "../src/utils/local-room";
import { createTestClient } from "./test-utils";

jest.mock("matrix-encrypt-attachment", () => ({ encryptAttachment: jest.fn().mockResolvedValue({}) }));

jest.mock("../src/utils/local-room", () => ({
    doMaybeLocalRoomAction: jest.fn(),
}));

describe("ContentMessages", () => {
    const stickerUrl = "https://example.com/sticker";
    const roomId = "!room:example.com";
    const imageInfo = {} as unknown as IImageInfo;
    const text = "test sticker";
    let client: MatrixClient;
    let contentMessages: ContentMessages;
    let prom: Promise<ISendEventResponse>;

    beforeEach(() => {
        client = {
            sendStickerMessage: jest.fn(),
        } as unknown as MatrixClient;
        contentMessages = new ContentMessages();
        prom = Promise.resolve(null);
    });

    describe("sendStickerContentToRoom", () => {
        beforeEach(() => {
            mocked(client.sendStickerMessage).mockReturnValue(prom);
            mocked(doMaybeLocalRoomAction).mockImplementation((
                roomId: string,
                fn: (actualRoomId: string) => Promise<ISendEventResponse>,
                client?: MatrixClient,
            ) => {
                return fn(roomId);
            });
        });

        it("should forward the call to doMaybeLocalRoomAction", async () => {
            await contentMessages.sendStickerContentToRoom(
                stickerUrl,
                roomId,
                null,
                imageInfo,
                text,
                client,
            );
            expect(client.sendStickerMessage).toHaveBeenCalledWith(roomId, null, stickerUrl, imageInfo, text);
        });
    });
});

describe("uploadFile", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const client = createTestClient();

    it("should not encrypt the file if the room isn't encrypted", async () => {
        mocked(client.isRoomEncrypted).mockReturnValue(false);
        mocked(client.uploadContent).mockReturnValue({
            promise: Promise.resolve({ content_uri: "mxc://server/file" }),
        } as Upload);
        const progressHandler = jest.fn();
        const file = new Blob([]);

        const res = await uploadFile(client, "!roomId:server", file, progressHandler);

        expect(res.url).toBe("mxc://server/file");
        expect(res.file).toBeFalsy();
        expect(encrypt.encryptAttachment).not.toHaveBeenCalled();
        expect(client.uploadContent).toHaveBeenCalledWith(file, { progressHandler });
    });

    it("should encrypt the file if the room is encrypted", async () => {
        mocked(client.isRoomEncrypted).mockReturnValue(true);
        mocked(client.uploadContent).mockReturnValue({
            promise: Promise.resolve({ content_uri: "mxc://server/file" }),
        } as Upload);
        const progressHandler = jest.fn();
        const file = new Blob(["123"]);

        const res = await uploadFile(client, "!roomId:server", file, progressHandler);

        expect(res.url).toBeFalsy();
        expect(res.file).toEqual(expect.objectContaining({
            url: "mxc://server/file",
        }));
        expect(encrypt.encryptAttachment).toHaveBeenCalled();
        expect(client.uploadContent).toHaveBeenCalledWith(expect.any(Blob), {
            progressHandler,
            includeFilename: false,
        });
        expect(mocked(client.uploadContent).mock.calls[0][0]).not.toBe(file);
    });
});
