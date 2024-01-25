/*
Copyright 2020 The Matrix.org Foundation C.I.C.

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

import { useCallback, useState } from "react";
import { ClientEvent, MatrixClient, MatrixEvent } from "matrix-js-sdk/src/matrix";

import { useTypedEventEmitter } from "./useEventEmitter";

const tryGetContent = <T extends {}>(ev?: MatrixEvent): T | undefined => ev?.getContent<T>();

// Hook to simplify listening to Matrix account data
export const useAccountData = <T extends {}>(cli: MatrixClient, eventType: string): T => {
    const [value, setValue] = useState<T | undefined>(() => tryGetContent<T>(cli.getAccountData(eventType)));

    const handler = useCallback(
        (event) => {
            if (event.getType() !== eventType) return;
            setValue(event.getContent());
        },
        [eventType],
    );
    useTypedEventEmitter(cli, ClientEvent.AccountData, handler);

    return value || ({} as T);
};

// Currently not used, commenting out otherwise the dead code CI is unhappy.
// But this code is valid and probably will be needed.

// export const useRoomAccountData = <T extends {}>(room: Room, eventType: string): T => {
//     const [value, setValue] = useState<T | undefined>(() => tryGetContent<T>(room.getAccountData(eventType)));

//     const handler = useCallback(
//         (event) => {
//             if (event.getType() !== eventType) return;
//             setValue(event.getContent());
//         },
//         [eventType],
//     );
//     useTypedEventEmitter(room, RoomEvent.AccountData, handler);

//     return value || ({} as T);
// };
