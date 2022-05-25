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

import { MatrixClient } from "matrix-js-sdk/src/matrix";
import { Room } from "matrix-js-sdk/src/models/room";

import { Member, startDm } from "../utils/direct-messages";

export const LOCAL_ROOM_ID_PREFIX = 'local+';

export enum LocalRoomState {
    DRAFT, // local room created; only known to the client
    CREATED, // room has been created via API; events applied
}

/**
 * A local room that only exists on the client side.
 * Its main purpose is to be used for temporary rooms when creating a DM.
 */
export class LocalRoom extends Room {
    targets: Member[];
    afterCreateCallbacks: Function[] = [];
    state: LocalRoomState = LocalRoomState.DRAFT;

    public async createRealRoom(client: MatrixClient) {
        if (!this.isDraft) {
            return;
        }

        const roomId = await startDm(client, this.targets);
        await this.applyAfterCreateCallbacks(client, roomId);
        this.state = LocalRoomState.CREATED;
    }

    private async applyAfterCreateCallbacks(client: MatrixClient, roomId: string) {
        for (const afterCreateCallback of this.afterCreateCallbacks) {
            await afterCreateCallback(client, roomId);
        }

        this.afterCreateCallbacks = [];
    }

    public get isDraft(): boolean {
        return this.state === LocalRoomState.DRAFT;
    }
}
