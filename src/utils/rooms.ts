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

import { IProtocol, IPublicRoomsChunkRoom } from "matrix-js-sdk/src/client";

import { getDisplayAliasForAliasSet } from "../Rooms";
import { getE2EEWellKnown } from "./WellKnownUtils";

export type Protocols = Record<string, IProtocol>;

export function privateShouldBeEncrypted(): boolean {
    const e2eeWellKnown = getE2EEWellKnown();
    if (e2eeWellKnown) {
        const defaultDisabled = e2eeWellKnown["default"] === false;
        return !defaultDisabled;
    }
    return true;
}

// Similar to matrix-react-sdk's MatrixTools.getDisplayAliasForRoom
// but works with the objects we get from the public room list
export function getDisplayAliasForRoom(room: IPublicRoomsChunkRoom) {
    return getDisplayAliasForAliasSet(room.canonical_alias, room.aliases);
}
