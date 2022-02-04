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
