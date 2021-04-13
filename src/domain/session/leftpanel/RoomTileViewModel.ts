/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 New Vector Ltd
Copyright 2018 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2019, 2020, 2021 The Matrix.org Foundation C.I.C.

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

import { ViewModel } from "../../ViewModel";
import { Room } from "matrix-js-sdk/src/models/room";
import dis from '../../../dispatcher/dispatcher';
import defaultDispatcher from '../../../dispatcher/dispatcher';
import ActiveRoomObserver from "../../../ActiveRoomObserver";
import { DefaultTagID, TagID } from "../../../stores/room-list/models";
import { MessagePreviewStore } from "../../../stores/room-list/MessagePreviewStore";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import { Volume } from "../../../RoomNotifsTypes";
import RoomListStore from "../../../stores/room-list/RoomListStore";
import RoomListActions from "../../../actions/RoomListActions";
import { ActionPayload } from "../../../dispatcher/payloads";
import { RoomNotificationStateStore } from "../../../stores/notifications/RoomNotificationStateStore";
import { NOTIFICATION_STATE_UPDATE, NotificationState } from "../../../stores/notifications/NotificationState";
import { EchoChamber } from "../../../stores/local-echo/EchoChamber";
import { CachedRoomKey, RoomEchoChamber } from "../../../stores/local-echo/RoomEchoChamber";
import { PROPERTY_UPDATED } from "../../../stores/local-echo/GenericEchoChamber";
import { CommunityPrototypeStore } from "../../../stores/CommunityPrototypeStore";

export class RoomTileViewModel extends ViewModel {
    public selected: boolean;
    public isMinimized: boolean;
    public notificationVolume: Volume;
    public ensureVisible: boolean;
    // this class is a lot like a view model, perhaps it should be one?
    public notificationState: NotificationState;
    // this should really be private, but requires the ((Decorated)Room)Avatar components
    // to not assume to have access to a fully-fledged room
    // Don't use this for new things
    public room: Room;
    private tag: TagID;
    private _showMessagePreview: boolean;
    private roomProps: RoomEchoChamber;
    private dispatcherRef: string;
    private _messagePreview?: string;

    constructor({room, showMessagePreview, isMinimized, tag}) {
        super();
        this.room = room;
        this._showMessagePreview = showMessagePreview;
        this.isMinimized = isMinimized;
        this.tag = tag;
        this._messagePreview = this.generatePreview();
        this.ensureVisible = false;

        ActiveRoomObserver.addListener(this.room.roomId, this.onActiveRoomUpdate);
        this.dispatcherRef = defaultDispatcher.register(this.onAction);

        MessagePreviewStore.instance.on(
            MessagePreviewStore.getPreviewChangedEventName(this.room),
            this.onRoomPreviewChanged,
        );

        this.notificationState = RoomNotificationStateStore.instance.getRoomState(this.room);
        this.notificationState.on(NOTIFICATION_STATE_UPDATE, this.onNotificationUpdate);
        this.roomProps = EchoChamber.forRoom(this.room);
        this.roomProps.on(PROPERTY_UPDATED, this.onRoomPropertyUpdate);
        CommunityPrototypeStore.instance.on(
            CommunityPrototypeStore.getUpdateEventName(this.room.roomId),
            this.onCommunityUpdate,
        );
        this.room.on("Room.name", this.onRoomNameUpdate);
    }

    public get id(): string {
        return this.room.roomId;
    }

    public get name(): string {
        let name;
        if (this.isInvite) {
            const roomProfile = CommunityPrototypeStore.instance.getInviteProfile(this.room.roomId);
            name = roomProfile.displayName || this.room.name;
        } else {
            name = this.room.name;
        }
        if (typeof name !== 'string') name = '';
        name = name.replace(":", ":\u200b"); // add a zero-width space to allow linewrapping after the colon
        return name;
    }

    public get avatarMxc(): string {
        let avatarMxc;
        if (this.isInvite) {
            const roomProfile = CommunityPrototypeStore.instance.getInviteProfile(this.room.roomId);
            avatarMxc = roomProfile.avatarMxc || this.room.avatar_url;
        } else {
            avatarMxc = this.room.avatar_url;
        }
        return avatarMxc;
    }

    public get showNotificationMenu(): boolean {
        return !(MatrixClientPeg.get().isGuest() || this.tag === DefaultTagID.Archived ||
                    !this.showContextMenu || this.isMinimized);
    }

    public get showContextMenu(): boolean {
        return this.tag !== DefaultTagID.Invite;
    }

