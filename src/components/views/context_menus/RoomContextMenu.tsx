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

import React, { useContext } from "react";
import { Room } from "matrix-js-sdk/src/models/room";
import { logger } from "matrix-js-sdk/src/logger";

import { IProps as IContextMenuProps } from "../../structures/ContextMenu";
import IconizedContextMenu, {
    IconizedContextMenuCheckbox,
    IconizedContextMenuOption,
    IconizedContextMenuOptionList,
} from "./IconizedContextMenu";
import { _t } from "../../../languageHandler";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import { ButtonEvent } from "../elements/AccessibleButton";
import { DefaultTagID, TagID } from "../../../stores/room-list/models";
import RoomListStore, { LISTS_UPDATE_EVENT } from "../../../stores/room-list/RoomListStore";
import dis from "../../../dispatcher/dispatcher";
import RoomListActions from "../../../actions/RoomListActions";
import { EchoChamber } from "../../../stores/local-echo/EchoChamber";
import { RoomNotifState } from "../../../RoomNotifs";
import Modal from "../../../Modal";
import ExportDialog from "../dialogs/ExportDialog";
import { useFeatureEnabled } from "../../../hooks/useSettings";
import { usePinnedEvents } from "../right_panel/PinnedMessagesCard";
import { RoomViewStore } from "../../../stores/RoomViewStore";
import { RightPanelPhases } from '../../../stores/right-panel/RightPanelStorePhases';
import { ROOM_NOTIFICATIONS_TAB } from "../dialogs/RoomSettingsDialog";
import { useEventEmitterState } from "../../../hooks/useEventEmitter";
import RightPanelStore from "../../../stores/right-panel/RightPanelStore";
import DMRoomMap from "../../../utils/DMRoomMap";
import { Action } from "../../../dispatcher/actions";
import PosthogTrackers from "../../../PosthogTrackers";
import { ViewRoomPayload } from "../../../dispatcher/payloads/ViewRoomPayload";
import { getKeyBindingsManager } from "../../../KeyBindingsManager";
import { KeyBindingAction } from "../../../accessibility/KeyboardShortcuts";
import SettingsStore from "../../../settings/SettingsStore";
import DevtoolsDialog from "../dialogs/DevtoolsDialog";

interface IProps extends IContextMenuProps {
    room: Room;
}

