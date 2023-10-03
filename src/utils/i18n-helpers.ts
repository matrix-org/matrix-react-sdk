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

import { Room } from "matrix-js-sdk/src/matrix";

import SpaceStore from "../stores/spaces/SpaceStore";
import { _t } from "../languageHandler";
import DMRoomMap from "./DMRoomMap";
import { formatList } from "./FormattingUtils";

export interface RoomContextDetails {
    details: string | null;
    ariaLabel?: string;
}

export function roomContextDetails(room: Room): RoomContextDetails | null {
    const dmPartner = DMRoomMap.shared().getUserIdForRoomId(room.roomId);
    // if we’ve got more than 2 users, don’t treat it like a regular DM
    const isGroupDm = room.getMembers().length > 2;
    if (!room.isSpaceRoom() && dmPartner && !isGroupDm) {
        return { details: dmPartner };
    }

    const [parent, secondParent, ...otherParents] = SpaceStore.instance.getKnownParents(room.roomId);
    if (secondParent && !otherParents?.length) {
        // exactly 2 edge case for improved i18n
        const space1Name = room.client.getRoom(parent)?.name;
        const space2Name = room.client.getRoom(secondParent)?.name;
        return {
            details: formatList([space1Name ?? "", space2Name ?? ""]),
            ariaLabel: _t("in_space1_and_space2", { space1Name, space2Name }),
        };
    } else if (parent) {
        const spaceName = room.client.getRoom(parent)?.name ?? "";
        const count = otherParents.length;
        if (count > 0) {
            return {
                details: formatList([spaceName, ...otherParents], 1),
                ariaLabel: _t("in_space_and_n_other_spaces", { spaceName, count }),
            };
        }
        return {
            details: spaceName,
            ariaLabel: _t("in_space", { spaceName }),
        };
    }

    return { details: room.getCanonicalAlias() };
}
