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

import { JSHandle, Page } from "@playwright/test";
import { PageFunctionOn } from "playwright-core/types/structs";

import type {
    IContent,
    ICreateRoomOpts,
    ISendEventResponse,
    MatrixClient,
    Room,
    MatrixEvent,
    ReceiptType,
    IRoomDirectoryOptions,
} from "matrix-js-sdk/src/matrix";
import { Credentials } from "../plugins/homeserver";

export class Client {
    protected client: JSHandle<MatrixClient>;

    protected getClientHandle(): Promise<JSHandle<MatrixClient>> {
        return this.page.evaluateHandle(() => window.mxMatrixClientPeg.get());
    }

    public async prepareClient(): Promise<JSHandle<MatrixClient>> {
        if (!this.client) {
            this.client = await this.getClientHandle();
        }
        return this.client;
    }

    public constructor(protected readonly page: Page) {
        page.on("framenavigated", async () => {
            this.client = null;
        });
    }

    public evaluate<R, Arg, O extends MatrixClient = MatrixClient>(
        pageFunction: PageFunctionOn<O, Arg, R>,
        arg: Arg,
    ): Promise<R>;
    public evaluate<R, O extends MatrixClient = MatrixClient>(
        pageFunction: PageFunctionOn<O, void, R>,
        arg?: any,
    ): Promise<R>;
    public async evaluate<T>(fn: (client: MatrixClient) => T, arg?: any): Promise<T> {
        await this.prepareClient();
        return this.client.evaluate(fn, arg);
    }

    public evaluateHandle<R, Arg, O extends MatrixClient = MatrixClient>(
        pageFunction: PageFunctionOn<O, Arg, R>,
        arg: Arg,
    ): Promise<JSHandle<R>>;
    public evaluateHandle<R, O extends MatrixClient = MatrixClient>(
        pageFunction: PageFunctionOn<O, void, R>,
        arg?: any,
    ): Promise<JSHandle<R>>;
    public async evaluateHandle<T>(fn: (client: MatrixClient) => T, arg?: any): Promise<JSHandle<T>> {
        await this.prepareClient();
        return this.client.evaluateHandle(fn, arg);
    }

    /**
     * @param roomId ID of the room to send the event into
     * @param threadId ID of the thread to send into or null for main timeline
     * @param eventType type of event to send
     * @param content the event content to send
     */
    public async sendEvent(
        roomId: string,
        threadId: string | null,
        eventType: string,
        content: IContent,
    ): Promise<ISendEventResponse> {
        const client = await this.prepareClient();
        return client.evaluate(
            async (client, { roomId, threadId, eventType, content }) => {
                return client.sendEvent(roomId, threadId, eventType, content);
            },
            { roomId, threadId, eventType, content },
        );
    }

    /**
     * Send a message as a bot into a room
     * @param roomId ID of the room to send the message into
     * @param content the event content to send
     */
    public async sendMessage(roomId: string, content: IContent | string): Promise<ISendEventResponse> {
        if (typeof content === "string") {
            content = {
                msgtype: "m.text",
                body: content,
            };
        }

        const client = await this.prepareClient();
        return client.evaluate(
            (client, { roomId, content }) => {
                return client.sendMessage(roomId, content);
            },
            {
                roomId,
                content,
            },
        );
    }

    public async redactEvent(roomId: string, eventId: string, reason?: string): Promise<ISendEventResponse> {
        return this.evaluate(
            async (client, { roomId, eventId, reason }) => {
                return client.redactEvent(roomId, eventId, reason);
            },
            { roomId, eventId, reason },
        );
    }

    /**
     * Create a room with given options.
     * @param options the options to apply when creating the room
     * @return the ID of the newly created room
     */
    public async createRoom(options: ICreateRoomOpts): Promise<string> {
        const client = await this.prepareClient();
        return await client.evaluate(async (cli, options) => {
            const resp = await cli.createRoom(options);
            const roomId = resp.room_id;
            if (!cli.getRoom(roomId)) {
                await new Promise<void>((resolve) => {
                    const onRoom = (room: Room) => {
                        if (room.roomId === roomId) {
                            cli.off(window.matrixcs.ClientEvent.Room, onRoom);
                            resolve();
                        }
                    };
                    cli.on(window.matrixcs.ClientEvent.Room, onRoom);
                });
            }
            return roomId;
        }, options);
    }

    /**
     * Create a space with given options.
     * @param options the options to apply when creating the space
     * @return the ID of the newly created space (room)
     */
    public async createSpace(options: ICreateRoomOpts): Promise<string> {
        return this.createRoom({
            ...options,
            creation_content: {
                ...options.creation_content,
                type: "m.space",
            },
        });
    }