const RoomContextMenu = ({ room, onFinished, ...props }: IProps) => {
    const cli = useContext(MatrixClientContext);
    const roomTags = useEventEmitterState(
        RoomListStore.instance,
        LISTS_UPDATE_EVENT,
        () => RoomListStore.instance.getTagsForRoom(room),
    );

    let leaveOption: JSX.Element;
    if (roomTags.includes(DefaultTagID.Archived)) {
        const onForgetRoomClick = (ev: ButtonEvent) => {
            ev.preventDefault();
            ev.stopPropagation();

            dis.dispatch({
                action: "forget_room",
                room_id: room.roomId,
            });
            onFinished();
        };

        leaveOption = <IconizedContextMenuOption
            iconClassName="mx_RoomTile_iconSignOut"
            label={_t("Forget")}
            className="mx_IconizedContextMenu_option_red"
            onClick={onForgetRoomClick}
        />;
    } else {
        const onLeaveRoomClick = (ev: ButtonEvent) => {
            ev.preventDefault();
            ev.stopPropagation();

            dis.dispatch({
                action: "leave_room",
                room_id: room.roomId,
            });
            onFinished();

            PosthogTrackers.trackInteraction("WebRoomHeaderContextMenuLeaveItem", ev);
        };

        leaveOption = <IconizedContextMenuOption
            onClick={onLeaveRoomClick}
            label={_t("Leave")}
            className="mx_IconizedContextMenu_option_red"
            iconClassName="mx_RoomTile_iconSignOut"
        />;
    }

    const isDm = DMRoomMap.shared().getUserIdForRoomId(room.roomId);
    const isVideoRoom = useFeatureEnabled("feature_video_rooms") && room.isElementVideoRoom();

    let inviteOption: JSX.Element;
    if (room.canInvite(cli.getUserId()) && !isDm) {
        const onInviteClick = (ev: ButtonEvent) => {
            ev.preventDefault();
            ev.stopPropagation();

            dis.dispatch({
                action: "view_invite",
                roomId: room.roomId,
            });
            onFinished();

            PosthogTrackers.trackInteraction("WebRoomHeaderContextMenuInviteItem", ev);
        };

        inviteOption = <IconizedContextMenuOption
            onClick={onInviteClick}
            label={_t("Invite")}
            iconClassName="mx_RoomTile_iconInvite"
        />;
    }

    let favouriteOption: JSX.Element;
    let lowPriorityOption: JSX.Element;
    let notificationOption: JSX.Element;
    if (room.getMyMembership() === "join") {
        const isFavorite = roomTags.includes(DefaultTagID.Favourite);
        favouriteOption = <IconizedContextMenuCheckbox
            onClick={(e) => {
                onTagRoom(e, DefaultTagID.Favourite);
                PosthogTrackers.trackInteraction("WebRoomHeaderContextMenuFavouriteToggle", e);
            }}
            active={isFavorite}
            label={isFavorite ? _t("Favourited") : _t("Favourite")}
            iconClassName="mx_RoomTile_iconStar"
        />;

        const isLowPriority = roomTags.includes(DefaultTagID.LowPriority);
        lowPriorityOption = <IconizedContextMenuCheckbox
            onClick={(e) => onTagRoom(e, DefaultTagID.LowPriority)}
            active={isLowPriority}
            label={_t("Low priority")}
            iconClassName="mx_RoomTile_iconArrowDown"
        />;

        const echoChamber = EchoChamber.forRoom(room);
        let notificationLabel: string;
        let iconClassName: string;
        switch (echoChamber.notificationVolume) {
            case RoomNotifState.AllMessages:
                notificationLabel = _t("Default");
                iconClassName = "mx_RoomTile_iconNotificationsDefault";
                break;
            case RoomNotifState.AllMessagesLoud:
                notificationLabel = _t("All messages");
                iconClassName = "mx_RoomTile_iconNotificationsAllMessages";
                break;
            case RoomNotifState.MentionsOnly:
                notificationLabel = _t("Mentions only");
                iconClassName = "mx_RoomTile_iconNotificationsMentionsKeywords";
                break;
            case RoomNotifState.Mute:
                notificationLabel = _t("Mute");
                iconClassName = "mx_RoomTile_iconNotificationsNone";
                break;
        }

        notificationOption = <IconizedContextMenuOption
            onClick={(ev: ButtonEvent) => {
                ev.preventDefault();
                ev.stopPropagation();

                dis.dispatch({
                    action: "open_room_settings",
                    room_id: room.roomId,
                    initial_tab_id: ROOM_NOTIFICATIONS_TAB,
                });
                onFinished();

                PosthogTrackers.trackInteraction("WebRoomHeaderContextMenuNotificationsItem", ev);
            }}
            label={_t("Notifications")}
            iconClassName={iconClassName}
        >
            <span className="mx_IconizedContextMenu_sublabel">
                { notificationLabel }
            </span>
        </IconizedContextMenuOption>;
    }

    let peopleOption: JSX.Element;
    let copyLinkOption: JSX.Element;
    if (!isDm) {
        peopleOption = <IconizedContextMenuOption
            onClick={(ev: ButtonEvent) => {
                ev.preventDefault();
                ev.stopPropagation();

                ensureViewingRoom(ev);
                RightPanelStore.instance.pushCard({ phase: RightPanelPhases.RoomMemberList }, false);
                onFinished();
                PosthogTrackers.trackInteraction("WebRoomHeaderContextMenuPeopleItem", ev);
            }}
            label={_t("People")}
            iconClassName="mx_RoomTile_iconPeople"
        >
            <span className="mx_IconizedContextMenu_sublabel">
                { room.getJoinedMemberCount() }
            </span>
        </IconizedContextMenuOption>;

        copyLinkOption = <IconizedContextMenuOption
            onClick={(ev: ButtonEvent) => {
                ev.preventDefault();
                ev.stopPropagation();

                dis.dispatch({
                    action: "copy_room",
                    room_id: room.roomId,
                });
                onFinished();
            }}
            label={_t("Copy room link")}
            iconClassName="mx_RoomTile_iconCopyLink"
        />;
    }

    let filesOption: JSX.Element;
    if (!isVideoRoom) {
        filesOption = <IconizedContextMenuOption
            onClick={(ev: ButtonEvent) => {
                ev.preventDefault();
                ev.stopPropagation();

                ensureViewingRoom(ev);
                RightPanelStore.instance.pushCard({ phase: RightPanelPhases.FilePanel }, false);
                onFinished();
            }}
            label={_t("Files")}
            iconClassName="mx_RoomTile_iconFiles"
        />;
    }

    const pinningEnabled = useFeatureEnabled("feature_pinning");
    const pinCount = usePinnedEvents(pinningEnabled && room)?.length;

    let pinsOption: JSX.Element;
    if (pinningEnabled && !isVideoRoom) {
        pinsOption = <IconizedContextMenuOption
            onClick={(ev: ButtonEvent) => {
                ev.preventDefault();
                ev.stopPropagation();

                ensureViewingRoom(ev);
                RightPanelStore.instance.pushCard({ phase: RightPanelPhases.PinnedMessages }, false);
                onFinished();
            }}
            label={_t("Pinned")}
            iconClassName="mx_RoomTile_iconPins"
        >
            { pinCount > 0 && <span className="mx_IconizedContextMenu_sublabel">
                { pinCount }
            </span> }
        </IconizedContextMenuOption>;
    }

    let widgetsOption: JSX.Element;
    if (!isVideoRoom) {
        widgetsOption = <IconizedContextMenuOption
            onClick={(ev: ButtonEvent) => {
                ev.preventDefault();
                ev.stopPropagation();

                ensureViewingRoom(ev);
                RightPanelStore.instance.setCard({ phase: RightPanelPhases.RoomSummary }, false);
                onFinished();
            }}
            label={_t("Widgets")}
            iconClassName="mx_RoomTile_iconWidgets"
        />;
    }

    let exportChatOption: JSX.Element;
    if (!isVideoRoom) {
        exportChatOption = <IconizedContextMenuOption
            onClick={(ev: ButtonEvent) => {
                ev.preventDefault();
                ev.stopPropagation();

                Modal.createDialog(ExportDialog, { room });
                onFinished();
            }}
            label={_t("Export chat")}
            iconClassName="mx_RoomTile_iconExport"
        />;
    }

    const onTagRoom = (ev: ButtonEvent, tagId: TagID) => {
        ev.preventDefault();
        ev.stopPropagation();

        if (tagId === DefaultTagID.Favourite || tagId === DefaultTagID.LowPriority) {
            const inverseTag = tagId === DefaultTagID.Favourite ? DefaultTagID.LowPriority : DefaultTagID.Favourite;
            const isApplied = RoomListStore.instance.getTagsForRoom(room).includes(tagId);
            const removeTag = isApplied ? tagId : inverseTag;
            const addTag = isApplied ? null : tagId;
            dis.dispatch(RoomListActions.tagRoom(cli, room, removeTag, addTag, undefined, 0));
        } else {
            logger.warn(`Unexpected tag ${tagId} applied to ${room.roomId}`);
        }

        const action = getKeyBindingsManager().getAccessibilityAction(ev as React.KeyboardEvent);
        switch (action) {
            case KeyBindingAction.Enter:
                // Implements https://www.w3.org/TR/wai-aria-practices/#keyboard-interaction-12
                onFinished();
                break;
        }
    };

    const ensureViewingRoom = (ev: ButtonEvent) => {
        if (RoomViewStore.instance.getRoomId() === room.roomId) return;
        dis.dispatch<ViewRoomPayload>({
            action: Action.ViewRoom,
            room_id: room.roomId,
            metricsTrigger: "RoomList",
            metricsViaKeyboard: ev.type !== "click",
        }, true);
    };

    return <IconizedContextMenu {...props} onFinished={onFinished} className="mx_RoomTile_contextMenu" compact>
        <IconizedContextMenuOptionList>
            { inviteOption }
            { notificationOption }
            { favouriteOption }
            { peopleOption }
            { filesOption }
            { pinsOption }
            { widgetsOption }
            { lowPriorityOption }
            { copyLinkOption }

            <IconizedContextMenuOption
                onClick={(ev: ButtonEvent) => {
                    ev.preventDefault();
                    ev.stopPropagation();

                    dis.dispatch({
                        action: "open_room_settings",
                        room_id: room.roomId,
                    });
                    onFinished();
                    PosthogTrackers.trackInteraction("WebRoomHeaderContextMenuSettingsItem", ev);
                }}
                label={_t("Settings")}
                iconClassName="mx_RoomTile_iconSettings"
            />

            { exportChatOption }

            { SettingsStore.getValue("developerMode") && <IconizedContextMenuOption
                onClick={(ev: ButtonEvent) => {
                    ev.preventDefault();
                    ev.stopPropagation();

                    Modal.createDialog(DevtoolsDialog, {
                        roomId: RoomViewStore.instance.getRoomId(),
                    }, "mx_DevtoolsDialog_wrapper");
                    onFinished();
                }}
                label={_t("Developer tools")}
                iconClassName="mx_RoomTile_iconDeveloperTools"
            /> }

            { leaveOption }
        </IconizedContextMenuOptionList>
    </IconizedContextMenu>;
};

export default RoomContextMenu;