    public get messagePreview(): string {
        if (!(!this.isMinimized && this._showMessagePreview)) {
            return null;
        }
        return this._messagePreview;
    }

    public get isArchived(): boolean {
        return this.tag === DefaultTagID.Archived;
    }

    public get isInvite(): boolean {
        return this.tag === DefaultTagID.Invite;
    }

    public get isFavourite(): boolean {
        // TODO: need to track this state rather than query each time?
        const roomTags = RoomListStore.instance.getTagsForRoom(this.room);
        return roomTags.includes(DefaultTagID.Favourite);
    }

    public get isLowPriority(): boolean {
        // TODO: need to track this state rather than query each time?
        const roomTags = RoomListStore.instance.getTagsForRoom(this.room);
        return roomTags.includes(DefaultTagID.LowPriority);
    }

    public get canInvite(): boolean {
        return this.room.canInvite(MatrixClientPeg.get().getUserId());
    }

    public openSettings() {
        dis.dispatch({
            action: 'open_room_settings',
            room_id: this.room.roomId,
        });
    }

    public invitePeople() {
        dis.dispatch({
            action: 'view_invite',
            roomId: this.room.roomId,
        });
    }

    public leave() {
        dis.dispatch({
            action: 'leave_room',
            room_id: this.room.roomId,
        });
    }

    public forget() {
        dis.dispatch({
            action: 'forget_room',
            room_id: this.room.roomId,
        });
    }

    public setNotificationVolume(volume: Volume): boolean {
        if (MatrixClientPeg.get().isGuest()) return;
        this.roomProps.notificationVolume = volume;
    }

    public open(clearSearch: boolean) {
        dis.dispatch({
            action: 'view_room',
            show_room_tile: true, // make sure the room is visible in the list
            room_id: this.room.roomId,
            clear_search: clearSearch,
        });
    }

    public toggleFavourite() {
        this.onTagRoom(DefaultTagID.Favourite);
    }

    public toggleLowPriority() {
        this.onTagRoom(DefaultTagID.LowPriority);
    }

    private onTagRoom = (tagId: TagID) => {
        const inverseTag = tagId === DefaultTagID.Favourite ? DefaultTagID.LowPriority : DefaultTagID.Favourite;
        const isApplied = RoomListStore.instance.getTagsForRoom(this.room).includes(tagId);
        const removeTag = isApplied ? tagId : inverseTag;
        const addTag = isApplied ? null : tagId;
        dis.dispatch(RoomListActions.tagRoom(
            MatrixClientPeg.get(),
            this.room,
            removeTag,
            addTag,
            undefined,
            0,
        ));
    };

    private generatePreview(): string | null {
        if (!this._showMessagePreview) {
            return null;
        }

        return MessagePreviewStore.instance.getPreviewForRoom(this.room, this.tag);
    }

    private onRoomNameUpdate = (room) => {
        this.emitChange();
    }

    private onNotificationUpdate = () => {
        this.emitChange();
    };

    private onRoomPropertyUpdate = (property: CachedRoomKey) => {
        if (property === CachedRoomKey.NotificationVolume) this.onNotificationUpdate();
        // else ignore - not important for this tile
    };

    private onAction = async (payload: ActionPayload) => {
        if (payload.action === "view_room" && payload.room_id === this.room.roomId && payload.show_room_tile) {
            this.emit("ensureVisible");
        }
    };

    private onCommunityUpdate = (roomId: string) => {
        if (roomId !== this.room.roomId) return;
        this.emitChange(); // we don't have anything to actually update
    };


    private onRoomPreviewChanged = (room: Room) => {
        if (this.room && room.roomId === this.room.roomId) {
            this._messagePreview = this.generatePreview();
            this.emitChange();
        }
    };

    private onActiveRoomUpdate = (isActive: boolean) => {
        this.selected = isActive;
        this.emitChange();
    };


    // called by parent view model (view for now in unmount)
    public destroy() {
        if (this.room) {
            ActiveRoomObserver.removeListener(this.room.roomId, this.onActiveRoomUpdate);
            MessagePreviewStore.instance.off(
                MessagePreviewStore.getPreviewChangedEventName(this.room),
                this.onRoomPreviewChanged,
            );
            CommunityPrototypeStore.instance.off(
                CommunityPrototypeStore.getUpdateEventName(this.room.roomId),
                this.onCommunityUpdate,
            );
            this.room.off("Room.name", this.onRoomNameUpdate);
        }
        defaultDispatcher.unregister(this.dispatcherRef);
        this.notificationState.off(NOTIFICATION_STATE_UPDATE, this.onNotificationUpdate);
    }
}
