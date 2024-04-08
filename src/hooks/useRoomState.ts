/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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

import { useCallback, useEffect, useRef, useState } from "react";
import { EventTimeline, Room, RoomState, RoomStateEvent } from "matrix-js-sdk/src/matrix";

import { useTypedEventEmitter } from "./useEventEmitter";

type Mapper<T> = (roomState: RoomState) => T;
const defaultMapper: Mapper<RoomState> = (roomState: RoomState) => roomState;

// Hook to simplify watching Matrix Room state
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
export const useRoomState = <T extends any = RoomState>(
    room?: Room,
    mapper: Mapper<T> = defaultMapper as Mapper<T>,
): T => {
    function getCurrentState(room: Room | undefined): RoomState | undefined {
        return room?.getLiveTimeline().getState(EventTimeline.FORWARDS);
    }
    // Create a ref that stores mapper
    const savedMapper = useRef(mapper);

    // Update ref.current value if mapper changes.
    useEffect(() => {
        savedMapper.current = mapper;
    }, [mapper]);

    const [value, setValue] = useState<T>(() => {
        const roomState = getCurrentState(room);
        return roomState ? mapper(roomState) : (undefined as T);
    });

    const update = useCallback(() => {
        const roomState = getCurrentState(room);
        if (!roomState) return;
        setValue(savedMapper.current(roomState));
    }, [room]);

    useTypedEventEmitter(room, RoomStateEvent.Update, update);
    useEffect(() => {
        update();
        return () => {
            const roomState = getCurrentState(room);
            setValue(roomState ? savedMapper.current(roomState) : (undefined as T));
        };
    }, [room, update]);
    return value;
};
