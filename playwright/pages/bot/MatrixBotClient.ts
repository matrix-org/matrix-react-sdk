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

import { MatrixClient } from "matrix-js-sdk/src/matrix";

import type { ISendEventResponse, Room } from "matrix-js-sdk/src/matrix";

export class MatrixBotClient extends MatrixClient {
    public __playwright_password?: string;
    public __playwright_recovery_key?: string;

    /**
     * Make this bot join a room by name
     * @param roomName Name of the room to join
     */
    async joinRoomByName(roomName: string): Promise<Room> {
        const room = this.getRooms().find((r) => r.getDefaultRoomName(this.getUserId()) === roomName);
        if (room) return this.joinRoom(room.roomId);
        else throw new Error(`Bot room join failed. Cannot find room '${roomName}'`);
    }

    /**
     * Send a message as a bot into a room
     * @param roomId ID of the room to join
     * @param message the message body to send
     */
    async sendStringMessage(roomId: string, message: string): Promise<ISendEventResponse> {
        return await this.sendMessage(roomId, {
            msgtype: "m.text",
            body: message,
        });
    }

    /**
     * Send a message as a bot into a room in a specific thread
     * @param roomId ID of the room to join
     * @param threadId the thread within which this message should go
     * @param message the message body to send
     */
    async sendThreadMessage(roomId: string, threadId: string, message: string): Promise<ISendEventResponse> {
        return await this.sendMessage(roomId, threadId, {
            msgtype: "m.text",
            body: message,
        });
    }
}
