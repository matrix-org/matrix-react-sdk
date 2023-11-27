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

import type { ISendEventResponse, MatrixClient, Room } from "matrix-js-sdk/src/matrix";
import type { GeneratedSecretStorageKey } from "matrix-js-sdk/src/crypto-api";

export interface MatrixBotClient extends MatrixClient {
    __playwright_password: string;
    __playwright_recovery_key: GeneratedSecretStorageKey;
    /**
     * Make this bot join a room by name
     * @param roomName Name of the room to join
     */
    joinRoomByName(roomName: string): Promise<Room>;
    /**
     * Send a message as a bot into a room
     * @param roomId ID of the room to join
     * @param message the message body to send
     */
    sendStringMessage(roomId: string, message: string): Promise<ISendEventResponse>;
    /**
     * Send a message as a bot into a room in a specific thread
     * @param roomId ID of the room to join
     * @param threadId the thread within which this message should go
     * @param message the message body to send
     */
    sendThreadMessage(roomId: string, threadId: string, message: string): Promise<ISendEventResponse>;
}

export function addBotMethodsToClient(client: MatrixClient): MatrixBotClient {
    Object.assign(client, {
        joinRoomByName: async function (roomName: string): Promise<Room> {
            const room = client.getRooms().find((r) => r.getDefaultRoomName(client.getUserId()) === roomName);
            if (room) return client.joinRoom(room.roomId);
            else throw new Error(`Bot room join failed. Cannot find room '${roomName}'`);
        },

        sendStringMessage: async function (roomId: string, message: string): Promise<ISendEventResponse> {
            return await client.sendMessage(roomId, {
                msgtype: "m.text",
                body: message,
            });
        },

        sendThreadMessage: async function (
            roomId: string,
            threadId: string,
            message: string,
        ): Promise<ISendEventResponse> {
            return await client.sendMessage(roomId, threadId, {
                msgtype: "m.text",
                body: message,
            });
        },
    });

    return client as MatrixBotClient;
}
