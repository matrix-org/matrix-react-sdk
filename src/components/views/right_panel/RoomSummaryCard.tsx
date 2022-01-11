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

import React, { useCallback, useState, useEffect, useContext } from "react";
import classNames from "classnames";
import { Room } from "matrix-js-sdk/src/models/room";

import MatrixClientContext from "../../../contexts/MatrixClientContext";
import { useIsEncrypted } from '../../../hooks/useIsEncrypted';
import BaseCard, { Group } from "./BaseCard";
import { _t } from '../../../languageHandler';
import RoomAvatar from "../avatars/RoomAvatar";
import AccessibleButton from "../elements/AccessibleButton";
import defaultDispatcher from "../../../dispatcher/dispatcher";
import { RightPanelPhases } from '../../../stores/right-panel/RightPanelStorePhases';
import Modal from "../../../Modal";
import ShareDialog from '../dialogs/ShareDialog';
import { useEventEmitter } from "../../../hooks/useEventEmitter";
import WidgetUtils from "../../../utils/WidgetUtils";
import { IntegrationManagers } from "../../../integrations/IntegrationManagers";
import SettingsStore from "../../../settings/SettingsStore";
import TextWithTooltip from "../elements/TextWithTooltip";
import WidgetAvatar from "../avatars/WidgetAvatar";
import AccessibleTooltipButton from "../elements/AccessibleTooltipButton";
import WidgetStore, { IApp } from "../../../stores/WidgetStore";
import { E2EStatus } from "../../../utils/ShieldUtils";
import RoomContext from "../../../contexts/RoomContext";
import { UIFeature } from "../../../settings/UIFeature";
import { ChevronFace, ContextMenuTooltipButton, useContextMenu } from "../../structures/ContextMenu";
import WidgetContextMenu from "../context_menus/WidgetContextMenu";
import { useRoomMemberCount } from "../../../hooks/useRoomMembers";
import { Container, MAX_PINNED, WidgetLayoutStore } from "../../../stores/widgets/WidgetLayoutStore";
import RoomName from "../elements/RoomName";
import UIStore from "../../../stores/UIStore";
import ExportDialog from "../dialogs/ExportDialog";
import RightPanelStore from "../../../stores/right-panel/RightPanelStore";

interface IProps {
    room: Room;
    onClose(): void;
}

interface IAppsSectionProps {
    room: Room;
}

interface IButtonProps {
    className: string;
    onClick(): void;
}

const Button: React.FC<IButtonProps> = ({ children, className, onClick }) => {
    return <AccessibleButton
        className={classNames("mx_BaseCard_Button mx_RoomSummaryCard_Button", className)}
        onClick={onClick}
    >
        { children }
    </AccessibleButton>;
};

export const useWidgets = (room: Room) => {
    const [apps, setApps] = useState<IApp[]>(WidgetStore.instance.getApps(room.roomId));

    const updateApps = useCallback(() => {
        // Copy the array so that we always trigger a re-render, as some updates mutate the array of apps/settings
        setApps([...WidgetStore.instance.getApps(room.roomId)]);
    }, [room]);

    useEffect(updateApps, [room, updateApps]);
    useEventEmitter(WidgetStore.instance, room.roomId, updateApps);
    useEventEmitter(WidgetLayoutStore.instance, WidgetLayoutStore.emissionForRoom(room), updateApps);

    return apps;
};

interface IAppRowProps {
    app: IApp;
    room: Room;
}

