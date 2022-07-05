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

import { IInvite3PID } from "matrix-js-sdk/src/@types/requests";
import { ClientEvent, MatrixClient } from "matrix-js-sdk/src/client";
import { EventType } from "matrix-js-sdk/src/matrix";
import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { KNOWN_SAFE_ROOM_VERSION, Room } from "matrix-js-sdk/src/models/room";
import { MEGOLM_ALGORITHM } from "matrix-js-sdk/src/crypto/olmlib";
import { logger } from "matrix-js-sdk/src/logger";

import createRoom, { canEncryptToAllUsers } from "../createRoom";
import { Action } from "../dispatcher/actions";
import { ViewRoomPayload } from "../dispatcher/payloads/ViewRoomPayload";
import { getAddressType } from "../UserAddress";
import DMRoomMap from "./DMRoomMap";
import { isJoinedOrNearlyJoined } from "./membership";
import dis from "../dispatcher/dispatcher";
import { privateShouldBeEncrypted } from "./rooms";
import { LocalRoom, LocalRoomState, LOCAL_ROOM_ID_PREFIX } from "../models/LocalRoom";
import * as thisModule from "./direct-messages";

/**
 * Tries to find a DM room with a specific user.
 *
 * @param {MatrixClient} client
 * @param {string} userId ID of the user to find the DM for
 * @returns {Room} Room if found
 */
export function findDMForUser(client: MatrixClient, userId: string): Room {
    const roomIds = DMRoomMap.shared().getDMRoomsForUserId(userId);
    const rooms = roomIds.map(id => client.getRoom(id));
    const suitableDMRooms = rooms.filter(r => {
        // Validate that we are joined and the other person is also joined. We'll also make sure
        // that the room also looks like a DM (until we have canonical DMs to tell us). For now,
        // a DM is a room of two people that contains those two people exactly. This does mean
        // that bots, assistants, etc will ruin a room's DM-ness, though this is a problem for
        // canonical DMs to solve.
        if (r && r.getMyMembership() === "join") {
            if (r instanceof LocalRoom) return false;

            const members = r.currentState.getMembers();
            const joinedMembers = members.filter(m => isJoinedOrNearlyJoined(m.membership));
            const otherMember = joinedMembers.find(m => m.userId === userId);
            return otherMember && joinedMembers.length === 2;
        }
        return false;
    }).sort((r1, r2) => {
        return r2.getLastActiveTimestamp() -
            r1.getLastActiveTimestamp();
    });
    if (suitableDMRooms.length) {
        return suitableDMRooms[0];
    }
}

/**
 * Tries to find a DM room with some other users.
 *
 * @param {MatrixClient} client
 * @param {Member[]} targets The Members to try to find the room for
 * @returns {Room | null} Resolved so the room if found, else null
 */
export function findDMRoom(client: MatrixClient, targets: Member[]): Room | null {
    const targetIds = targets.map(t => t.userId);
    let existingRoom: Room;
    if (targetIds.length === 1) {
        existingRoom = thisModule.findDMForUser(client, targetIds[0]);
    } else {
        existingRoom = DMRoomMap.shared().getDMRoomForIdentifiers(targetIds);
    }
    if (existingRoom) {
        return existingRoom;
    }
    return null;
}

export async function startDmOnFirstMessage(
    client: MatrixClient,
    targets: Member[],
): Promise<Room> {
    const existingRoom = thisModule.findDMRoom(client, targets);
    if (existingRoom) {
        dis.dispatch<ViewRoomPayload>({
            action: Action.ViewRoom,
            room_id: existingRoom.roomId,
            should_peek: false,
            joining: false,
            metricsTrigger: "MessageUser",
        });
        return existingRoom;
    }

    const room = await thisModule.createDmLocalRoom(client, targets);
    dis.dispatch({
        action: Action.ViewRoom,
        room_id: room.roomId,
        joining: false,
        targets,
    });
    return room;
}

