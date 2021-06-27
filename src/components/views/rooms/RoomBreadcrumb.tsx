/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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

import React from "react";
import DecoratedRoomAvatar from "../avatars/DecoratedRoomAvatar";
import { _t } from "../../../languageHandler";
import { Room } from "matrix-js-sdk/src/models/room";
import defaultDispatcher from "../../../dispatcher/dispatcher";
import Analytics from "../../../Analytics";
import { RovingAccessibleTooltipButton } from "../../../accessibility/RovingTabIndex";
import { replaceableComponent } from "../../../utils/replaceableComponent";
import { ButtonEvent } from "../elements/AccessibleButton";
import RoomListStore from "../../../stores/room-list/RoomListStore";
import { DefaultTagID, TagID } from "../../../stores/room-list/models";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import { ChevronFace, ContextMenuTooltipButton } from "../../structures/ContextMenu";
import RoomListActions from "../../../actions/RoomListActions";
import { Key } from "../../../Keyboard";
import IconizedContextMenu, {
    IconizedContextMenuCheckbox,
    IconizedContextMenuOption,
    IconizedContextMenuOptionList,
} from "../context_menus/IconizedContextMenu";

interface IProps {
    room: Room;
    roomIndex: number;
}

type PartialDOMRect = Pick<DOMRect, "left" | "bottom">;

interface IState {
    generalMenuPosition: PartialDOMRect;
}

const contextMenuBelow = (elementRect: PartialDOMRect) => {
    // align the context menu's icons with the icon which opened the context menu
    const left = elementRect.left + window.pageXOffset - 9;
    const top = elementRect.bottom + window.pageYOffset + 17;
    const chevronFace = ChevronFace.None;
    return {left, top, chevronFace};
};

@replaceableComponent("views.rooms.RoomBreadcrumb")
export default class RoomBreadcrumb extends React.PureComponent<IProps, IState> {
    constructor(props: IProps) {
        super(props);

        this.state = {
            generalMenuPosition: null,
        };
    }

    private viewRoom = (room: Room, index: number) => {
        Analytics.trackEvent("Breadcrumbs", "click_node", String(index));
        defaultDispatcher.dispatch({action: "view_room", room_id: room.roomId});
    };

    private get showContextMenu(): boolean {
        return !RoomListStore.instance.getTagsForRoom(this.props.room).includes(DefaultTagID.Invite);
    }

    private onGeneralMenuOpenClick = (ev: React.MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        const target = ev.target as HTMLButtonElement;
        this.setState({generalMenuPosition: target.getBoundingClientRect()});
    };

    private onLeaveRoomClick = (ev: ButtonEvent) => {
        ev.preventDefault();
        ev.stopPropagation();

        defaultDispatcher.dispatch({
            action: 'leave_room',
            room_id: this.props.room.roomId,
        });
        this.setState({generalMenuPosition: null}); // hide the menu
    };

    private onForgetRoomClick = (ev: ButtonEvent) => {
        ev.preventDefault();
        ev.stopPropagation();

        defaultDispatcher.dispatch({
            action: 'forget_room',
            room_id: this.props.room.roomId,
        });
        this.setState({generalMenuPosition: null}); // hide the menu
    };

    private onOpenRoomSettings = (ev: ButtonEvent) => {
        ev.preventDefault();
        ev.stopPropagation();

        defaultDispatcher.dispatch({
            action: 'open_room_settings',
            room_id: this.props.room.roomId,
        });
        this.setState({generalMenuPosition: null}); // hide the menu
    };

    private onCloseGeneralMenu = () => {
        this.setState({generalMenuPosition: null});
    };

    private onTagRoom = (ev: ButtonEvent, tagId: TagID) => {
        ev.preventDefault();
        ev.stopPropagation();

        if (tagId === DefaultTagID.Favourite || tagId === DefaultTagID.LowPriority) {
            const inverseTag = tagId === DefaultTagID.Favourite ? DefaultTagID.LowPriority : DefaultTagID.Favourite;
            const isApplied = RoomListStore.instance.getTagsForRoom(this.props.room).includes(tagId);
            const removeTag = isApplied ? tagId : inverseTag;
            const addTag = isApplied ? null : tagId;
            defaultDispatcher.dispatch(RoomListActions.tagRoom(
                MatrixClientPeg.get(),
                this.props.room,
                removeTag,
                addTag,
                undefined,
                0,
            ));
        } else {
            console.warn(`Unexpected tag ${tagId} applied to ${this.props.room.room_id}`);
        }

        if ((ev as React.KeyboardEvent).key === Key.ENTER) {
            // Implements https://www.w3.org/TR/wai-aria-practices/#keyboard-interaction-12
            this.setState({generalMenuPosition: null}); // hide the menu
        }
    };

