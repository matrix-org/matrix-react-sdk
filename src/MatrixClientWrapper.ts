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

import { ISendEventResponse, MatrixClient } from "matrix-js-sdk/src/matrix";

import { LocalRoom, LOCAL_ROOM_ID_PREFIX } from "./models/LocalRoom";
import { createRoomFromLocalRoom } from "./utils/direct-messages";

export interface IMatrixClientWrapper {
    sendEvent(
        matrixClient: MatrixClient,
        roomId: string,
        ...rest
    ): Promise<ISendEventResponse>;

    sendMessage(
        matrixClient: MatrixClient,
        roomId: string,
        ...rest
    ): Promise<ISendEventResponse>;

    // eslint-disable-next-line @typescript-eslint/naming-convention
    unstable_createLiveBeacon(
        matrixClient: MatrixClient,
        roomId: string,
        ...rest
    ): Promise<ISendEventResponse>;

    sendStickerMessage(
        matrixClient: MatrixClient,
        roomId: string,
        ...rest
    ): Promise<ISendEventResponse>;
}

export class MatrixClientWrapperClass implements IMatrixClientWrapper {
    public async sendEvent(matrixClient: MatrixClient, roomId: string, ...rest): Promise<ISendEventResponse> {
        if (!roomId.startsWith(LOCAL_ROOM_ID_PREFIX)) {
            const params = [roomId, ...rest] as Parameters<MatrixClient["sendEvent"]>;
            return matrixClient.sendEvent(...params);
        }

        return this.handleLocalRoom(
            matrixClient,
            roomId,
            async (roomId: string) => {
                const params = [roomId, ...rest] as Parameters<MatrixClient["sendEvent"]>;
                await matrixClient.sendEvent(...params);
            },
        );
    }

    public async sendMessage(matrixClient: MatrixClient, roomId: string, ...rest): Promise<ISendEventResponse> {
        if (!roomId.startsWith(LOCAL_ROOM_ID_PREFIX)) {
            const params = [roomId, ...rest] as Parameters<MatrixClient["sendMessage"]>;
            return matrixClient.sendMessage(...params);
        }

        return this.handleLocalRoom(
            matrixClient,
            roomId,
            async (roomId: string) => {
                const params = [roomId, ...rest] as Parameters<MatrixClient["sendMessage"]>;
                await matrixClient.sendMessage(...params);
            },
        );
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    public async unstable_createLiveBeacon(
        matrixClient: MatrixClient,
        roomId: string,
        ...rest: any[]
    ): Promise<ISendEventResponse> {
        if (!roomId.startsWith(LOCAL_ROOM_ID_PREFIX)) {
            const params = [roomId, ...rest] as Parameters<MatrixClient["unstable_setLiveBeacon"]>;
            return matrixClient.unstable_createLiveBeacon(...params);
        }

        return this.handleLocalRoom(
            matrixClient,
            roomId,
            async (roomId: string) => {
                const params = [roomId, ...rest] as Parameters<MatrixClient["unstable_createLiveBeacon"]>;
                await matrixClient.unstable_createLiveBeacon(...params);
            },
        );
    }

    sendStickerMessage(
        matrixClient: MatrixClient,
        roomId: string,
        ...rest
    ): Promise<ISendEventResponse> {
        if (!roomId.startsWith(LOCAL_ROOM_ID_PREFIX)) {
            const params = [roomId, ...rest] as Parameters<MatrixClient["sendStickerMessage"]>;
            return matrixClient.sendStickerMessage(...params);
        }

        return this.handleLocalRoom(
            matrixClient,
            roomId,
            async (roomId: string) => {
                const params = [roomId, ...rest] as Parameters<MatrixClient["sendStickerMessage"]>;
                await matrixClient.sendStickerMessage(...params);
            },
        );
    }

    private async handleLocalRoom(
        matrixClient: MatrixClient,
        roomId: string,
        callback: Function,
    ): Promise<ISendEventResponse> {
        const room = matrixClient.store.getRoom(roomId) as LocalRoom;
        room.afterCreateCallbacks.push(callback);
        await createRoomFromLocalRoom(matrixClient, room);
        return;
    }
}

export const MatrixClientWrapper = new MatrixClientWrapperClass();
