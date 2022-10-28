/*
Copyright 2020 - 2022 The Matrix.org Foundation C.I.C.

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

import { Room } from "matrix-js-sdk/src/models/room";

import { NotificationColor } from "./NotificationColor";
import { arrayDiff } from "../../utils/arrays";
import { RoomNotificationState } from "./RoomNotificationState";
import { NotificationState, NotificationStateEvents } from "./NotificationState";
import { MatrixClientPeg } from "../../MatrixClientPeg";

export type FetchRoomFn = (room: Room) => RoomNotificationState;

export class ListNotificationState extends NotificationState {
    // Only store room ids instead of hole rooms. The only time we need more than the room
    // ids is when calling the FetchRoomFn. It also allows to performantly copy a given rooms array
    // instead of storing a reference to it, which avoids potential side effects.
    private roomIds: string[] = [];
    private states: { [roomId: string]: RoomNotificationState } = {};

    constructor(private byTileCount = false, private getRoomFn: FetchRoomFn) {
        super();
    }

    public get symbol(): string {
        return this._color === NotificationColor.Unsent ? "!" : null;
    }

    public setRooms(rooms: Room[]) {
        // If we're only concerned about the tile count, don't bother setting up listeners.
        if (this.byTileCount) {
            this.roomIds = this.getRoomIdsFromRooms(rooms);
            this.calculateTotalState();
            return;
        }

        const oldRooms = this.roomIds;
        const diff = arrayDiff(oldRooms, this.getRoomIdsFromRooms(rooms));
        this.roomIds = this.getRoomIdsFromRooms(rooms);
        for (const oldRoomId of diff.removed) {
            const state = this.states[oldRoomId];
            if (!state) continue; // We likely just didn't have a badge (race condition)
            delete this.states[oldRoomId];
            state.off(NotificationStateEvents.Update, this.onRoomNotificationStateUpdate);
        }
        for (const newRoomId of diff.added) {
            const client = MatrixClientPeg.get();
            const state = this.getRoomFn(client.getRoom(newRoomId));
            state.on(NotificationStateEvents.Update, this.onRoomNotificationStateUpdate);
            this.states[newRoomId] = state;
        }

        this.calculateTotalState();
    }

    public getForRoom(room: Room) {
        const state = this.states[room.roomId];
        if (!state) throw new Error("Unknown room for notification state");
        return state;
    }

    public destroy() {
        super.destroy();
        for (const state of Object.values(this.states)) {
            state.off(NotificationStateEvents.Update, this.onRoomNotificationStateUpdate);
        }
        this.states = {};
    }

    private onRoomNotificationStateUpdate = () => {
        this.calculateTotalState();
    };

    private calculateTotalState() {
        const snapshot = this.snapshot();

        if (this.byTileCount) {
            this._color = NotificationColor.Red;
            this._count = this.roomIds.length;
        } else {
            this._count = 0;
            this._color = NotificationColor.None;
            for (const state of Object.values(this.states)) {
                this._count += state.count;
                this._color = Math.max(this.color, state.color);
            }
        }

        // finally, publish an update if needed
        this.emitIfUpdated(snapshot);
    }

    private getRoomIdsFromRooms = (rooms: Room[]) => {
        return rooms.map((room: Room) => room.roomId);
    };
}

