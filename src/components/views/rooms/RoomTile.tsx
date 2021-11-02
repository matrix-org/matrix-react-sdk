/*
Copyright 2018 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2015-2017, 2019-2021 The Matrix.org Foundation C.I.C.

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

import React, { createRef } from "react";
import { Room } from "matrix-js-sdk/src/models/room";
import classNames from "classnames";
import { RovingTabIndexWrapper } from "../../../accessibility/RovingTabIndex";
import AccessibleButton from "../../views/elements/AccessibleButton";
import dis from '../../../dispatcher/dispatcher';
import defaultDispatcher from '../../../dispatcher/dispatcher';
import { Key } from "../../../Keyboard";
import ActiveRoomObserver from "../../../ActiveRoomObserver";
import { _t } from "../../../languageHandler";
import { ChevronFace, ContextMenuTooltipButton } from "../../structures/ContextMenu";
import { DefaultTagID, TagID } from "../../../stores/room-list/models";
import { MessagePreviewStore } from "../../../stores/room-list/MessagePreviewStore";
import DecoratedRoomAvatar from "../avatars/DecoratedRoomAvatar";
import NotificationBadge from "./NotificationBadge";
import { ActionPayload } from "../../../dispatcher/payloads";
import { RoomNotificationStateStore } from "../../../stores/notifications/RoomNotificationStateStore";
import { NOTIFICATION_STATE_UPDATE, NotificationState } from "../../../stores/notifications/NotificationState";
import AccessibleTooltipButton from "../elements/AccessibleTooltipButton";
import { CommunityPrototypeStore, IRoomProfile } from "../../../stores/CommunityPrototypeStore";
import { replaceableComponent } from "../../../utils/replaceableComponent";
import RoomContextMenu from "../context_menus/RoomContextMenu";

interface IProps {
    room: Room;
    showMessagePreview: boolean;
    isMinimized: boolean;
    tag: TagID;
}

type PartialDOMRect = Pick<DOMRect, "left" | "bottom">;

interface IState {
    selected: boolean;
    contextMenuPosition: PartialDOMRect;
    messagePreview?: string;
}

const messagePreviewId = (roomId: string) => `mx_RoomTile_messagePreview_${roomId}`;

export const contextMenuBelow = (elementRect: PartialDOMRect) => {
    // align the context menu's icons with the icon which opened the context menu
    const left = elementRect.left + window.pageXOffset - 9;
    const top = elementRect.bottom + window.pageYOffset + 17;
    const chevronFace = ChevronFace.None;
    return { left, top, chevronFace };
};

@replaceableComponent("views.rooms.RoomTile")
export default class RoomTile extends React.PureComponent<IProps, IState> {
    private dispatcherRef: string;
    private roomTileRef = createRef<HTMLDivElement>();
    private notificationState: NotificationState;

    constructor(props: IProps) {
        super(props);

        this.state = {
            selected: ActiveRoomObserver.activeRoomId === this.props.room.roomId,
            contextMenuPosition: null,

            // generatePreview() will return nothing if the user has previews disabled
            messagePreview: "",
        };
        this.generatePreview();

        this.notificationState = RoomNotificationStateStore.instance.getRoomState(this.props.room);
    }

    private onRoomNameUpdate = (room: Room) => {
        this.forceUpdate();
    };

    private onNotificationUpdate = () => {
        this.forceUpdate(); // notification state changed - update
    };

    private get showContextMenu(): boolean {
        return this.props.tag !== DefaultTagID.Invite;
    }

    private get showMessagePreview(): boolean {
        return !this.props.isMinimized && this.props.showMessagePreview;
    }

    public componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IState>) {
        const showMessageChanged = prevProps.showMessagePreview !== this.props.showMessagePreview;
        const minimizedChanged = prevProps.isMinimized !== this.props.isMinimized;
        if (showMessageChanged || minimizedChanged) {
            this.generatePreview();
        }
        if (prevProps.room?.roomId !== this.props.room?.roomId) {
            MessagePreviewStore.instance.off(
                MessagePreviewStore.getPreviewChangedEventName(prevProps.room),
                this.onRoomPreviewChanged,
            );
            MessagePreviewStore.instance.on(
                MessagePreviewStore.getPreviewChangedEventName(this.props.room),
                this.onRoomPreviewChanged,
            );
            CommunityPrototypeStore.instance.off(
                CommunityPrototypeStore.getUpdateEventName(prevProps.room?.roomId),
                this.onCommunityUpdate,
            );
            CommunityPrototypeStore.instance.on(
                CommunityPrototypeStore.getUpdateEventName(this.props.room?.roomId),
                this.onCommunityUpdate,
            );
            prevProps.room?.off("Room.name", this.onRoomNameUpdate);
            this.props.room?.on("Room.name", this.onRoomNameUpdate);
        }
    }

    public componentDidMount() {
        // when we're first rendered (or our sublist is expanded) make sure we are visible if we're active
        if (this.state.selected) {
            this.scrollIntoView();
        }

        ActiveRoomObserver.addListener(this.props.room.roomId, this.onActiveRoomUpdate);
        this.dispatcherRef = defaultDispatcher.register(this.onAction);
        MessagePreviewStore.instance.on(
            MessagePreviewStore.getPreviewChangedEventName(this.props.room),
            this.onRoomPreviewChanged,
        );
        this.notificationState.on(NOTIFICATION_STATE_UPDATE, this.onNotificationUpdate);
        this.props.room?.on("Room.name", this.onRoomNameUpdate);
        CommunityPrototypeStore.instance.on(
            CommunityPrototypeStore.getUpdateEventName(this.props.room.roomId),
            this.onCommunityUpdate,
        );
    }

    public componentWillUnmount() {
        if (this.props.room) {
            ActiveRoomObserver.removeListener(this.props.room.roomId, this.onActiveRoomUpdate);
            MessagePreviewStore.instance.off(
                MessagePreviewStore.getPreviewChangedEventName(this.props.room),
                this.onRoomPreviewChanged,
            );
            CommunityPrototypeStore.instance.off(
                CommunityPrototypeStore.getUpdateEventName(this.props.room.roomId),
                this.onCommunityUpdate,
            );
            this.props.room.off("Room.name", this.onRoomNameUpdate);
        }
        ActiveRoomObserver.removeListener(this.props.room.roomId, this.onActiveRoomUpdate);
        defaultDispatcher.unregister(this.dispatcherRef);
        this.notificationState.off(NOTIFICATION_STATE_UPDATE, this.onNotificationUpdate);
        CommunityPrototypeStore.instance.off(
            CommunityPrototypeStore.getUpdateEventName(this.props.room.roomId),
            this.onCommunityUpdate,
        );
    }

    private onAction = (payload: ActionPayload) => {
        if (payload.action === "view_room" && payload.room_id === this.props.room.roomId && payload.show_room_tile) {
            setImmediate(() => {
                this.scrollIntoView();
            });
        }
    };

    private onCommunityUpdate = (roomId: string) => {
        if (roomId !== this.props.room.roomId) return;
        this.forceUpdate(); // we don't have anything to actually update
    };

    private onRoomPreviewChanged = (room: Room) => {
        if (this.props.room && room.roomId === this.props.room.roomId) {
            this.generatePreview();
        }
    };

    private async generatePreview() {
        if (!this.showMessagePreview) {
            return null;
        }

        const messagePreview = await MessagePreviewStore.instance.getPreviewForRoom(this.props.room, this.props.tag);
        this.setState({ messagePreview });
    }

    private scrollIntoView = () => {
        if (!this.roomTileRef.current) return;
        this.roomTileRef.current.scrollIntoView({
            block: "nearest",
            behavior: "auto",
        });
    };

    private onTileClick = (ev: React.KeyboardEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        dis.dispatch({
            action: 'view_room',
            show_room_tile: true, // make sure the room is visible in the list
            room_id: this.props.room.roomId,
            clear_search: (ev && (ev.key === Key.ENTER || ev.key === Key.SPACE)),
        });
    };

    private onActiveRoomUpdate = (isActive: boolean) => {
        this.setState({ selected: isActive });
    };

    private onContextMenuOpenClick = (ev: React.MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        const target = ev.target as HTMLButtonElement;
        this.setState({ contextMenuPosition: target.getBoundingClientRect() });
    };

    private onContextMenu = (ev: React.MouseEvent) => {
        // If we don't have a context menu to show, ignore the action.
        if (!this.showContextMenu) return;

        ev.preventDefault();
        ev.stopPropagation();
        this.setState({
            contextMenuPosition: {
                left: ev.clientX,
                bottom: ev.clientY,
            },
        });
    };

    private onCloseContextMenu = () => {
        this.setState({ contextMenuPosition: null });
    };

    private renderContextMenu(): React.ReactElement {
        if (!this.showContextMenu) return null; // no menu to show

        let contextMenu = null;
        if (this.state.contextMenuPosition) {
            contextMenu = (
                <RoomContextMenu
                    {...contextMenuBelow(this.state.contextMenuPosition)}
                    room={this.props.room}
                    onFinished={this.onCloseContextMenu}
                />
            );
        }

        return (
            <React.Fragment>
                <ContextMenuTooltipButton
                    className="mx_RoomTile_menuButton"
                    onClick={this.onContextMenuOpenClick}
                    title={_t("Room options")}
                    isExpanded={!!this.state.contextMenuPosition}
                />
                { contextMenu }
            </React.Fragment>
        );
    }

    public render(): React.ReactElement {
        const classes = classNames({
            'mx_RoomTile': true,
            'mx_RoomTile_selected': this.state.selected,
            'mx_RoomTile_hasMenuOpen': this.state.contextMenuPosition,
            'mx_RoomTile_minimized': this.props.isMinimized,
        });

        let roomProfile: IRoomProfile = { displayName: null, avatarMxc: null };
        if (this.props.tag === DefaultTagID.Invite) {
            roomProfile = CommunityPrototypeStore.instance.getInviteProfile(this.props.room.roomId);
        }

        let name = roomProfile.displayName || this.props.room.name;
        if (typeof name !== 'string') name = '';
        name = name.replace(":", ":\u200b"); // add a zero-width space to allow linewrapping after the colon

        const roomAvatar = <DecoratedRoomAvatar
            room={this.props.room}
            avatarSize={32}
            displayBadge={this.props.isMinimized}
            oobData={({ avatarUrl: roomProfile.avatarMxc })}
        />;

        let badge: React.ReactNode;
        if (!this.props.isMinimized && this.notificationState) {
            // aria-hidden because we summarise the unread count/highlight status in a manual aria-label below
            badge = (
                <div className="mx_RoomTile_badgeContainer" aria-hidden="true">
                    <NotificationBadge
                        notification={this.notificationState}
                        forceCount={false}
                        roomId={this.props.room.roomId}
                    />
                </div>
            );
        }

        let messagePreview = null;
        if (this.showMessagePreview && this.state.messagePreview) {
            messagePreview = (
                <div
                    className="mx_RoomTile_messagePreview"
                    id={messagePreviewId(this.props.room.roomId)}
                    title={this.state.messagePreview}
                >
                    { this.state.messagePreview }
                </div>
            );
        }

        const nameClasses = classNames({
            "mx_RoomTile_name": true,
            "mx_RoomTile_nameWithPreview": !!messagePreview,
            "mx_RoomTile_nameHasUnreadEvents": this.notificationState.isUnread,
        });

        let nameContainer = (
            <div className="mx_RoomTile_nameContainer">
                <div title={name} className={nameClasses} tabIndex={-1} dir="auto">
                    { name }
                </div>
                { messagePreview }
            </div>
        );
        if (this.props.isMinimized) nameContainer = null;

        let ariaLabel = name;
        // The following labels are written in such a fashion to increase screen reader efficiency (speed).
        if (this.props.tag === DefaultTagID.Invite) {
            // append nothing
        } else if (this.notificationState.hasMentions) {
            ariaLabel += " " + _t("%(count)s unread messages including mentions.", {
                count: this.notificationState.count,
            });
        } else if (this.notificationState.hasUnreadCount) {
            ariaLabel += " " + _t("%(count)s unread messages.", {
                count: this.notificationState.count,
            });
        } else if (this.notificationState.isUnread) {
            ariaLabel += " " + _t("Unread messages.");
        }

        let ariaDescribedBy: string;
        if (this.showMessagePreview) {
            ariaDescribedBy = messagePreviewId(this.props.room.roomId);
        }

        const props: Partial<React.ComponentProps<typeof AccessibleTooltipButton>> = {};
        let Button: React.ComponentType<React.ComponentProps<typeof AccessibleButton>> = AccessibleButton;
        if (this.props.isMinimized) {
            Button = AccessibleTooltipButton;
            props.title = name;
            // force the tooltip to hide whilst we are showing the context menu
            props.forceHide = !!this.state.contextMenuPosition;
        }

        return (
            <React.Fragment>
                <RovingTabIndexWrapper inputRef={this.roomTileRef}>
                    { ({ onFocus, isActive, ref }) =>
                        <Button
                            {...props}
                            onFocus={onFocus}
                            tabIndex={isActive ? 0 : -1}
                            inputRef={ref}
                            className={classes}
                            onClick={this.onTileClick}
                            onContextMenu={this.onContextMenu}
                            role="treeitem"
                            aria-label={ariaLabel}
                            aria-selected={this.state.selected}
                            aria-describedby={ariaDescribedBy}
                        >
                            { roomAvatar }
                            { nameContainer }
                            { badge }
                            { this.renderContextMenu() }
                        </Button>
                    }
                </RovingTabIndexWrapper>
            </React.Fragment>
        );
    }
}