    private onInviteClick = (ev: ButtonEvent) => {
        ev.preventDefault();
        ev.stopPropagation();

        defaultDispatcher.dispatch({
            action: 'view_invite',
            roomId: this.props.room.roomId,
        });
        this.setState({generalMenuPosition: null}); // hide the menu
    };

    private onContextMenu = (ev: React.MouseEvent) => {
        if (!this.showContextMenu) return;
        ev.preventDefault();
        ev.stopPropagation();
        this.setState({
            generalMenuPosition: {
                left: ev.clientX,
                bottom: ev.clientY,
            },
        });
    };

    private renderGeneralMenu(): React.ReactElement {
        if (!this.showContextMenu) return null;

        let contextMenu = null;

        if (this.state.generalMenuPosition &&
            RoomListStore.instance.getTagsForRoom(this.props.room).includes(DefaultTagID.Archived)) {
            contextMenu = <IconizedContextMenu
                {...contextMenuBelow(this.state.generalMenuPosition)}
                onFinished={this.onCloseGeneralMenu}
                className="mx_RoomTile_contextMenu"
                compact
            >
                <IconizedContextMenuOptionList red>
                    <IconizedContextMenuOption
                        iconClassName="mx_RoomTile_iconSignOut"
                        label={_t("Forget Room")}
                        onClick={this.onForgetRoomClick}
                    />
                </IconizedContextMenuOptionList>
            </IconizedContextMenu>;
        } else if (this.state.generalMenuPosition) {
            const roomTags = RoomListStore.instance.getTagsForRoom(this.props.room);

            const isFavorite = roomTags.includes(DefaultTagID.Favourite);
            const favouriteLabel = isFavorite ? _t("Favourited") : _t("Favourite");

            const isLowPriority = roomTags.includes(DefaultTagID.LowPriority);
            const lowPriorityLabel = _t("Low Priority");

            const userId = MatrixClientPeg.get().getUserId();
            const canInvite = this.props.room.canInvite(userId);
            contextMenu = <IconizedContextMenu
                {...contextMenuBelow(this.state.generalMenuPosition)}
                onFinished={this.onCloseGeneralMenu}
                className="mx_RoomTile_contextMenu"
                compact
            >
                <IconizedContextMenuOptionList>
                    <IconizedContextMenuCheckbox
                        onClick={(e) => this.onTagRoom(e, DefaultTagID.Favourite)}
                        active={isFavorite}
                        label={favouriteLabel}
                        iconClassName="mx_RoomTile_iconStar"
                    />
                    <IconizedContextMenuCheckbox
                        onClick={(e) => this.onTagRoom(e, DefaultTagID.LowPriority)}
                        active={isLowPriority}
                        label={lowPriorityLabel}
                        iconClassName="mx_RoomTile_iconArrowDown"
                    />
                    {canInvite ? (
                        <IconizedContextMenuOption
                            onClick={this.onInviteClick}
                            label={_t("Invite People")}
                            iconClassName="mx_RoomTile_iconInvite"
                        />
                    ) : null}
                    <IconizedContextMenuOption
                        onClick={this.onOpenRoomSettings}
                        label={_t("Settings")}
                        iconClassName="mx_RoomTile_iconSettings"
                    />
                </IconizedContextMenuOptionList>
                <IconizedContextMenuOptionList red>
                    <IconizedContextMenuOption
                        onClick={this.onLeaveRoomClick}
                        label={_t("Leave Room")}
                        iconClassName="mx_RoomTile_iconSignOut"
                    />
                </IconizedContextMenuOptionList>
            </IconizedContextMenu>;
        }

        return (
            <React.Fragment>
                <ContextMenuTooltipButton
                    className="mx_RoomTile_menuButton"
                    onClick={this.onGeneralMenuOpenClick}
                    title={_t("Room options")}
                    isExpanded={!!this.state.generalMenuPosition}
                />
                {contextMenu}
            </React.Fragment>
        );
    }

    public render(): React.ReactElement {
        const { room, roomIndex } = this.props
        return (
            <RovingAccessibleTooltipButton
                className="mx_RoomBreadcrumbs_crumb"
                key={this.props.room.roomId}
                onClick={() => this.viewRoom(room, roomIndex)}
                aria-label={_t("Room %(name)s", {name: room.name})}
                title={room.name}
                onContextMenu={this.onContextMenu}
                forceHide={!!this.state.generalMenuPosition}
                tooltipClassName="mx_RoomBreadcrumbs_Tooltip"
            >
                <DecoratedRoomAvatar
                    room={room}
                    avatarSize={32}
                    displayBadge={true}
                    forceCount={true}
                />
                {this.renderGeneralMenu()}
            </RovingAccessibleTooltipButton>
        );
    }
}
