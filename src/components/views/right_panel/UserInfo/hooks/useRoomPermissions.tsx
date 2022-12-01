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

import { EventType, MatrixClient, Room, RoomMember, RoomStateEvent } from "matrix-js-sdk/src/matrix";
import { useCallback, useEffect, useState } from "react";

import { useTypedEventEmitter } from "../../../../../hooks/useEventEmitter";
import { RoomPermissions } from "../@types";

export function useRoomPermissions(cli: MatrixClient, room: Room, user: RoomMember): RoomPermissions {
    const [roomPermissions, setRoomPermissions] = useState<RoomPermissions>({
        // modifyLevelMax is the max PL we can set this user to, typically min(their PL, our PL) && canSetPL
        modifyLevelMax: -1,
        canEdit: false,
        canInvite: false,
    });

    const updateRoomPermissions = useCallback(() => {
        const powerLevels = room?.currentState.getStateEvents(EventType.RoomPowerLevels, "")?.getContent();
        if (!powerLevels) return;

        const me = room.getMember(cli.getUserId());
        if (!me) return;

        const them = user;
        const isMe = me.userId === them.userId;
        const canAffectUser = them.powerLevel < me.powerLevel || isMe;

        let modifyLevelMax = -1;
        if (canAffectUser) {
            const editPowerLevel = powerLevels.events?.[EventType.RoomPowerLevels] ?? powerLevels.state_default ?? 50;
            if (me.powerLevel >= editPowerLevel) {
                modifyLevelMax = me.powerLevel;
            }
        }

        setRoomPermissions({
            canInvite: me.powerLevel >= (powerLevels.invite ?? 0),
            canEdit: modifyLevelMax >= 0,
            modifyLevelMax,
        });
    }, [cli, user, room]);

    useTypedEventEmitter(cli, RoomStateEvent.Update, updateRoomPermissions);
    useEffect(() => {
        updateRoomPermissions();
        return () => {
            setRoomPermissions({
                modifyLevelMax: -1,
                canEdit: false,
                canInvite: false,
            });
        };
    }, [updateRoomPermissions]);

    return roomPermissions;
}
