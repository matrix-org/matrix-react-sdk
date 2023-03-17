/*
Copyright 2023 The Matrix.org Foundation C.I.C.

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

import { logger } from "matrix-js-sdk/src/logger";
import { MatrixEvent, Room, RoomMember } from "matrix-js-sdk/src/matrix";
import { useCallback, useMemo, useState } from "react";

import { ButtonEvent } from "../components/views/elements/AccessibleButton";
import { PillType } from "../components/views/elements/Pill";
import { MatrixClientPeg } from "../MatrixClientPeg";
import { parsePermalink } from "../utils/permalinks/Permalinks";
import dis from "../dispatcher/dispatcher";
import { Action } from "../dispatcher/actions";
import { PermalinkParts } from "../utils/permalinks/PermalinkConstructor";
import { _t } from "../languageHandler";

interface Args {
    /** Room in which the permalink should be displayed. */
    room?: Room;
    /** When set forces the permalink type. */
    type?: PillType;
    /** Permalink URL. */
    url?: string;
}

interface HookResult {
    /**
     * Room member of a user mention permalink.
     * null for other links, if the profile was not found or not yet loaded.
     * This can change, for instance, from null to a RoomMember after the profile lookup completed.
     */
    member: RoomMember | null;
    /**
     * Displayable text of the permalink resource. Can for instance be a user or room name.
     * null here means that there is nothing to display. Most likely if the URL was not a permalink.
     */
    text: string | null;
    /**
     * Should be used for click actions on the permalink.
     * In case of a user permalink, a view profile action is dispatched.
     */
    onClick: (e: ButtonEvent) => void;
    /**
     * This can be for instance a user or room Id.
     * null here means that the resource cannot be detected. Most likely if the URL was not a permalink.
     */
    resourceId: string | null;
    /**
     * Target room of the permalink:
     * For an @room mention, this is the room where the permalink should be displayed.
     * For a room permalink, it is the room from the permalink.
     * null for other links or if the room cannot be found.
     */
    targetRoom: Room | null;
    /**
     * Type of the pill plus "space" for spaces.
     * null here means that the type cannot be detected. Most likely if the URL was not a permalink.
     */
    type: PillType | "space" | null;
}

/**
 * Tries to determine the pill type.
 *
 * If forcedType is present it will be returned.
 * If the parse result contains a room Id or alias and an event Id:
 * - Type is EventInSameRoom if the permalink room Id or alias equals the parsed room Id or alias
 * - Type is EventInOtherRoom if the permalink room Id or alias not equals the parsed room Id or alias
 * If the parse result contains a primary entity Id it will try to detect the type from it.
 * Otherwise returns null.
 *
 * @param forcedType - Forced pill type. Will be used if present and short-circuits all othe conditions.
 * @param parseResult - Permalink parser result
 * @param permalinkRoom - Room in which the permalink is displayed.
 * @returns Pill type or null if unable to determine.
 */
const determineType = (
    forcedType: PillType | undefined,
    parseResult: PermalinkParts | null,
    permalinkRoom: Room | undefined,
): PillType | null => {
    if (forcedType) return forcedType;

    if (parseResult?.roomIdOrAlias && parseResult?.eventId) {
        if (parseResult.roomIdOrAlias === permalinkRoom?.roomId) {
            return PillType.EventInSameRoom;
        }

        return PillType.EventInOtherRoom;
    }

    if (parseResult?.primaryEntityId) {
        const prefix = parseResult.primaryEntityId[0] || "";
        return (
            {
                "@": PillType.UserMention,
                "#": PillType.RoomMention,
                "!": PillType.RoomMention,
            }[prefix] || null
        );
    }

    return null;
};

/**
 * Tries to determine the user Id of a permalink.
 * In case of a user permalink it is the user id.
 * In case of an event permalink it is the sender user Id of the event if that event is available.
 * Otherwise returns null.
 *
 * @param type - pill type
 * @param parseResult - permalink parse result
 * @param event - permalink event, if available
 * @returns permalink user Id. null if the Id cannot be determined.
 */