/**
 * Create a DM local room. This room will not be send to the server and only exists inside the client.
 * It sets up the local room with some artificial state events
 * so that can be used in most components instead of a „real“ room.
 *
 * @async
 * @param {MatrixClient} client
 * @param {Member[]} targets DM partners
 * @returns {Promise<LocalRoom>} Resolves to the new local room
 */
export async function createDmLocalRoom(
    client: MatrixClient,
    targets: Member[],
): Promise<LocalRoom> {
    const userId = client.getUserId();

    const localRoom = new LocalRoom(LOCAL_ROOM_ID_PREFIX + client.makeTxnId(), client, userId);
    const events = [];

    events.push(new MatrixEvent({
        event_id: `~${localRoom.roomId}:${client.makeTxnId()}`,
        type: EventType.RoomCreate,
        content: {
            creator: userId,
            room_version: KNOWN_SAFE_ROOM_VERSION,
        },
        state_key: "",
        user_id: userId,
        sender: userId,
        room_id: localRoom.roomId,
        origin_server_ts: Date.now(),
    }));

    if (await determineCreateRoomEncryptionOption(client, targets)) {
        localRoom.encrypted = true;
        events.push(
            new MatrixEvent({
                event_id: `~${localRoom.roomId}:${client.makeTxnId()}`,
                type: EventType.RoomEncryption,
                content: {
                    algorithm: MEGOLM_ALGORITHM,
                },
                user_id: userId,
                sender: userId,
                state_key: "",
                room_id: localRoom.roomId,
                origin_server_ts: Date.now(),
            }),
        );
    }

    events.push(new MatrixEvent({
        event_id: `~${localRoom.roomId}:${client.makeTxnId()}`,
        type: EventType.RoomMember,
        content: {
            displayname: userId,
            membership: "join",
        },
        state_key: userId,
        user_id: userId,
        sender: userId,
        room_id: localRoom.roomId,
    }));

    targets.forEach((target: Member) => {
        events.push(new MatrixEvent({
            event_id: `~${localRoom.roomId}:${client.makeTxnId()}`,
            type: EventType.RoomMember,
            content: {
                displayname: target.name,
                avatar_url: target.getMxcAvatarUrl(),
                membership: "invite",
                isDirect: true,
            },
            state_key: target.userId,
            sender: userId,
            room_id: localRoom.roomId,
        }));
        events.push(new MatrixEvent({
            event_id: `~${localRoom.roomId}:${client.makeTxnId()}`,
            type: EventType.RoomMember,
            content: {
                displayname: target.name,
                avatar_url: target.getMxcAvatarUrl(),
                membership: "join",
            },
            state_key: target.userId,
            sender: target.userId,
            room_id: localRoom.roomId,
        }));
    });

    localRoom.targets = targets;
    localRoom.updateMyMembership("join");
    localRoom.addLiveEvents(events);
    localRoom.currentState.setStateEvents(events);
    client.store.storeRoom(localRoom);

    return localRoom;
}

/**
 * Detects whether a room should be encrypted.
 *
 * @async
 * @param {MatrixClient} client
 * @param {Member[]} targets The members to which run the check against
 * @returns {Promise<boolean>}
 */
