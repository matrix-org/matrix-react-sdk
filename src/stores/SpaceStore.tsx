/*
Copyright 2020 The Matrix.org Foundation C.I.C.

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

import {EventType} from "matrix-js-sdk/src/@types/event";
import {Room} from "matrix-js-sdk/src/models/room";
import {MatrixEvent} from "matrix-js-sdk/src/models/event";

import {AsyncStoreWithClient} from "./AsyncStoreWithClient";
import defaultDispatcher from "../dispatcher/dispatcher";
import {ActionPayload} from "../dispatcher/payloads";
import RoomListStore from "./room-list/RoomListStore";
import SettingsStore from "../settings/SettingsStore";
import {Action} from "../dispatcher/actions";
import Modal from "../Modal";
import SpaceSettingsDialog from "../components/views/dialogs/SpaceSettingsDialog";
import {OpenSpaceSettingsPayload} from "../dispatcher/payloads/OpenSpaceSettingsPayload";
import DMRoomMap from "../utils/DMRoomMap";
import {FetchRoomFn} from "./notifications/ListNotificationState";
import {SpaceNotificationState} from "./notifications/SpaceNotificationState";
import {RoomNotificationStateStore} from "./notifications/RoomNotificationStateStore";
import {DefaultTagID} from "./room-list/models";
import {EnhancedMap, mapDiff} from "../utils/maps";
import {setHasDiff} from "../utils/sets";
import {objectDiff} from "../utils/objects";
import {arrayHasDiff} from "../utils/arrays";

type SpaceKey = string | symbol;

interface IState {}

const ACTIVE_SPACE_LS_KEY = "mx_active_space";

export const HOME_SPACE = Symbol("home-space");

// TODO verify/fix leaving spaces un-attaching any rooms that were bound via them
// TODO use throttles where possible to decouple from the critical path - or delta updates for everything
// TODO when leaving a space reset active to HOME_SPACE
export const UPDATE_TOP_LEVEL_SPACES = Symbol("top-level-spaces");
export const UPDATE_SELECTED_SPACE = Symbol("selected-space");
// Space Room ID/HOME_SPACE will be emitted when a Space's children change (recursive)

const partitionSpacesAndRooms = (arr: Room[]): [Room[], Room[]] => { // [spaces, rooms]
    return arr.reduce((result, room: Room) => {
        result[room.isSpaceRoom() ? 0 : 1].push(room);
        return result;
    }, [[], []]);
};

const getRoomFn: FetchRoomFn = (room: Room) => {
    return RoomNotificationStateStore.instance.getRoomState(room);
};

export class SpaceStoreClass extends AsyncStoreWithClient<IState> {
    constructor() {
        super(defaultDispatcher, {});

        if (!SettingsStore.getValue("feature_spaces")) return;
    }

    // TODO docs
    private rootSpaces: Room[] = [];
    private orphanedRooms: Room[] = [];
    private parentMap = new EnhancedMap<string, Set<Room>>();
    private notificationStateMap = new Map<SpaceKey, SpaceNotificationState>();

    // Map from top level space ID/HOME_SPACE to Set of room IDs that should be shown as part of that filter
    private spaceFilteredRooms = new Map<string | symbol, Set<string>>();
    // if _activeSpace is not in parentSpaces then show it on top of the list and peek it
    // if null then `Home` is selected
    private _activeSpace?: Room = null; // TODO use HOME_SPACE and keys here?

    // Map from room ID to ordered list of spaces we are in which contain it
    // If we are in the canonical parent space of the room then that'll be entry [0]
    // private roomSpaceMap = new Map<string, Room[]>(); // TODO do we want the advanced behaviour

    public get spacePanelSpaces(): Room[] {
        return this.rootSpaces;
    }

    public get activeSpace(): Room | null {
        return this._activeSpace || null;
    }

    public setActiveSpace(space: Room) {
        if (space === this.activeSpace) return;

        this._activeSpace = space;
        this.emit(UPDATE_SELECTED_SPACE, this.activeSpace);

        // persist space selected
        if (space) {
            window.localStorage.setItem(ACTIVE_SPACE_LS_KEY, space.roomId);
        } else {
            window.localStorage.removeItem(ACTIVE_SPACE_LS_KEY);
        }
    }

    public addRoomToSpace(space: Room, roomId: string, via: string[]) {
        return this.matrixClient.sendStateEvent(space.roomId, EventType.SpaceChild, { present: true, via }, roomId);
    }

    private getChildren(spaceId: string): Room[] {
        const room = this.matrixClient?.getRoom(spaceId);
        return room?.currentState.getStateEvents(EventType.SpaceChild).map(ev =>
            this.matrixClient.getRoom(ev.getStateKey())).filter(Boolean) || [];
    }

    public getChildRooms(spaceId: string): Room[] {
        return this.getChildren(spaceId).filter(r => !r.isSpaceRoom());
    }

    public getChildSpaces(spaceId: string): Room[] {
        return this.getChildren(spaceId).filter(r => r.isSpaceRoom());
    }

    //////////////////////////////////////////////////////////////////////

    public getSpaces = () => {
        return this.matrixClient.getRooms().filter(r => r.isSpaceRoom() && r.getMyMembership() === "join");
    };

    public getSpaceFilteredRoomIds = (space: Room | null): Set<string> => {
        return this.spaceFilteredRooms.get(space?.roomId || HOME_SPACE) || new Set();
    };

    //////////////////////////////////////////////////////////////////////

    // private bubbleUpdate = (space: Room) => {
    //     // TODO
    //     const updated = new Set<Room>();
    //     const stack = [space];
    //     while (stack.length) { // iter dfs
    //         const op = stack.pop();
    //         this.emit(op.roomId);
    //         updated.add(op);
    //
    //         if (this.parentMap.has(op)) {
    //             stack.push(...this.parentMap.get(op));
    //         }
    //     }
    // };

    public rebuild = () => { // exported for tests
        const visibleRooms = this.matrixClient.getVisibleRooms();

        const spaces = this.getSpaces();
        const unseenChildren = new Set<Room>([...visibleRooms, ...spaces]);

        const backrefs = new EnhancedMap<string, Set<string>>();

        // TODO handle cleaning up links when a Room is removed on room membership
        // TODO sort the nodes (spaces) into a consistent order so that the cycle prevention is consistent
        // TODO pre-process the tree, resolve top level spaces and orphaned rooms, prevent cycles
        spaces.forEach(space => {
            const children = this.getChildren(space.roomId);
            children.forEach(child => {
                unseenChildren.delete(child);

                backrefs.getOrCreate(child.roomId, new Set()).add(space.roomId);
            });

            // const [childSpaces, childRooms] = partitionSpacesAndRooms(children);
        });

        // TODO we aren't using orphanedRooms yet, but its a nice optimization for HOME_SPACE ish
        [this.rootSpaces, this.orphanedRooms] = partitionSpacesAndRooms(Array.from(unseenChildren));
        this.parentMap = backrefs;

        this.onRoomsUpdate(); // TODO only do this if a change has happened
        this.emit(UPDATE_TOP_LEVEL_SPACES, this.spacePanelSpaces);
    }

    onSpaceUpdate = () => {
        this.rebuild();
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////

    private showInHomeSpace = (room: Room) => {
        return !this.parentMap.get(room.roomId)?.size // put all orphaned rooms in the Home Space
            || DMRoomMap.shared().getUserIdForRoomId(room.roomId) // put all DMs in the Home Space
            || RoomListStore.instance.getTagsForRoom(room).includes(DefaultTagID.Favourite) // show all favourites
    };

    // Update a given room due to its tag changing (e.g DM-ness or Fav-ness)
    // This can only change whether it shows up in the HOME_SPACE or not
    private onRoomUpdate = (room: Room) => {
        if (this.showInHomeSpace(room)) {
            this.spaceFilteredRooms.get(HOME_SPACE)?.add(room.roomId);
        } else {
            this.spaceFilteredRooms.get(HOME_SPACE)?.delete(room.roomId);
        }
    };

    private onRoomsUpdate = () => {
        // TODO resolve some updates as deltas
        const visibleRooms = this.matrixClient.getVisibleRooms();

        // TODO ideally we could delta update this map instead of building it from scratch each time
        // this.roomSpaceMap = new Map();
        // [...visibleRooms, ...this.getSpaces()].forEach(room => {
        //     const spacesContainingRoom = this.topLevelSpaces.filter(space => this.getChildRooms(space).includes(room));
        //     if (spacesContainingRoom.length > 0) {
        //         this.roomSpaceMap.set(room.roomId, spacesContainingRoom);
        //     }
        // });

        const oldFilteredRooms = this.spaceFilteredRooms;
        this.spaceFilteredRooms = new Map();

        // put all invites (rooms & spaces) in the Home Space only
        const invites = this.matrixClient.getRooms().filter(r => r.isSpaceRoom() && r.getMyMembership() === "invite");
        const inviteRoomIds = new Set<string>(invites.map(space => space.roomId)); // TODO use this to filter invites out of other spaces
        this.spaceFilteredRooms.set(HOME_SPACE, inviteRoomIds);

        visibleRooms.forEach(room => {
            if (this.showInHomeSpace(room)) {
                this.spaceFilteredRooms.get(HOME_SPACE).add(room.roomId);
            }
        });

        this.rootSpaces.forEach(s => {
            const fn = (spaceId: string, parentPath: Set<string>): Set<string> => {
                if (parentPath.has(spaceId)) return; // prevent cycles

                const [childSpaces, childRooms] = partitionSpacesAndRooms(this.getChildren(spaceId));
                const roomIds = new Set(childRooms.map(r => r.roomId));
                const space = this.matrixClient?.getRoom(spaceId);

                // Add relevant DMs
                space?.getJoinedMembers().forEach(member => {
                    DMRoomMap.shared().getDMRoomsForUserId(member.userId).forEach(roomId => {
                        roomIds.add(roomId);
                    });
                });

                const newPath = new Set(parentPath).add(spaceId);
                childSpaces.forEach(childSpace => {
                    fn(childSpace.roomId, newPath)?.forEach(roomId => {
                        roomIds.add(roomId);
                    });
                });
                this.spaceFilteredRooms.set(spaceId, roomIds);
                return roomIds;
            };

            fn(s.roomId, new Set());
        });

        const diff = mapDiff(oldFilteredRooms, this.spaceFilteredRooms);
        // filter out keys which changed by reference only by checking whether the sets differ
        const changed = diff.changed.filter(k => setHasDiff(oldFilteredRooms.get(k), this.spaceFilteredRooms.get(k)));
        [...diff.added, ...diff.removed, ...changed].forEach(k => {
            this.emit(k);
        });

        this.spaceFilteredRooms.forEach((roomIds, s) => {
            // Update NotificationStates
            const rooms = this.matrixClient.getRooms().filter(room => roomIds.has(room.roomId));
            this.getNotificationState(s)?.setRooms(rooms);
        });
    };

    // private onSpaceUpdate = () => {
    //     const spaces = this.getSpaces();
    //     // TODO build a tree of spaces and don't assume all spaces are top-level
    //     this.topLevelSpaces = spaces.map(space => {
    //         const children = space.currentState.getStateEvents(EventType.SpaceChild).map(ev => {
    //             // TODO maybe we should just store roomIds so that we don't have to update them as often
    //             return this.matrixClient.getRoom(ev.getStateKey());
    //         }).filter(Boolean);
    //         const [childSpaces, rooms] = children.reduce((result, room: Room) => {
    //             result[room.isSpaceRoom() ? 0 : 1].push(room);
    //             return result;
    //         }, [[], []]);
    //
    //         return { space, childSpaces, rooms };
    //     });
    //
    //     if (1) { // TODO detect changes
    //         this.onRoomsUpdate();
    //     }
    //
    //     this.emit(UPDATE_TOP_LEVEL_SPACES, this.spacePanelSpaces);
    // };

    private onRoom = (room: Room) => {
        if (room?.isSpaceRoom()) {
            this.onSpaceUpdate();
            this.emit(room.roomId);
        } else {
            this.onRoomsUpdate();
        }
    };

    private onRoomState = (ev: MatrixEvent) => {
        const room = this.matrixClient.getRoom(ev.getRoomId());
        if (!room) return;

        if (ev.getType() === EventType.SpaceChild && room.isSpaceRoom()) {
            this.onSpaceUpdate();
            this.emit(room.roomId);
        } else if (ev.getType() === EventType.SpaceParent) {
            // TODO confirm this after implementing parenting behaviour
            if (room.isSpaceRoom()) {
                this.onSpaceUpdate();
            } else {
                this.onRoomUpdate(room);
            }
            this.emit(room.roomId);
        }
    };

    private onRoomAccountData = (ev: MatrixEvent, room: Room, lastEvent: MatrixEvent) => {
        if (ev.getType() === EventType.Tag && !room.isSpaceRoom()) {
            // If the room was in favourites and now isn't or the opposite then update its position in the trees
            if (!!ev.getContent()[DefaultTagID.Favourite] !== !!lastEvent.getContent()[DefaultTagID.Favourite]) {
                this.onRoomUpdate(room);
            }
        }
    }

    private onAccountData = (ev: MatrixEvent, lastEvent: MatrixEvent) => {
        if (ev.getType() === EventType.Direct) {
            const lastContent = lastEvent.getContent();
            const content = ev.getContent();

            const diff = objectDiff<Record<string, string[]>>(lastContent, content);
            // filter out keys which changed by reference only by checking whether the sets differ
            const changed = diff.changed.filter(k => arrayHasDiff(lastContent[k], content[k]));
            // DM tag changes, refresh relevant rooms
            new Set([...diff.added, ...diff.removed, ...changed]).forEach(roomId => {
                const room = this.matrixClient?.getRoom(roomId);
                if (room) {
                    this.onRoomUpdate(room);
                }
            });
        }
    };

    protected async onNotReady() {
        if (!SettingsStore.getValue("feature_spaces")) return;
        if (this.matrixClient) {
            this.matrixClient.removeListener("Room", this.onRoom);
            this.matrixClient.removeListener("Room.myMembership", this.onRoom);
            this.matrixClient.removeListener("RoomState.events", this.onRoomState);
            this.matrixClient.removeListener("Room.accountData", this.onRoomAccountData);
            this.matrixClient.removeListener("accountData", this.onAccountData);
        }
        await this.reset({});
    }

    protected async onReady() {
        if (!SettingsStore.getValue("feature_spaces")) return;
        this.matrixClient.on("Room", this.onRoom);
        this.matrixClient.on("Room.myMembership", this.onRoom);
        this.matrixClient.on("RoomState.events", this.onRoomState);
        this.matrixClient.on("Room.accountData", this.onRoomAccountData);
        this.matrixClient.on("accountData", this.onAccountData);

        await this.onSpaceUpdate(); // trigger an initial update

        // restore selected state from last session if any and still valid
        const lastSpaceId = window.localStorage.getItem(ACTIVE_SPACE_LS_KEY);
        if (lastSpaceId) {
            const space = this.rootSpaces.find(s => s.roomId === lastSpaceId);
            if (space) {
                this.setActiveSpace(space);
            }
        }
    }

    protected async onAction(payload: ActionPayload) {
        switch (payload.action) {
            case Action.OpenSpaceSettings:
                Modal.createTrackedDialog("Space Settings", "", SpaceSettingsDialog, {
                    matrixClient: this.matrixClient,
                    space: (payload as OpenSpaceSettingsPayload).space,
                }, /*className=*/null, /*isPriority=*/false, /*isStatic=*/true);
                break;
            case "view_room": {
                const room = this.matrixClient?.getRoom(payload.room_id);
                if (room?.getMyMembership() === "join") {
                    if (room.isSpaceRoom()) {
                        this.setActiveSpace(room);
                    } else if (!this.spaceFilteredRooms.get(this._activeSpace?.roomId || HOME_SPACE).has(room.roomId)) {
                        // const space = this.roomSpaceMap.get(room.roomId)?.[0];
                        const space = Array.from(this.parentMap.get(room.roomId) || [])[0];
                        if (space) {
                            this.setActiveSpace(space);
                        }
                    }
                }
                break;
            }
        }
    }

    public getNotificationState(key: SpaceKey): SpaceNotificationState {
        if (this.notificationStateMap.has(key)) {
            return this.notificationStateMap.get(key);
        }

        const state = new SpaceNotificationState(key, getRoomFn);
        this.notificationStateMap.set(key, state);
        return state;
    }
}

export default class SpaceStore {
    private static internalInstance = new SpaceStoreClass();

    public static get instance(): SpaceStoreClass {
        return SpaceStore.internalInstance;
    }
}

window.mxSpaceStore = SpaceStore.instance;