const AppRow: React.FC<IAppRowProps> = ({ app, room }) => {
    const name = WidgetUtils.getWidgetName(app);
    const dataTitle = WidgetUtils.getWidgetDataTitle(app);
    const subtitle = dataTitle && " - " + dataTitle;
    const [canModifyWidget, setCanModifyWidget] = useState<boolean>();

    useEffect(() => {
        setCanModifyWidget(WidgetUtils.canUserModifyWidgets(room.roomId));
    }, [room.roomId]);

    const onOpenWidgetClick = () => {
        RightPanelStore.instance.pushCard({
            phase: RightPanelPhases.Widget,
            state: { widgetId: app.id },
        });
    };

    const isPinned = WidgetLayoutStore.instance.isInContainer(room, app, Container.Top);
    const togglePin = isPinned
        ? () => { WidgetLayoutStore.instance.moveToContainer(room, app, Container.Right); }
        : () => { WidgetLayoutStore.instance.moveToContainer(room, app, Container.Top); };

    const [menuDisplayed, handle, openMenu, closeMenu] = useContextMenu<HTMLDivElement>();
    let contextMenu;
    if (menuDisplayed) {
        const rect = handle.current.getBoundingClientRect();
        contextMenu = <WidgetContextMenu
            chevronFace={ChevronFace.None}
            right={UIStore.instance.windowWidth - rect.right}
            bottom={UIStore.instance.windowHeight - rect.top}
            onFinished={closeMenu}
            app={app}
        />;
    }

    const cannotPin = !isPinned && !WidgetLayoutStore.instance.canAddToContainer(room, Container.Top);

    let pinTitle: string;
    if (cannotPin) {
        pinTitle = _t("You can only pin up to %(count)s widgets", { count: MAX_PINNED });
    } else {
        pinTitle = isPinned ? _t("Unpin") : _t("Pin");
    }

    const classes = classNames("mx_BaseCard_Button mx_RoomSummaryCard_Button", {
        mx_RoomSummaryCard_Button_pinned: isPinned,
    });

    const isMaximised = WidgetLayoutStore.instance.isInContainer(room, app, Container.Center);
    const toggleMaximised = isMaximised
        ? () => { WidgetLayoutStore.instance.moveToContainer(room, app, Container.Right); }
        : () => { WidgetLayoutStore.instance.moveToContainer(room, app, Container.Center); };

    const maximiseTitle = isMaximised ? _t("Close") : _t("Maximise widget");

    let openTitle = "";
    if (isPinned) {
        openTitle = _t("Unpin this widget to view it in this panel");
    } else if (isMaximised) {
        openTitle =_t("Close this widget to view it in this panel");
    }

    return <div className={classes} ref={handle}>
        <AccessibleTooltipButton
            className="mx_RoomSummaryCard_icon_app"
            onClick={onOpenWidgetClick}
            // only show a tooltip if the widget is pinned
            title={openTitle}
            forceHide={!(isPinned || isMaximised)}
            disabled={isPinned || isMaximised}
            yOffset={-48}
        >
            <WidgetAvatar app={app} />
            <span>{ name }</span>
            { subtitle }
        </AccessibleTooltipButton>

        { canModifyWidget && <ContextMenuTooltipButton
            className={classNames({
                "mx_RoomSummaryCard_app_options": true,
                "mx_RoomSummaryCard_maximised_widget": SettingsStore.getValue("feature_maximised_widgets"),
            })}
            isExpanded={menuDisplayed}
            onClick={openMenu}
            title={_t("Options")}
            yOffset={-24}
        /> }

        <AccessibleTooltipButton
            className="mx_RoomSummaryCard_app_pinToggle"
            onClick={togglePin}
            title={pinTitle}
            disabled={cannotPin}
            yOffset={-24}
        />
        { SettingsStore.getValue("feature_maximised_widgets") &&
        <AccessibleTooltipButton
            className={isMaximised ? "mx_RoomSummaryCard_app_minimise" : "mx_RoomSummaryCard_app_maximise"}
            onClick={toggleMaximised}
            title={maximiseTitle}
            yOffset={-24}
        /> }

        { contextMenu }
    </div>;
};

