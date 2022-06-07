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

import defaultDispatcher from "../dispatcher/dispatcher";
import { MatrixClientPeg } from "../MatrixClientPeg";
import { LocalRoom, LOCAL_ROOM_ID_PREFIX } from "../models/LocalRoom";

export async function doMaybeLocalRoomAction<T>(
    roomId: string,
    fn: (actualRoomId: string) => Promise<T>,
    client?: MatrixClient,
): Promise<T> {
    if (roomId.startsWith(LOCAL_ROOM_ID_PREFIX)) {
        client = client ?? MatrixClientPeg.get();
        const room = client.getRoom(roomId) as LocalRoom;

        if (room.isCreated) {
            return fn(room.realRoomId);
        }

        return new Promise<T>((resolve, reject) => {
            room.afterCreateCallbacks.push((newRoomId: string) => {
                fn(newRoomId).then(resolve).catch(reject);
            });
            defaultDispatcher.dispatch({
                action: "local_room_event",
                roomId: room.roomId,
            });
        });
    }

    return fn(roomId);
}
