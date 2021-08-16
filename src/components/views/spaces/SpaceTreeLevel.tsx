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

import React, {
    createRef,
    MouseEvent,
    InputHTMLAttributes,
    LegacyRef,
    ComponentProps,
    ComponentType,
} from "react";
import classNames from "classnames";
import { Room } from "matrix-js-sdk/src/models/room";

import RoomAvatar from "../avatars/RoomAvatar";
import SpaceStore from "../../../stores/SpaceStore";
import SpaceTreeLevelLayoutStore from "../../../stores/SpaceTreeLevelLayoutStore";
import NotificationBadge from "../rooms/NotificationBadge";
import { RovingAccessibleTooltipButton } from "../../../accessibility/roving/RovingAccessibleTooltipButton";
import { _t } from "../../../languageHandler";
import { ContextMenuTooltipButton } from "../../../accessibility/context_menu/ContextMenuTooltipButton";
import { toRightOf, useContextMenu } from "../../structures/ContextMenu";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import AccessibleButton from "../elements/AccessibleButton";
import { StaticNotificationState } from "../../../stores/notifications/StaticNotificationState";
import { NotificationColor } from "../../../stores/notifications/NotificationColor";
import { getKeyBindingsManager, RoomListAction } from "../../../KeyBindingsManager";
import { NotificationState } from "../../../stores/notifications/NotificationState";
import SpaceContextMenu from "../context_menus/SpaceContextMenu";

interface IButtonProps extends Omit<ComponentProps<typeof RovingAccessibleTooltipButton>, "title"> {
    space?: Room;
    className?: string;
    selected?: boolean;
    label: string;
    contextMenuTooltip?: string;
    notificationState?: NotificationState;
    isNarrow?: boolean;
    avatarSize?: number;
    ContextMenuComponent?: ComponentType<ComponentProps<typeof SpaceContextMenu>>;
    onClick(ev: MouseEvent): void;
}

export const SpaceButton: React.FC<IButtonProps> = ({
    space,
    className,
    selected,
    onClick,
    label,
    contextMenuTooltip,
    notificationState,
    avatarSize,
    isNarrow,
    children,
    ContextMenuComponent,
    ...props
}) => {
    const [menuDisplayed, handle, openMenu, closeMenu] = useContextMenu<HTMLElement>();

    let avatar = <div className="mx_SpaceButton_avatarPlaceholder"><div className="mx_SpaceButton_icon" /></div>;
    if (space) {
        avatar = <RoomAvatar width={avatarSize} height={avatarSize} room={space} />;
    }

    let notifBadge;
    if (notificationState) {
        let ariaLabel = _t("Jump to first unread room.");
        if (space?.getMyMembership() === "invite") {
            ariaLabel = _t("Jump to first invite.");
        }

        notifBadge = <div className="mx_SpacePanel_badgeContainer">
            <NotificationBadge
                onClick={() => SpaceStore.instance.setActiveRoomInSpace(space || null)}
                forceCount={false}
                notification={notificationState}
                aria-label={ariaLabel}
            />
        </div>;
    }

    let contextMenu: JSX.Element;
    if (menuDisplayed && ContextMenuComponent) {
        contextMenu = <ContextMenuComponent
            {...toRightOf(handle.current?.getBoundingClientRect(), 0)}
            space={space}
            onFinished={closeMenu}
        />;
    }

    return (
        <RovingAccessibleTooltipButton
            {...props}
            className={classNames("mx_SpaceButton", className, {
                mx_SpaceButton_active: selected,
                mx_SpaceButton_hasMenuOpen: menuDisplayed,
                mx_SpaceButton_narrow: isNarrow,
            })}
            title={label}
            onClick={onClick}
            onContextMenu={openMenu}
            forceHide={!isNarrow || menuDisplayed}
            inputRef={handle}
        >
            { children }
            <div className="mx_SpaceButton_selectionWrapper">
                { avatar }
                { !isNarrow && <span className="mx_SpaceButton_name">{ label }</span> }
                { notifBadge }

                { ContextMenuComponent && <ContextMenuTooltipButton
                    className="mx_SpaceButton_menuButton"
                    onClick={openMenu}
                    title={contextMenuTooltip}
                    isExpanded={menuDisplayed}
                /> }

                { contextMenu }
            </div>
        </RovingAccessibleTooltipButton>
    );
};

interface IItemProps extends InputHTMLAttributes<HTMLLIElement> {
    space?: Room;
    activeSpaces: Room[];
    isNested?: boolean;
    isPanelCollapsed?: boolean;
    parents?: Set<string>;
    innerRef?: LegacyRef<HTMLLIElement>;
}

interface IItemState {
    collapsed: boolean;
    childSpaces: Room[];
}

export class SpaceItem extends React.PureComponent<IItemProps, IItemState> {
    static contextType = MatrixClientContext;

    private buttonRef = createRef<HTMLDivElement>();

    constructor(props) {
        super(props);

        const collapsed = SpaceTreeLevelLayoutStore.instance.getSpaceCollapsedState(
            props.space.roomId,
            this.props.parents,
            !props.isNested, // default to collapsed for root items
        );

        this.state = {
            collapsed: collapsed,
            childSpaces: this.childSpaces,
        };

        SpaceStore.instance.on(this.props.space.roomId, this.onSpaceUpdate);
    }

