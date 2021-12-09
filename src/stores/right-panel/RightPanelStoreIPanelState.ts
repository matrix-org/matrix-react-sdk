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

import { MatrixEvent } from "matrix-js-sdk";
import { VerificationRequest } from "matrix-js-sdk/src/crypto/verification/request/VerificationRequest";
import { Room } from "matrix-js-sdk/src/models/room";
import { RoomMember } from "matrix-js-sdk/src/models/room-member";
import { User } from "matrix-js-sdk/src/models/user";
import { GroupMember } from "../../components/views/right_panel/UserInfo";
import { RightPanelPhases } from "./RightPanelStorePhases";

export interface IPanelState {
    member?: RoomMember | User | GroupMember;
    verificationRequest?: VerificationRequest;
    verificationRequestPromise?: Promise<VerificationRequest>;
    // group
    groupId?: string;
    groupRoomId?: string;
    // XXX: The type for event should 'view_3pid_invite' action's payload
    widgetId?: string;
    space?: Room;
    // treads
    event?: MatrixEvent;
    initialEvent?: MatrixEvent;
    highlighted?: boolean;
}

export interface IPanelStateStored {
    member?: RoomMember | User | GroupMember;
    verificationRequest?: VerificationRequest;
    verificationRequestPromise?: Promise<VerificationRequest>;
    // group
    groupId?: string;
    groupRoomId?: string;
    // XXX: The type for event should 'view_3pid_invite' action's payload
    eventId?: string;
    widgetId?: string;
    space?: Room;
    // treads
    initialEventId?: string;
    highlighted?: boolean;
}

export interface IPhaseAndState {
    phase: RightPanelPhases;
    state: IPanelState;
}

export interface IPhaseAndStateStored {
    phase: RightPanelPhases;
    state: IPanelStateStored;
}

export function convertToStoreRoom(cacheRoom: { isOpen: boolean, history: Array<IPhaseAndState> }):
{ history: Array<IPhaseAndStateStored>, isOpen: boolean } {
    if (!cacheRoom) return cacheRoom;
    const storeHistory = [...cacheRoom.history].map(panelState => convertStateToStore(panelState));
    return { isOpen: cacheRoom.isOpen, history: storeHistory };
}

export function convertToStateRoom(storeRoom: { history: Array<IPhaseAndStateStored>, isOpen: boolean }, room: Room):
{ history: Array<IPhaseAndState>, isOpen: boolean } {
    if (!storeRoom) return storeRoom;
    const stateHistory = [...storeRoom.history].map(panelStateStore => convertStoreToState(panelStateStore, room));
    return { history: stateHistory, isOpen: storeRoom.isOpen };
}

function convertStateToStore(panelState: IPhaseAndState): IPhaseAndStateStored {
    const panelStateThisRoomStored = { ...panelState.state } as any;
    if (!!panelState?.state?.event?.getId()) {
        panelStateThisRoomStored.eventId = panelState.state.event.getId();
    }
    if (!!panelState?.state?.initialEvent?.getId()) {
        panelStateThisRoomStored.initialEventId = panelState.state.initialEvent.getId();
    }
    delete panelStateThisRoomStored.event;
    delete panelStateThisRoomStored.initialEvent;
    return { state: panelStateThisRoomStored as IPhaseAndStateStored, phase: panelState.phase } as IPhaseAndStateStored;
}
function convertStoreToState(panelStateStore: IPhaseAndStateStored, room: Room): IPhaseAndState {
    const panelStateThisRoom = { ...panelStateStore?.state } as any;
    if (!!panelStateThisRoom.eventId) {
        panelStateThisRoom.event = room.findEventById(panelStateThisRoom.eventId);
    }
    if (!!panelStateThisRoom.initialEventId) {
        panelStateThisRoom.initialEvent = room.findEventById(panelStateThisRoom.initialEventId);
    }
    delete panelStateThisRoom.eventId;
    delete panelStateThisRoom.initialEventId;

    return { state: panelStateThisRoom as IPanelState, phase: panelStateStore.phase } as IPhaseAndState;
}