    /**
     * Joins the given room by alias or ID
     * @param roomIdOrAlias the id or alias of the room to join
     */
    public async joinRoom(roomIdOrAlias: string): Promise<void> {
        const client = await this.prepareClient();
        await client.evaluate(async (client, roomIdOrAlias) => {
            return await client.joinRoom(roomIdOrAlias);
        }, roomIdOrAlias);
    }

    /**
     * Make this bot join a room by name
     * @param roomName Name of the room to join
     */
    public async joinRoomByName(roomName: string): Promise<string> {
        const client = await this.prepareClient();
        return client.evaluate(
            async (client, { roomName }) => {
                const room = client.getRooms().find((r) => r.getDefaultRoomName(client.getUserId()) === roomName);
                if (room) {
                    await client.joinRoom(room.roomId);
                    return room.roomId;
                }
                throw new Error(`Bot room join failed. Cannot find room '${roomName}'`);
            },
            {
                roomName,
            },
        );
    }

    /**
     * Invites the given user to the given room.
     * @param roomId the id of the room to invite to
     * @param userId the id of the user to invite
     */
    public async inviteUser(roomId: string, userId: string): Promise<void> {
        const client = await this.prepareClient();
        await client.evaluate((client, { roomId, userId }) => client.invite(roomId, userId), {
            roomId,
            userId,
        });
    }

    /**
     * @param {MatrixEvent} event
     * @param {ReceiptType} receiptType
     * @param {boolean} unthreaded
     */
    public async sendReadReceipt(
        event: JSHandle<MatrixEvent>,
        receiptType?: ReceiptType,
        unthreaded?: boolean,
    ): Promise<{}> {
        const client = await this.prepareClient();
        return client.evaluate(
            (client, { event, receiptType, unthreaded }) => {
                return client.sendReadReceipt(event, receiptType, unthreaded);
            },
            { event, receiptType, unthreaded },
        );
    }

    public async publicRooms(options?: IRoomDirectoryOptions): ReturnType<MatrixClient["publicRooms"]> {
        const client = await this.prepareClient();
        return client.evaluate((client, options) => {
            return client.publicRooms(options);
        }, options);
    }

    /**
     * Boostraps cross-signing.
     */
    public async bootstrapCrossSigning(credentials: Credentials): Promise<void> {
        const client = await this.prepareClient();
        return client.evaluate(async (client, credentials) => {
            await client.getCrypto().bootstrapCrossSigning({
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
        }, credentials);
    }

    /**
     * Sets account data for the user.
     * @param type The type of account data to set
     * @param content The content to set
     */
    public async setAccountData(type: string, content: IContent): Promise<void> {
        const client = await this.prepareClient();
        return client.evaluate(
            async (client, { type, content }) => {
                await client.setAccountData(type, content);
            },
            { type, content },
        );
    }

    /**
     * Sends a state event into the room.
     * @param roomId ID of the room to send the event into
     * @param eventType type of event to send
     * @param content the event content to send
     * @param stateKey the state key to use
     */
    public async sendStateEvent(
        roomId: string,
        eventType: string,
        content: IContent,
        stateKey?: string,
    ): Promise<ISendEventResponse> {
        const client = await this.prepareClient();
        return client.evaluate(
            async (client, { roomId, eventType, content, stateKey }) => {
                return client.sendStateEvent(roomId, eventType, content, stateKey);
            },
            { roomId, eventType, content, stateKey },
        );
    }

    /**
     * Leaves the given room.
     * @param roomId ID of the room to leave
     */
    public async leave(roomId: string): Promise<void> {
        const client = await this.prepareClient();
        return client.evaluate(async (client, roomId) => {
            await client.leave(roomId);
        }, roomId);
    }

    /**
     * Kicks the given user from the given room.
     * @param roomId ID of the room to kick from
     * @param userId ID of the user to kick
     * @param reason Optional reason for the kick
     */
    public async kick(roomId: string, userId: string, reason?: string): Promise<void> {
        const client = await this.prepareClient();
        return client.evaluate(
            async (client, { roomId, userId, reason }) => {
                await client.kick(roomId, userId, reason);
            },
            { roomId, userId, reason },
        );
    }

    /**
     * Kicks the given user from the given room.
     * @param roomId ID of the room to kick from
     * @param userId ID of the user to kick
     * @param reason Optional reason for the kick
     */
    public async ban(roomId: string, userId: string, reason?: string): Promise<void> {
        const client = await this.prepareClient();
        return client.evaluate(
            async (client, { roomId, userId, reason }) => {
                await client.ban(roomId, userId, reason);
            },
            { roomId, userId, reason },
        );
    }
}
