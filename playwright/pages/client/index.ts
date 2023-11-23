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

import type {
    IContent,
    ICreateRoomOpts,
    ISendEventResponse,
    MatrixClient,
    Room,
    MatrixEvent,
    ReceiptType,
    UploadOpts,
    FileType,
    Upload,
} from "matrix-js-sdk/src/matrix";
import type { Page } from "playwright-core";

// TODO: move this when converting support/login.ts to playwright
interface UserCredentials {
    accessToken: string;
    username: string;
    userId: string;
    deviceId: string;
    password: string;
    homeServer: string;
}

export class ElementClientPage {
    constructor(private page: Page) {}

    /**
     * Returns the MatrixClient from the MatrixClientPeg
     */
    async getClient(): Promise<MatrixClient> {
        return await this.page.evaluate(() => (window as any).mxMatrixClientPeg.matrixClient);
    }

    /**
     * Gets the list of DMs with a given user
     * @param userId The ID of the user
     * @return the list of DMs with that user
     */
    async getDmRooms(userId: string): Promise<string[]> {
        const client = await this.getClient();
        const dmRoomMap = client.getAccountData("m.direct")?.getContent<Record<string, string[]>>();
        return dmRoomMap[userId] ?? [];
    }

    /**
     * Create a room with given options.
     * @param options the options to apply when creating the room
     * @return the ID of the newly created room
     */
    async createRoom(options: ICreateRoomOpts): Promise<string> {
        return await this.page.evaluate(async () => {
            const cli = (window as any).mxMatrixClientPeg.matrixClient;
            const resp = await cli.createRoom(options);
            const roomId = resp.room_id;
            if (!cli.getRoom(roomId)) {
                await new Promise<void>((resolve) => {
                    const onRoom = (room: Room) => {
                        if (room.roomId === roomId) {
                            cli.off((window as any).matrixcs.ClientEvent.Room, onRoom);
                            resolve();
                        }
                    };
                    cli.on((window as any).matrixcs.ClientEvent.Room, onRoom);
                });
            }
            return roomId;
        });
    }

    /**
     * Create a space with given options.
     * @param options the options to apply when creating the space
     * @return the ID of the newly created space (room)
     */
    async createSpace(options: ICreateRoomOpts): Promise<string> {
        return await this.createRoom({
            ...options,
            creation_content: {
                type: "m.space",
            },
        });
    }

    /**
     * Invites the given user to the given room.
     * @param roomId the id of the room to invite to
     * @param userId the id of the user to invite
     */
    async inviteUser(roomId: string, userId: string): Promise<{}> {
        const client = await this.getClient();
        const res = await client.invite(roomId, userId);
        console.log(`sent invite in ${roomId} for ${userId}`);
        return res;
    }

    /**
     * Sets account data for the user.
     * @param type The type of account data.
     * @param data The data to store.
     */
    async setAccountData(type: string, data: IContent): Promise<{}> {
        const client = await this.getClient();
        return await client.setAccountData(type, data);
    }

    /**
     * @param {string} roomId
     * @param {string} threadId
     * @param {string} eventType
     * @param {Object} content
     * @return {module:http-api.MatrixError} Rejects: with an error response.
     */
    async sendEvent(
        roomId: string,
        threadId: string | null,
        eventType: string,
        content: IContent,
    ): Promise<ISendEventResponse> {
        const client = await this.getClient();
        return await client.sendEvent(roomId, threadId, eventType, content);
    }

    /**
     * @param {MatrixEvent} event
     * @param {ReceiptType} receiptType
     * @param {boolean} unthreaded
     * @return {module:http-api.MatrixError} Rejects: with an error response.
     */
    async sendReadReceipt(event: MatrixEvent, receiptType?: ReceiptType, unthreaded?: boolean): Promise<{}> {
        const client = await this.getClient();
        return await client.sendReadReceipt(event, receiptType, unthreaded);
    }

    /**
     * @param {string} name
     * @param {module:client.callback} callback Optional.
     * @return {Promise} Resolves: {} an empty object.
     * @return {module:http-api.MatrixError} Rejects: with an error response.
     */
    async setDisplayName(name: string): Promise<{}> {
        const client = await this.getClient();
        return await client.setDisplayName(name);
    }

    /**
     * Upload a file to the media repository on the homeserver.
     *
     * @param {object} file The object to upload. On a browser, something that
     *   can be sent to XMLHttpRequest.send (typically a File).  Under node.js,
     *   a a Buffer, String or ReadStream.
     */
    async uploadContent(file: FileType, opts?: UploadOpts): Promise<Awaited<Upload["promise"]>> {
        const client = await this.getClient();
        return await client.uploadContent(file, opts);
    }

    /**
     * @param {string} url
     * @param {module:client.callback} callback Optional.
     * @return {Promise} Resolves: {} an empty object.
     * @return {module:http-api.MatrixError} Rejects: with an error response.
     */
    async setAvatarUrl(url: string): Promise<{}> {
        const client = await this.getClient();
        return await client.setAvatarUrl(url);
    }

    /**
     * Boostraps cross-signing.
     */
    async bootstrapCrossSigning(credentials: UserCredentials): Promise<void> {
        await this.page.evaluate(async () => {
            (window as any).mxMatrixClientPeg.matrixClient.bootstrapCrossSigning({
                authUploadDeviceSigningKeys: async (func) => {
                    await func({
                        type: "m.login.password",
                        identifier: {
                            type: "m.id.user",
                            user: credentials.userId,
                        },
                        password: credentials.password,
                    });
                },
            });
        });
    }

    /**
     * Joins the given room by alias or ID
     * @param roomIdOrAlias the id or alias of the room to join
     */
    async joinRoom(roomIdOrAlias: string): Promise<Room> {
        const client = await this.getClient();
        return await client.joinRoom(roomIdOrAlias);
    }
}
