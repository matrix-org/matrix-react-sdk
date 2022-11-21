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

import { IInstance, IProtocol, IPublicRoomsChunkRoom, MatrixClient } from "matrix-js-sdk/src/client";
import { ViewRoom as ViewRoomEvent } from "@matrix-org/analytics-events/types/typescript/ViewRoom";

import { Action } from "../dispatcher/actions";
import { ViewRoomPayload } from "../dispatcher/payloads/ViewRoomPayload";
import { getE2EEWellKnown } from "./WellKnownUtils";
import dis from "../dispatcher/dispatcher";
import { getDisplayAliasForAliasSet } from "../Rooms";
import { _t } from "../languageHandler";

export function privateShouldBeEncrypted(): boolean {
    const e2eeWellKnown = getE2EEWellKnown();
    if (e2eeWellKnown) {
        const defaultDisabled = e2eeWellKnown["default"] === false;
        return !defaultDisabled;
    }
    return true;
}

interface IShowRoomOpts {
    roomAlias?: string;
    autoJoin?: boolean;
    shouldPeek?: boolean;
    roomServer?: string;
    metricsTrigger: ViewRoomEvent["trigger"];
}

export const showRoom = (
    client: MatrixClient,
    room: IPublicRoomsChunkRoom | null,
    {
        roomAlias,
        autoJoin = false,
        shouldPeek = false,
        roomServer,
    }: IShowRoomOpts,
): void => {
    const payload: ViewRoomPayload = {
        action: Action.ViewRoom,
        auto_join: autoJoin,
        should_peek: shouldPeek,
        metricsTrigger: "RoomDirectory",
    };
    if (room) {
        // Don't let the user view a room they won't be able to either
        // peek or join: fail earlier so they don't have to click back
        // to the directory.
        if (client.isGuest()) {
            if (!room.world_readable && !room.guest_can_join) {
                dis.dispatch({ action: 'require_registration' });
                return;
            }
        }

        if (!roomAlias) {
            roomAlias = getDisplayAliasForAliasSet(room.canonical_alias, room.aliases);
        }

        payload.oob_data = {
            avatarUrl: room.avatar_url,
            // XXX: This logic is duplicated from the JS SDK which
            // would normally decide what the name is.
            name: room.name || roomAlias || _t('Unnamed room'),
        };

        if (roomServer) {
            payload.via_servers = [roomServer];
        }
    }
    // It's not really possible to join Matrix rooms by ID because the HS has no way to know
    // which servers to start querying. However, there's no other way to join rooms in
    // this list without aliases at present, so if roomAlias isn't set here we have no
    // choice but to supply the ID.
    if (roomAlias) {
        payload.room_alias = roomAlias;
    } else {
        payload.room_id = room.room_id;
    }
    dis.dispatch(payload);
};

export function getFieldsForThirdPartyLocation(
    userInput: string,
    protocol: IProtocol,
    instance: IInstance,
): { searchFields?: string[] } | null {
    // make an object with the fields specified by that protocol. We
    // require that the values of all but the last field come from the
    // instance. The last is the user input.
    const requiredFields = protocol.location_fields;
    if (!requiredFields) return null;
    const fields = {};
    for (let i = 0; i < requiredFields.length - 1; ++i) {
        const thisField = requiredFields[i];
        if (instance.fields[thisField] === undefined) return null;
        fields[thisField] = instance.fields[thisField];
    }
    fields[requiredFields[requiredFields.length - 1]] = userInput;
    return fields;
}