const determineUserId = (
    type: PillType | null,
    parseResult: PermalinkParts | null,
    event: MatrixEvent | null,
): string | null => {
    if (type === null) return null;

    if (parseResult?.userId) return parseResult.userId;

    if (event && [PillType.EventInSameRoom, PillType.EventInOtherRoom].includes(type)) {
        return event.getSender() ?? null;
    }

    return null;
};

/**
 * Tries to find a room by room Id or searching all rooms for an alias.
 *
 * @param roomIdOrAlias - Id or alias of the room to find.
 * @returns Room if found, else null.
 */
const findRoom = (roomIdOrAlias: string): Room | null => {
    const client = MatrixClientPeg.get();

    return roomIdOrAlias[0] === "#"
        ? client.getRooms().find((r) => {
              return r.getCanonicalAlias() === roomIdOrAlias || r.getAltAliases().includes(roomIdOrAlias);
          }) ?? null
        : client.getRoom(roomIdOrAlias);
};

/**
 * Tries to determine the initial room.
 * Initial here means it should be possible to load the room without sending API requests.
 * For an @room or a user mention it is the permalinkRoom.
 * If the parse result contains a room Id or alias try to find it with {@link findRoom}.
 * Otherwise returns null.
 *
 * @param type - Pill type
 * @param permalinkRoom - Room in which the permalink is displayed.
 * @param parseResult - Permalink parser result
 * @returns Initial room or null if it cannot be determined.
 */
const determineInitialRoom = (
    type: PillType | null,
    permalinkRoom: Room | undefined,
    parseResult: PermalinkParts | null,
): Room | null => {
    if (type === PillType.AtRoomMention && permalinkRoom) return permalinkRoom;

    if (type === PillType.UserMention && permalinkRoom) {
        return permalinkRoom;
    }

    if (parseResult?.roomIdOrAlias) {
        const room = findRoom(parseResult.roomIdOrAlias);
        if (room) return room;
    }

    return null;
};

/**
 * Tries to find the initial event.
 * If the event should not be looked up or there is no target room it returns null.
 * Otherwise it tries to get the event from the target room.
 *
 * @param shouldLookUpEvent - whether the parmalink event should be looked up
 * @param Room | null targetRoom - target room of the permalink
 * @param parseResult - permalink parse result
 * @returns The event if found or null if it should not be looked up or was not found.
 */
const determineInitialEvent = (
    shouldLookUpEvent: boolean,
    targetRoom: Room | null,
    parseResult: PermalinkParts | null,
): MatrixEvent | null => {
    if (!shouldLookUpEvent || !targetRoom || !parseResult?.eventId) return null;

    return targetRoom.findEventById(parseResult.eventId) || null;
};

/**
 * Can be used to retrieve all information needed to display a permalink.
 */