const AppsSection: React.FC<IAppsSectionProps> = ({ room }) => {
    const apps = useWidgets(room);

    const onManageIntegrations = () => {
        const managers = IntegrationManagers.sharedInstance();
        if (!managers.hasManager()) {
            managers.openNoManagerDialog();
        } else {
            if (SettingsStore.getValue("feature_many_integration_managers")) {
                managers.openAll(room);
            } else {
                managers.getPrimaryManager().open(room);
            }
        }
    };

    let copyLayoutBtn = null;
    if (apps.length > 0 && WidgetLayoutStore.instance.canCopyLayoutToRoom(room)) {
        copyLayoutBtn = (
            <AccessibleButton kind="link" onClick={() => WidgetLayoutStore.instance.copyLayoutToRoom(room)}>
                { _t("Set my room layout for everyone") }
            </AccessibleButton>
        );
    }

    return <Group className="mx_RoomSummaryCard_appsGroup" title={_t("Widgets")}>
        { apps.map(app => <AppRow key={app.id} app={app} room={room} />) }
        { copyLayoutBtn }
        <AccessibleButton kind="link" onClick={onManageIntegrations}>
            { apps.length > 0 ? _t("Edit widgets, bridges & bots") : _t("Add widgets, bridges & bots") }
        </AccessibleButton>
    </Group>;
};

export const onRoomMembersClick = (allowClose = true) => {
    RightPanelStore.instance.pushCard({ phase: RightPanelPhases.RoomMemberList }, allowClose);
};

export const onRoomFilesClick = (allowClose = true) => {
    RightPanelStore.instance.pushCard({ phase: RightPanelPhases.FilePanel }, allowClose);
};

const onRoomSettingsClick = () => {
    defaultDispatcher.dispatch({ action: "open_room_settings" });
};

const RoomSummaryCard: React.FC<IProps> = ({ room, onClose }) => {
    const cli = useContext(MatrixClientContext);

    const onShareRoomClick = () => {
        Modal.createTrackedDialog('share room dialog', '', ShareDialog, {
            target: room,
        });
    };

    const onRoomExportClick = async () => {
        Modal.createTrackedDialog('export room dialog', '', ExportDialog, {
            room,
        });
    };

    const isRoomEncrypted = useIsEncrypted(cli, room);
    const roomContext = useContext(RoomContext);
    const e2eStatus = roomContext.e2eStatus;

    const alias = room.getCanonicalAlias() || room.getAltAliases()[0] || "";
    const header = <React.Fragment>
        <div className="mx_RoomSummaryCard_avatar" role="presentation">
            <RoomAvatar room={room} height={54} width={54} viewAvatarOnClick />
            <TextWithTooltip
                tooltip={isRoomEncrypted ? _t("Encrypted") : _t("Not encrypted")}
                class={classNames("mx_RoomSummaryCard_e2ee", {
                    mx_RoomSummaryCard_e2ee_normal: isRoomEncrypted,
                    mx_RoomSummaryCard_e2ee_warning: isRoomEncrypted && e2eStatus === E2EStatus.Warning,
                    mx_RoomSummaryCard_e2ee_verified: isRoomEncrypted && e2eStatus === E2EStatus.Verified,
                })}
            />
        </div>

        <RoomName room={room}>
            { name => (
                <h2 title={name}>
                    { name }
                </h2>
            ) }
        </RoomName>
        <div className="mx_RoomSummaryCard_alias" title={alias}>
            { alias }
        </div>
    </React.Fragment>;

    const memberCount = useRoomMemberCount(room);

    return <BaseCard header={header} className="mx_RoomSummaryCard" onClose={onClose}>
        <Group title={_t("About")} className="mx_RoomSummaryCard_aboutGroup">
            <Button className="mx_RoomSummaryCard_icon_people" onClick={onRoomMembersClick}>
                { _t("People") }
                <span className="mx_BaseCard_Button_sublabel">
                    { memberCount }
                </span>
            </Button>
            <Button className="mx_RoomSummaryCard_icon_files" onClick={onRoomFilesClick}>
                { _t("Files") }
            </Button>
            <Button className="mx_RoomSummaryCard_icon_export" onClick={onRoomExportClick}>
                { _t("Export chat") }
            </Button>
            <Button className="mx_RoomSummaryCard_icon_share" onClick={onShareRoomClick}>
                { _t("Share room") }
            </Button>
            <Button className="mx_RoomSummaryCard_icon_settings" onClick={onRoomSettingsClick}>
                { _t("Room settings") }
            </Button>
        </Group>

        { SettingsStore.getValue(UIFeature.Widgets) && <AppsSection room={room} /> }
    </BaseCard>;
};

export default RoomSummaryCard;
