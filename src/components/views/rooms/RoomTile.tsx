/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 New Vector Ltd
Copyright 2018 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2019, 2020 The Matrix.org Foundation C.I.C.

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
import classNames from "classnames";
import { RovingTabIndexWrapper } from "../../../accessibility/RovingTabIndex";
import AccessibleButton, { ButtonEvent } from "../../views/elements/AccessibleButton";
import { Key } from "../../../Keyboard";
import { _t } from "../../../languageHandler";
import { ChevronFace, ContextMenuTooltipButton } from "../../structures/ContextMenu";
import DecoratedRoomAvatar from "../avatars/DecoratedRoomAvatar";
import { ALL_MESSAGES, ALL_MESSAGES_LOUD, MENTIONS_ONLY, MUTE } from "../../../RoomNotifs";
import NotificationBadge from "./NotificationBadge";
import { Volume } from "../../../RoomNotifsTypes";
import AccessibleTooltipButton from "../elements/AccessibleTooltipButton";
import IconizedContextMenu, {
    IconizedContextMenuCheckbox,
    IconizedContextMenuOption,
    IconizedContextMenuOptionList,
    IconizedContextMenuRadio,
} from "../context_menus/IconizedContextMenu";
import {replaceableComponent} from "../../../utils/replaceableComponent";
import {RoomTileViewModel} from "../../../domain/session/leftpanel/RoomTileViewModel";

interface IProps {
    model: RoomTileViewModel;
}

type PartialDOMRect = Pick<DOMRect, "left" | "bottom">;

interface IState {
    notificationsMenuPosition: PartialDOMRect;
    generalMenuPosition: PartialDOMRect;
}

const messagePreviewId = (roomId: string) => `mx_RoomTile_messagePreview_${roomId}`;

const contextMenuBelow = (elementRect: PartialDOMRect) => {
    // align the context menu's icons with the icon which opened the context menu
    const left = elementRect.left + window.pageXOffset - 9;
    const top = elementRect.bottom + window.pageYOffset + 17;
    const chevronFace = ChevronFace.None;
    return {left, top, chevronFace};
};

@replaceableComponent("views.rooms.RoomTile")
export default class RoomTile extends React.PureComponent<IProps, IState> {
    private roomTileRef = createRef<HTMLDivElement>();

    constructor(props: IProps) {
        super(props);
        this.state = {
            notificationsMenuPosition: null,
            generalMenuPosition: null,
        };
    }

    public componentDidMount() {
        // when we're first rendered (or our sublist is expanded) make sure we are visible if we're active
        if (this.props.model.selected) {
            this.scrollIntoView();
        }
        this.props.model.on("change", this.rerender);
    }