async function determineCreateRoomEncryptionOption(client: MatrixClient, targets: Member[]): Promise<boolean> {
    if (privateShouldBeEncrypted()) {
        // Check whether all users have uploaded device keys before.
        // If so, enable encryption in the new room.
        const has3PidMembers = targets.some(t => t instanceof ThreepidMember);
        if (!has3PidMembers) {
            const targetIds = targets.map(t => t.userId);
            const allHaveDeviceKeys = await canEncryptToAllUsers(client, targetIds);
            if (allHaveDeviceKeys) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Applies the after-create callback of a local room.
 *
 * @async
 * @param {LocalRoom} localRoom
 * @param {string} roomId
 * @returns {Promise<void>} Resolved after all callbacks have been called
 */
async function applyAfterCreateCallbacks(localRoom: LocalRoom, roomId: string): Promise<void> {
    for (const afterCreateCallback of localRoom.afterCreateCallbacks) {
        await afterCreateCallback(roomId);
    }

    localRoom.afterCreateCallbacks = [];
}

/**
 * Tests whether a room created based on a local room is ready.
 */
export function isRoomReady(
    client: MatrixClient,
    localRoom: LocalRoom,
): boolean {
    // not ready if no actual room id exists
    if (!localRoom.actualRoomId) return false;

    const room = client.getRoom(localRoom.actualRoomId);
    // not ready if the room does not exist
    if (!room) return false;

    // not ready if not all members joined/invited
    if (room.getInvitedAndJoinedMemberCount() !== 1 + localRoom.targets?.length) return false;

    const roomHistoryVisibilityEvents = room.currentState.getStateEvents(EventType.RoomHistoryVisibility);
    // not ready if the room history has not been configured
    if (roomHistoryVisibilityEvents.length === 0) return false;

    const roomEncryptionEvents = room.currentState.getStateEvents(EventType.RoomEncryption);
    // not ready if encryption has not been configured (applies only to encrypted rooms)
    if (localRoom.encrypted === true && roomEncryptionEvents.length === 0) return false;

    return true;
}

/**
 * Starts a DM for a new local room.
 *
 * @async
 * @param {MatrixClient} client
 * @param {LocalRoom} localRoom
 * @returns {Promise<string | void>} Resolves to the created room id
 */
export async function createRoomFromLocalRoom(client: MatrixClient, localRoom: LocalRoom): Promise<string | void> {
    if (!localRoom.isNew) {
        // This action only makes sense for new local rooms.
        return;
    }

    localRoom.state = LocalRoomState.CREATING;
    client.emit(ClientEvent.Room, localRoom);

    return thisModule.startDm(client, localRoom.targets).then(
        (roomId) => {
            localRoom.actualRoomId = roomId;
            return thisModule.waitForRoomReadyAndApplyAfterCreateCallbacks(client, localRoom);
        },
        () => {
            logger.warn(`Error creating DM for local room ${localRoom.roomId}`);
            localRoom.state = LocalRoomState.ERROR;
            client.emit(ClientEvent.Room, localRoom);
        },
    );
}

/**
 * Waits until a room is ready and then applies the after-create local room callbacks.
 * Also implements a stopgap timeout after that a room is assumed to be ready.
 *
 * @see isRoomReady
 * @async
 * @param {MatrixClient} client
 * @param {LocalRoom} localRoom
 * @returns {Promise<string>} Resolved to the actual room id
 */
export async function waitForRoomReadyAndApplyAfterCreateCallbacks(
    client: MatrixClient,
    localRoom: LocalRoom,
): Promise<string> {
    if (thisModule.isRoomReady(client, localRoom)) {
        return applyAfterCreateCallbacks(localRoom, localRoom.actualRoomId).then(() => {
            localRoom.state = LocalRoomState.CREATED;
            client.emit(ClientEvent.Room, localRoom);
            return Promise.resolve(localRoom.actualRoomId);
        });
    }

    return new Promise((resolve) => {
        const finish = () => {
            if (checkRoomStateIntervalHandle) clearInterval(checkRoomStateIntervalHandle);
            if (stopgapTimeoutHandle) clearTimeout(stopgapTimeoutHandle);

            applyAfterCreateCallbacks(localRoom, localRoom.actualRoomId).then(() => {
                localRoom.state = LocalRoomState.CREATED;
                client.emit(ClientEvent.Room, localRoom);
                resolve(localRoom.actualRoomId);
            });
        };

        const stopgapFinish = () => {
            logger.warn(`Assuming local room ${localRoom.roomId} is ready after hitting timeout`);
            finish();
        };

        const checkRoomStateIntervalHandle = setInterval(() => {
            if (thisModule.isRoomReady(client, localRoom)) finish();
        }, 500);
        const stopgapTimeoutHandle = setTimeout(stopgapFinish, 5000);
    });
}

/**
 * Start a DM.
 *
 * @returns {Promise<string | null} Resolves to the room id.
 */
export async function startDm(client: MatrixClient, targets: Member[]): Promise<string | null> {
    const targetIds = targets.map(t => t.userId);

    // Check if there is already a DM with these people and reuse it if possible.
    let existingRoom: Room;
    if (targetIds.length === 1) {
        existingRoom = findDMForUser(client, targetIds[0]);
    } else {
        existingRoom = DMRoomMap.shared().getDMRoomForIdentifiers(targetIds);
    }
    if (existingRoom && !(existingRoom instanceof LocalRoom)) {
        dis.dispatch<ViewRoomPayload>({
            action: Action.ViewRoom,
            room_id: existingRoom.roomId,
            should_peek: false,
            joining: false,
            metricsTrigger: "MessageUser",
        });
        return Promise.resolve(existingRoom.roomId);
    }

    const createRoomOptions = { inlineErrors: true } as any; // XXX: Type out `createRoomOptions`

    if (await determineCreateRoomEncryptionOption(client, targets)) {
        createRoomOptions.encryption = true;
    }

    // Check if it's a traditional DM and create the room if required.
    // TODO: [Canonical DMs] Remove this check and instead just create the multi-person DM
    const isSelf = targetIds.length === 1 && targetIds[0] === client.getUserId();
    if (targetIds.length === 1 && !isSelf) {
        createRoomOptions.dmUserId = targetIds[0];
    }

    if (targetIds.length > 1) {
        createRoomOptions.createOpts = targetIds.reduce(
            (roomOptions, address) => {
                const type = getAddressType(address);
                if (type === 'email') {
                    const invite: IInvite3PID = {
                        id_server: client.getIdentityServerUrl(true),
                        medium: 'email',
                        address,
                    };
                    roomOptions.invite_3pid.push(invite);
                } else if (type === 'mx-user-id') {
                    roomOptions.invite.push(address);
                }
                return roomOptions;
            },
            { invite: [], invite_3pid: [] },
        );
    }

    createRoomOptions.spinner = false;
    return createRoom(createRoomOptions);
}

// This is the interface that is expected by various components in the Invite Dialog and RoomInvite.
// It is a bit awkward because it also matches the RoomMember class from the js-sdk with some extra support
// for 3PIDs/email addresses.
export abstract class Member {
    /**
     * The display name of this Member. For users this should be their profile's display
     * name or user ID if none set. For 3PIDs this should be the 3PID address (email).
     */
    public abstract get name(): string;

    /**
     * The ID of this Member. For users this should be their user ID. For 3PIDs this should
     * be the 3PID address (email).
     */
    public abstract get userId(): string;

    /**
     * Gets the MXC URL of this Member's avatar. For users this should be their profile's
     * avatar MXC URL or null if none set. For 3PIDs this should always be null.
     */
    public abstract getMxcAvatarUrl(): string;
}

export class DirectoryMember extends Member {
    private readonly _userId: string;
    private readonly displayName?: string;
    private readonly avatarUrl?: string;

    // eslint-disable-next-line camelcase
    constructor(userDirResult: { user_id: string, display_name?: string, avatar_url?: string }) {
        super();
        this._userId = userDirResult.user_id;
        this.displayName = userDirResult.display_name;
        this.avatarUrl = userDirResult.avatar_url;
    }

    // These next class members are for the Member interface
    get name(): string {
        return this.displayName || this._userId;
    }

    get userId(): string {
        return this._userId;
    }

    getMxcAvatarUrl(): string {
        return this.avatarUrl;
    }
}

export class ThreepidMember extends Member {
    private readonly id: string;

    constructor(id: string) {
        super();
        this.id = id;
    }

    // This is a getter that would be falsy on all other implementations. Until we have
    // better type support in the react-sdk we can use this trick to determine the kind
    // of 3PID we're dealing with, if any.
    get isEmail(): boolean {
        return this.id.includes('@');
    }

    // These next class members are for the Member interface
    get name(): string {
        return this.id;
    }

    get userId(): string {
        return this.id;
    }

    getMxcAvatarUrl(): string {
        return null;
    }
}

export interface IDMUserTileProps {
    member: Member;
    onRemove(member: Member): void;
}
