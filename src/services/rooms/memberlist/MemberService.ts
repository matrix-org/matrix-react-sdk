/*
Copyright 2024 The Matrix.org Foundation C.I.C.

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

import {
    ClientEvent,
    EventType,
    MatrixClient,
    MatrixEvent,
    Room,
    RoomEvent,
    RoomMemberEvent,
    RoomState,
    RoomStateEvent,
    RoomMember as SDKRoomMember,
    User,
    UserEvent,
} from "matrix-js-sdk/src/matrix";
import { KnownMembership } from "matrix-js-sdk/src/types";

import { MemberListStore } from "../../../stores/MemberListStore";
import { RoomMember } from "../../../models/rooms/RoomMember";
import { IMemberService } from "./IMemberService";
import { mediaFromMxc } from "../../../customisations/Media";
import UserIdentifierCustomisations from "../../../customisations/UserIdentifier";
import { isValid3pidInvite } from "../../../RoomInvite";
import { ThreePIDInvite } from "../../../models/rooms/ThreePIDInvite";
import { shouldShowComponent } from "../../../customisations/helpers/UIComponents";
import { UIComponent } from "../../../settings/UIFeature";
import { UserPresence } from "../../../models/rooms/UserPresence";
import { PresenceState } from "../../../models/rooms/PresenceState";

export class MemberService implements IMemberService {
    private roomId: string;
    private matrixClient: MatrixClient;
    private memberListStore: MemberListStore;
    private membershipType?: string;
    private onMemberListUpdated?: (reload: boolean) => void;
    private onPresenceUpdated?: (userId: string) => void;

    public constructor(roomId: string, matrixClient: MatrixClient, memberListStore: MemberListStore) {
        this.roomId = roomId;
        this.matrixClient = matrixClient;
        this.memberListStore = memberListStore;
    }

    public setOnMemberListUpdated(callback: (reload: boolean) => void): void {
        this.onMemberListUpdated = callback;
    }

    public setOnPresenceUpdated(callback: (userId: string) => void): void {
        this.onPresenceUpdated = callback;
    }

    public load(): void {
        this.matrixClient.on(RoomStateEvent.Update, this.onRoomStateUpdate);
        this.matrixClient.on(RoomMemberEvent.Name, this.onRoomMemberName);
        this.matrixClient.on(RoomStateEvent.Events, this.onRoomStateEvent);
        this.matrixClient.on(ClientEvent.Room, this.onRoom); // invites & joining after peek
        this.matrixClient.on(RoomEvent.MyMembership, this.onMyMembership);
        this.matrixClient.on(UserEvent.LastPresenceTs, this.onUserPresenceChange);
        this.matrixClient.on(UserEvent.Presence, this.onUserPresenceChange);
        this.matrixClient.on(UserEvent.CurrentlyActive, this.onUserPresenceChange);
    }

    public unload(): void {
        this.matrixClient.off(RoomStateEvent.Update, this.onRoomStateUpdate);
        this.matrixClient.off(RoomMemberEvent.Name, this.onRoomMemberName);
        this.matrixClient.off(RoomStateEvent.Events, this.onRoomStateEvent);
        this.matrixClient.off(ClientEvent.Room, this.onRoom);
        this.matrixClient.off(RoomEvent.MyMembership, this.onMyMembership);
        this.matrixClient.off(UserEvent.LastPresenceTs, this.onUserPresenceChange);
        this.matrixClient.off(UserEvent.Presence, this.onUserPresenceChange);
        this.matrixClient.off(UserEvent.CurrentlyActive, this.onUserPresenceChange);
    }

    public async loadMembers(searchQuery?: string): Promise<Record<"joined" | "invited", RoomMember[]>> {
        const { joined: joinedSdk, invited: invitedSdk } = await this.memberListStore.loadMemberList(
            this.roomId,
            searchQuery,
        );
        const joined = joinedSdk.map(this.sdkRoomMemberToRoomMember);
        const invited = invitedSdk.map(this.sdkRoomMemberToRoomMember);
        return { joined, invited };
    }

    private sdkRoomMemberToRoomMember(member: SDKRoomMember): RoomMember {
        const displayUserId =
            UserIdentifierCustomisations.getDisplayUserIdentifier(member.userId, {
                roomId: member.roomId,
            }) ?? member.userId;

        const mxcAvatarURL = member.getMxcAvatarUrl();
        const avatarThumbnailUrl =
            (mxcAvatarURL && mediaFromMxc(mxcAvatarURL).getThumbnailOfSourceHttp(10, 10)) ?? undefined;

        const user = member.user;
        let presence: UserPresence | undefined = undefined;
        if (user) {
            presence = {
                state: (user.presence as PresenceState) || undefined,
                lastModifiedTime: user.getLastModifiedTime(),
                lastActiveAgo: user.lastActiveAgo,
                lastPresenceTime: user.lastPresenceTs,
                currentlyActive: user.currentlyActive,
            };
        }

        return {
            roomId: member.roomId,
            userId: member.userId,
            displayUserId: displayUserId,
            name: member.name,
            rawDisplayName: member.rawDisplayName,
            disambiguate: member.disambiguate,
            avatarThumbnailUrl: avatarThumbnailUrl,
            powerLevel: member.powerLevel,
            lastModifiedTime: member.getLastModifiedTime(),
            presence: presence,
        };
    }

    private onRoomStateUpdate(state: RoomState): void {
        if (state.roomId !== this.roomId) return;
        this.onMemberListUpdated?.(false);
    }

    private onRoomMemberName(ev: MatrixEvent, member: SDKRoomMember): void {
        if (member.roomId !== this.roomId) {
            return;
        }
        this.onMemberListUpdated?.(false);
    }

    private onRoomStateEvent(event: MatrixEvent): void {
        if (event.getRoomId() !== this.roomId || event.getType() !== EventType.RoomThirdPartyInvite) {
            return;
        }
        this.onMemberListUpdated?.(false);
    }

    private onRoom(room: Room): void {
        if (room.roomId !== this.roomId) {
            return;
        }
        // We listen for room events because when we accept an invite
        // we need to wait till the room is fully populated with state
        // before refreshing the member list else we get a stale list.
        this.onMemberListUpdated?.(true);
    }

    private onMyMembership = (room: Room, membership: string, oldMembership?: string): void => {
        if (room.roomId != this.roomId) return;

        if (this.membershipType != membership) {
            this.membershipType = membership;
        }
        if (membership === KnownMembership.Join && oldMembership !== KnownMembership.Join) {
            // we just joined the room, load the member list
            this.onMemberListUpdated?.(true);
        }
    };

    private onUserPresenceChange = (event: MatrixEvent | undefined, user: User): void => {
        this.onPresenceUpdated?.(user.userId);
    };

    public getThreePIDInvites(): ThreePIDInvite[] {
        // include 3pid invites (m.room.third_party_invite) state events.
        // The HS may have already converted these into m.room.member invites so
        // we shouldn't add them if the 3pid invite state key (token) is in the
        // member invite (content.third_party_invite.signed.token)
        const room = this.matrixClient.getRoom(this.roomId);

        if (room) {
            return room.currentState
                .getStateEvents("m.room.third_party_invite")
                .filter(function (e) {
                    if (!isValid3pidInvite(e)) return false;

                    // discard all invites which have a m.room.member event since we've
                    // already added them.
                    const memberEvent = room.currentState.getInviteForThreePidToken(e.getStateKey()!);
                    if (memberEvent) return false;
                    return true;
                })
                .reduce(function (filtered: ThreePIDInvite[], event) {
                    const eventID = event.getId();
                    const stateKey = event.getStateKey();
                    const displayName = event.getContent().display_name;
                    if (!!eventID && !!stateKey && !!displayName) {
                        filtered.push({
                            eventId: eventID,
                            stateKey: stateKey,
                            displayName: displayName,
                        });
                    }
                    return filtered;
                }, []);
        }
        return [];
    }

    public shouldShowInvite(): boolean {
        const room = this.matrixClient.getRoom(this.roomId);
        return room?.getMyMembership() == KnownMembership.Join && shouldShowComponent(UIComponent.InviteUsers);
    }

    public showPresence(): boolean {
        return this.memberListStore.isPresenceEnabled();
    }
}