    public componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IState>) {
        if (this.props.model.ensureVisible) {
            setImmediate(() => {
                this.scrollIntoView();
            });
        }
    }

    public componentWillUnmount() {
        this.props.model.off("change", this.rerender);
        this.props.model.destroy();
    }

    private rerender = () => {
        this.forceUpdate();
    };

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
        const clearSearch = ev && (ev.key === Key.ENTER || ev.key === Key.SPACE);
        this.props.model.open(clearSearch);
    };


    private onNotificationsMenuOpenClick = (ev: React.MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        const target = ev.target as HTMLButtonElement;
        this.setState({notificationsMenuPosition: target.getBoundingClientRect()});
    };

    private onCloseNotificationsMenu = () => {
        this.setState({notificationsMenuPosition: null});
    };

    private onGeneralMenuOpenClick = (ev: React.MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        const target = ev.target as HTMLButtonElement;
        this.setState({generalMenuPosition: target.getBoundingClientRect()});
    };

    private onContextMenu = (ev: React.MouseEvent) => {
        // If we don't have a context menu to show, ignore the action.
        if (!this.props.model.showContextMenu) return;

        ev.preventDefault();
        ev.stopPropagation();
        this.setState({
            generalMenuPosition: {
                left: ev.clientX,
                bottom: ev.clientY,
            },
        });
    };

    private onCloseGeneralMenu = () => {
        this.setState({generalMenuPosition: null});
    };

    private closeGeneralMenu = (ev: ButtonEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        this.setState({generalMenuPosition: null}); // hide the menu
    };

    private closeGeneralMenuOnEnter = (ev: ButtonEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        if ((ev as React.KeyboardEvent).key === Key.ENTER) {
            // Implements https://www.w3.org/TR/wai-aria-practices/#keyboard-interaction-12
            this.setState({generalMenuPosition: null}); // hide the menu
        }
    };

    private closeNotificationsMenuOnEnter = (ev: ButtonEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        const key = (ev as React.KeyboardEvent).key;
        if (key === Key.ENTER) {
            // Implements https://www.w3.org/TR/wai-aria-practices/#keyboard-interaction-12
            this.setState({notificationsMenuPosition: null}); // hide the menu
        }
    };

    private onLeaveRoomClick = (ev: ButtonEvent) => {
        this.props.model.leave();
        this.closeGeneralMenu(ev);
    };

    private onForgetRoomClick = (ev: ButtonEvent) => {
        this.props.model.forget();
        this.closeGeneralMenu(ev);
    };

    private onOpenRoomSettings = (ev: ButtonEvent) => {
        this.props.model.openSettings();
        this.closeGeneralMenu(ev);
    };

    private onInviteClick = (ev: ButtonEvent) => {
        this.props.model.invitePeople();
        this.closeGeneralMenu(ev);
    };

    private async saveNotifState(ev: ButtonEvent, volume: Volume) {
        this.props.model.setNotificationVolume(volume);
        this.closeNotificationsMenuOnEnter(ev);
    }

    private async toggleFavourite(ev: ButtonEvent) {
        this.props.model.toggleFavourite();
        this.closeGeneralMenuOnEnter(ev);
    }

    private async toggleLowPriority(ev: ButtonEvent) {
        this.props.model.toggleLowPriority();
        this.closeGeneralMenuOnEnter(ev);
    }

    private onClickAllNotifs = ev => this.saveNotifState(ev, ALL_MESSAGES);
    private onClickAlertMe = ev => this.saveNotifState(ev, ALL_MESSAGES_LOUD);
    private onClickMentions = ev => this.saveNotifState(ev, MENTIONS_ONLY);
    private onClickMute = ev => this.saveNotifState(ev, MUTE);

    private renderNotificationsMenu(isActive: boolean): React.ReactElement {
        if (!this.props.model.showNotificationMenu) {
            // the menu makes no sense in these cases so do not show one
            return null;
        }

        const volume = this.props.model.notificationVolume;

        let contextMenu = null;
        if (this.state.notificationsMenuPosition) {
            contextMenu = <IconizedContextMenu
                {...contextMenuBelow(this.state.notificationsMenuPosition)}
                onFinished={this.onCloseNotificationsMenu}
                className="mx_RoomTile_contextMenu"
                compact
            >
                <IconizedContextMenuOptionList first>
                    <IconizedContextMenuRadio
                        label={_t("Use default")}
                        active={volume === ALL_MESSAGES}
                        iconClassName="mx_RoomTile_iconBell"
                        onClick={this.onClickAllNotifs}
                    />
                    <IconizedContextMenuRadio
                        label={_t("All messages")}
                        active={volume === ALL_MESSAGES_LOUD}
                        iconClassName="mx_RoomTile_iconBellDot"
                        onClick={this.onClickAlertMe}
                    />
                    <IconizedContextMenuRadio
                        label={_t("Mentions & Keywords")}
                        active={volume === MENTIONS_ONLY}
                        iconClassName="mx_RoomTile_iconBellMentions"
                        onClick={this.onClickMentions}
                    />
                    <IconizedContextMenuRadio
                        label={_t("None")}
                        active={volume === MUTE}
                        iconClassName="mx_RoomTile_iconBellCrossed"
                        onClick={this.onClickMute}
                    />
                </IconizedContextMenuOptionList>
            </IconizedContextMenu>;
        }

        const classes = classNames("mx_RoomTile_notificationsButton", {
            // Show bell icon for the default case too.
            mx_RoomTile_iconBell: volume === ALL_MESSAGES,
            mx_RoomTile_iconBellDot: volume === ALL_MESSAGES_LOUD,
            mx_RoomTile_iconBellMentions: volume === MENTIONS_ONLY,
            mx_RoomTile_iconBellCrossed: volume === MUTE,

            // Only show the icon by default if the room is overridden to muted.
            // TODO: [FTUE Notifications] Probably need to detect global mute state
            mx_RoomTile_notificationsButton_show: volume === MUTE,
        });

        return (
            <React.Fragment>
                <ContextMenuTooltipButton
                    className={classes}
                    onClick={this.onNotificationsMenuOpenClick}
                    title={_t("Notification options")}
                    isExpanded={!!this.state.notificationsMenuPosition}
                    tabIndex={isActive ? 0 : -1}
                />
                {contextMenu}
            </React.Fragment>
        );
    }

    private renderGeneralMenu(): React.ReactElement {
        if (!this.props.model.showContextMenu) return null; // no menu to show

        let contextMenu = null;
        if (this.state.generalMenuPosition && this.props.model.isArchived) {
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
            const favouriteLabel = this.props.model.isFavourite ? _t("Favourited") : _t("Favourite");
            contextMenu = <IconizedContextMenu
                {...contextMenuBelow(this.state.generalMenuPosition)}
                onFinished={this.onCloseGeneralMenu}
                className="mx_RoomTile_contextMenu"
                compact
            >
                <IconizedContextMenuOptionList>
                    <IconizedContextMenuCheckbox
                        onClick={(e) => this.toggleFavourite(e)}
                        active={this.props.model.isFavourite}
                        label={favouriteLabel}
                        iconClassName="mx_RoomTile_iconStar"
                    />
                    <IconizedContextMenuCheckbox
                        onClick={(e) => this.toggleLowPriority(e)}
                        active={this.props.model.isLowPriority}
                        label={_t("Low Priority")}
                        iconClassName="mx_RoomTile_iconArrowDown"
                    />
                    {this.props.model.canInvite ? (
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
        const classes = classNames({
            'mx_RoomTile': true,
            'mx_RoomTile_selected': this.props.model.selected,
            'mx_RoomTile_hasMenuOpen': !!(this.state.generalMenuPosition || this.state.notificationsMenuPosition),
            'mx_RoomTile_minimized': this.props.model.isMinimized,
        });

        const roomAvatar = <DecoratedRoomAvatar
            room={this.props.model.room}
            avatarSize={32}
            displayBadge={this.props.model.isMinimized}
            oobData={({avatarUrl: this.props.model.avatarMxc})}
        />;

        const {notificationState} = this.props.model;
        let badge: React.ReactNode;
        if (!this.props.model.isMinimized) {
            // aria-hidden because we summarise the unread count/highlight status in a manual aria-label below
            badge = (
                <div className="mx_RoomTile_badgeContainer" aria-hidden="true">
                    <NotificationBadge
                        notification={notificationState}
                        forceCount={false}
                        roomId={this.props.model.id}
                    />
                </div>
            );
        }

        let messagePreview = null;
        if (this.props.model.messagePreview) {
            messagePreview = (
                <div className="mx_RoomTile_messagePreview" id={messagePreviewId(this.props.model.id)}>
                    {this.props.model.messagePreview}
                </div>
            );
        }

        const nameClasses = classNames({
            "mx_RoomTile_name": true,
            "mx_RoomTile_nameWithPreview": !!messagePreview,
            "mx_RoomTile_nameHasUnreadEvents": notificationState.isUnread,
        });

        const {name} = this.props.model;
        let nameContainer = (
            <div className="mx_RoomTile_nameContainer">
                <div title={name} className={nameClasses} tabIndex={-1} dir="auto">
                    {name}
                </div>
                {messagePreview}
            </div>
        );
        if (this.props.model.isMinimized) nameContainer = null;

        let ariaLabel = name;
        // The following labels are written in such a fashion to increase screen reader efficiency (speed).
        if (this.props.model.isInvite) {
            // append nothing
        } else if (notificationState.hasMentions) {
            ariaLabel += " " + _t("%(count)s unread messages including mentions.", {
                count: notificationState.count,
            });
        } else if (notificationState.hasUnreadCount) {
            ariaLabel += " " + _t("%(count)s unread messages.", {
                count: notificationState.count,
            });
        } else if (notificationState.isUnread) {
            ariaLabel += " " + _t("Unread messages.");
        }

        let ariaDescribedBy: string;
        if (messagePreview) {
            ariaDescribedBy = messagePreviewId(this.props.model.id);
        }

        const props: Partial<React.ComponentProps<typeof AccessibleTooltipButton>> = {};
        let Button: React.ComponentType<React.ComponentProps<typeof AccessibleButton>> = AccessibleButton;
        if (this.props.model.isMinimized) {
            Button = AccessibleTooltipButton;
            props.title = name;
            // force the tooltip to hide whilst we are showing the context menu
            props.forceHide = !!this.state.generalMenuPosition;
        }

        return (
            <React.Fragment>
                <RovingTabIndexWrapper inputRef={this.roomTileRef}>
                    {({onFocus, isActive, ref}) =>
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
                            aria-selected={this.props.model.selected}
                            aria-describedby={ariaDescribedBy}
                        >
                            {roomAvatar}
                            {nameContainer}
                            {badge}
                            {this.renderGeneralMenu()}
                            {this.renderNotificationsMenu(isActive)}
                        </Button>
                    }
                </RovingTabIndexWrapper>
            </React.Fragment>
        );
    }
}