    componentWillUnmount() {
        SpaceStore.instance.off(this.props.space.roomId, this.onSpaceUpdate);
    }

    private onSpaceUpdate = () => {
        this.setState({
            childSpaces: this.childSpaces,
        });
    };

    private get childSpaces() {
        return SpaceStore.instance.getChildSpaces(this.props.space.roomId)
            .filter(s => !this.props.parents?.has(s.roomId));
    }

    private toggleCollapse = evt => {
        const newCollapsedState = !this.state.collapsed;

        SpaceTreeLevelLayoutStore.instance.setSpaceCollapsedState(
            this.props.space.roomId,
            this.props.parents,
            newCollapsedState,
        );
        this.setState({ collapsed: newCollapsedState });
        // don't bubble up so encapsulating button for space
        // doesn't get triggered
        evt.stopPropagation();
    };

    private onKeyDown = (ev: React.KeyboardEvent) => {
        let handled = true;
        const action = getKeyBindingsManager().getRoomListAction(ev);
        const hasChildren = this.state.childSpaces?.length;
        switch (action) {
            case RoomListAction.CollapseSection:
                if (hasChildren && !this.state.collapsed) {
                    this.toggleCollapse(ev);
                } else {
                    const parentItem = this.buttonRef?.current?.parentElement?.parentElement;
                    const parentButton = parentItem?.previousElementSibling as HTMLElement;
                    parentButton?.focus();
                }
                break;

            case RoomListAction.ExpandSection:
                if (hasChildren) {
                    if (this.state.collapsed) {
                        this.toggleCollapse(ev);
                    } else {
                        const childLevel = this.buttonRef?.current?.nextElementSibling;
                        const firstSpaceItemChild = childLevel?.querySelector<HTMLLIElement>(".mx_SpaceItem");
                        firstSpaceItemChild?.querySelector<HTMLDivElement>(".mx_SpaceButton")?.focus();
                    }
                }
                break;

            default:
                handled = false;
        }

        if (handled) {
            ev.stopPropagation();
            ev.preventDefault();
        }
    };

    private onClick = (ev: React.MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        SpaceStore.instance.setActiveSpace(this.props.space);
    };

    render() {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { space, activeSpaces, isNested, isPanelCollapsed, parents, innerRef,
            ...otherProps } = this.props;

        const itemClasses = classNames(this.props.className, {
            "mx_SpaceItem": true,
            "mx_SpaceItem_narrow": isPanelCollapsed,
            "collapsed": this.state.collapsed,
            "hasSubSpaces": this.state.childSpaces?.length,
        });

        const isInvite = space.getMyMembership() === "invite";

        const notificationState = isInvite
            ? StaticNotificationState.forSymbol("!", NotificationColor.Red)
            : SpaceStore.instance.getNotificationState(space.roomId);

        let childItems;
        if (this.state.childSpaces?.length && !this.state.collapsed) {
            childItems = <SpaceTreeLevel
                spaces={this.state.childSpaces}
                activeSpaces={activeSpaces}
                isNested={true}
                isPanelCollapsed={isPanelCollapsed}
                parents={new Set(parents).add(space.roomId)}
            />;
        }

        const toggleCollapseButton = this.state.childSpaces?.length ?
            <AccessibleButton
                className="mx_SpaceButton_toggleCollapse"
                onClick={this.toggleCollapse}
                tabIndex={-1}
                aria-label={this.state.collapsed ? _t("Expand") : _t("Collapse")}
            /> : null;

        return (
            <li {...otherProps} className={itemClasses} ref={innerRef} aria-expanded={!collapsed} role="treeitem">
                <SpaceButton
                    space={space}
                    className={isInvite ? "mx_SpaceButton_invite" : undefined}
                    selected={activeSpaces.includes(space)}
                    label={space.name}
                    contextMenuTooltip={_t("Space options")}
                    notificationState={notificationState}
                    isNarrow={isPanelCollapsed}
                    avatarSize={isNested ? 24 : 32}
                    onClick={this.onClick}
                    onKeyDown={this.onKeyDown}
                    ContextMenuComponent={this.props.space.getMyMembership() === "join" ? SpaceContextMenu : undefined}
                >
                    { toggleCollapseButton }
                </SpaceButton>

                { childItems }
            </li>
        );
    }
}

interface ITreeLevelProps {
    spaces: Room[];
    activeSpaces: Room[];
    isNested?: boolean;
    isPanelCollapsed?: boolean;
    parents: Set<string>;
}

const SpaceTreeLevel: React.FC<ITreeLevelProps> = ({
    spaces,
    activeSpaces,
    isNested,
    isPanelCollapsed,
    parents,
}) => {
    return <ul className="mx_SpaceTreeLevel" role="group">
        { spaces.map(s => {
            return (<SpaceItem
                key={s.roomId}
                activeSpaces={activeSpaces}
                space={s}
                isNested={isNested}
                isPanelCollapsed={isPanelCollapsed}
                parents={parents}
            />);
        }) }
    </ul>;
};

export default SpaceTreeLevel;