export const usePermalink: (args: Args) => HookResult = ({
    room: permalinkRoom,
    type: forcedType,
    url,
}): HookResult => {
    let resourceId: string | null = null;
    let parseResult: PermalinkParts | null = null;

    if (url) {
        parseResult = parsePermalink(url);

        if (parseResult?.primaryEntityId) {
            resourceId = parseResult.primaryEntityId;
        }
    }

    const type = determineType(forcedType, parseResult, permalinkRoom);

    // The listed permalink types require a room.
    // If it cannot be initially determined, it will be looked up later by a memo hook.
    const shouldLookUpRoom =
        type && [PillType.RoomMention, PillType.EventInSameRoom, PillType.EventInOtherRoom, "space"].includes(type);
    const initialRoom = determineInitialRoom(type, permalinkRoom, parseResult);
    const [targetRoom, setTargetRoom] = useState<Room | null>(initialRoom);

    // Event permalinks require to know the event.
    // If it cannot be initially determined, it will be looked up later by a memo hook.
    const shouldLookUpEvent =
        !!type &&
        !!parseResult?.roomIdOrAlias &&
        !!parseResult?.eventId &&
        [PillType.EventInSameRoom, PillType.EventInOtherRoom].includes(type);
    const eventId = parseResult?.eventId;
    const eventInRoom = determineInitialEvent(shouldLookUpEvent, targetRoom, parseResult);
    const [event, setEvent] = useState<MatrixEvent | null>(eventInRoom);

    // User mentions and permalinks to events in the same room require to know the user.
    // If it cannot be initially determined, it will be looked up later by a memo hook.
    const shouldLookUpUser = type && [PillType.UserMention, PillType.EventInSameRoom].includes(type);
    const userId = determineUserId(type, parseResult, event);
    const userInRoom = shouldLookUpUser && userId && targetRoom ? targetRoom.getMember(userId) : null;
    const [member, setMember] = useState<RoomMember | null>(userInRoom);

    const doProfileLookup = useCallback((userId: string): void => {
        MatrixClientPeg.get()
            .getProfileInfo(userId)
            .then((resp) => {
                const newMember = new RoomMember("", userId);
                newMember.name = resp.displayname || userId;
                newMember.rawDisplayName = resp.displayname || userId;
                newMember.getMxcAvatarUrl();
                newMember.events.member = {
                    getContent: () => {
                        return { avatar_url: resp.avatar_url };
                    },
                    getDirectionalContent: function () {
                        // eslint-disable-next-line
                        return this.getContent();
                    },
                } as MatrixEvent;
                setMember(newMember);
            })
            .catch((err) => {
                logger.error("Could not retrieve profile data for " + userId + ":", err);
            });
    }, []);

    // User lookup
    useMemo(() => {
        if (!shouldLookUpUser || !userId || member) {
            // nothing to do here
            return;
        }

        const foundMember = targetRoom?.getMember(userId) ?? null;
        setMember(foundMember);

        if (!foundMember) {
            doProfileLookup(userId);
        }
    }, [doProfileLookup, member, shouldLookUpUser, targetRoom, userId]);

    // Event lookup
    useMemo(async () => {
        if (!shouldLookUpEvent || !eventId || event || !parseResult?.roomIdOrAlias || !parseResult.eventId) {
            // nothing to do here
            return;
        }

        try {
            const eventData = await MatrixClientPeg.get().fetchRoomEvent(
                parseResult.roomIdOrAlias,
                parseResult.eventId,
            );
            setEvent(new MatrixEvent(eventData));
        } catch {}
    }, [event, eventId, parseResult?.eventId, parseResult?.roomIdOrAlias, shouldLookUpEvent]);

    // Room lookup
    useMemo(() => {
        if (shouldLookUpRoom && !targetRoom && parseResult?.roomIdOrAlias) {
            const newRoom = findRoom(parseResult.roomIdOrAlias);
            setTargetRoom(newRoom);
        }
    }, [parseResult?.roomIdOrAlias, shouldLookUpRoom, targetRoom]);

    let onClick: (e: ButtonEvent) => void = () => {};
    let text = resourceId;

    if (type === PillType.AtRoomMention && permalinkRoom) {
        text = "@room";
    } else if (type === PillType.UserMention && member) {
        text = member.name || resourceId;
        onClick = (e: ButtonEvent): void => {
            e.preventDefault();
            e.stopPropagation();
            dis.dispatch({
                action: Action.ViewUser,
                member: member,
            });
        };
    } else if (type === PillType.RoomMention) {
        if (targetRoom) {
            text = targetRoom.name || resourceId;
        }
    } else if (type === PillType.EventInSameRoom) {
        text = member?.name || _t("User");
    } else if (type === PillType.EventInOtherRoom) {
        text = targetRoom?.name || _t("Room");
    }

    return {
        member,
        onClick,
        resourceId,
        targetRoom,
        text,
        type,
    };
};
