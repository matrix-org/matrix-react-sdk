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

import { EventType, MatrixClient, MatrixEvent, Room, RoomStateEvent } from "matrix-js-sdk/src/matrix";
import { useCallback, useEffect, useState } from "react";

import { useTypedEventEmitter } from "../../../../../hooks/useEventEmitter";
import { PowerLevelsContent } from "../@types";

const getPowerLevels = (room) => room?.currentState?.getStateEvents(EventType.RoomPowerLevels, "")?.getContent() || {};

export const useRoomPowerLevels = (cli: MatrixClient, room: Room) => {
    const [powerLevels, setPowerLevels] = useState<PowerLevelsContent>(getPowerLevels(room));

    const update = useCallback(
        (ev?: MatrixEvent) => {
            if (!room) return;
            if (ev && ev.getType() !== EventType.RoomPowerLevels) return;
            setPowerLevels(getPowerLevels(room));
        },
        [room],
    );

    useTypedEventEmitter(cli, RoomStateEvent.Events, update);
    useEffect(() => {
        update();
        return () => {
            setPowerLevels({});
        };
    }, [update]);
    return powerLevels;
};
