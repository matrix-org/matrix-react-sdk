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

import { SpaceKey } from ".";

type SpaceRoomMap = Map<SpaceKey, Set<string>>;
type SpaceDescendantMap = Map<SpaceKey, Set<SpaceKey>>;

const traverseSpaceDescendants = (spaceDescendantMap: SpaceDescendantMap) =>
    (spaceId: SpaceKey, flatSpace = new Set<SpaceKey>()): Set<SpaceKey> => {
        flatSpace.add(spaceId);
        const descendentSpaces = spaceDescendantMap.get(spaceId);
        descendentSpaces?.forEach(
            descendantSpaceId => {
                if (!flatSpace.has(descendantSpaceId)) {
                    traverseSpaceDescendants(spaceDescendantMap)(descendantSpaceId, flatSpace);
                }
            },
        );

        return flatSpace;
    };

/**
 * Helper function to traverse space heirachy and flatten
 * @param spaceRoomMap ie map of rooms or dms
 * @param spaceDescendantMap map of spaces and their children
 * @returns set of all rooms
 */
export const flattenSpaceHierarchy = (spaceRoomMap: SpaceRoomMap, spaceDescendantMap: SpaceDescendantMap) =>
    (spaceId: SpaceKey): Set<string> => {
        const flattenedSpaceIds = traverseSpaceDescendants(spaceDescendantMap)(spaceId);
        const flattenedRooms = new Set<string>();

        flattenedSpaceIds.forEach(id => {
            const roomIds = spaceRoomMap.get(id);
            roomIds?.forEach(flattenedRooms.add, flattenedRooms);
        });

        return flattenedRooms;
    };
