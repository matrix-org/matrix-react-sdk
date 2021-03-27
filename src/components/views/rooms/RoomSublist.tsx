/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017, 2018 Vector Creations Ltd
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

import * as React from "react";
import { createRef, ReactComponentElement } from "react";
import { Room } from "matrix-js-sdk/src/models/room";
import classNames from 'classnames';
import { RovingAccessibleButton, RovingTabIndexWrapper } from "../../../accessibility/RovingTabIndex";
import { _t } from "../../../languageHandler";
import AccessibleButton from "../../views/elements/AccessibleButton";
import RoomTile from "./RoomTile";
import { ListLayout } from "../../../stores/room-list/ListLayout";
import {
    ChevronFace,
    ContextMenu,
    ContextMenuTooltipButton,
    StyledMenuItemCheckbox,
    StyledMenuItemRadio,
} from "../../structures/ContextMenu";
import RoomListStore, { LISTS_UPDATE_EVENT } from "../../../stores/room-list/RoomListStore";
import { ListAlgorithm, SortAlgorithm } from "../../../stores/room-list/algorithms/models";
import { DefaultTagID, TagID } from "../../../stores/room-list/models";
import dis from "../../../dispatcher/dispatcher";
import defaultDispatcher from "../../../dispatcher/dispatcher";
import NotificationBadge from "./NotificationBadge";
import AccessibleTooltipButton from "../elements/AccessibleTooltipButton";
import { Key } from "../../../Keyboard";
import { ActionPayload } from "../../../dispatcher/payloads";
import { Enable, Resizable } from "re-resizable";
import { Direction } from "re-resizable/lib/resizer";
import { polyfillTouchEvent } from "../../../@types/polyfill";
import { RoomNotificationStateStore } from "../../../stores/notifications/RoomNotificationStateStore";
import RoomListLayoutStore from "../../../stores/room-list/RoomListLayoutStore";
import { arrayFastClone, arrayHasOrderChange } from "../../../utils/arrays";
import { objectExcluding, objectHasDiff } from "../../../utils/objects";
import ExtraTile from "./ExtraTile";
import { ListNotificationState } from "../../../stores/notifications/ListNotificationState";
import IconizedContextMenu from "../context_menus/IconizedContextMenu";
import { getKeyBindingsManager, RoomListAction } from "../../../KeyBindingsManager";
import {replaceableComponent} from "../../../utils/replaceableComponent";

const SHOW_N_BUTTON_HEIGHT = 28; // As defined by CSS
const RESIZE_HANDLE_HEIGHT = 4; // As defined by CSS
export const HEADER_HEIGHT = 32; // As defined by CSS

const MAX_PADDING_HEIGHT = SHOW_N_BUTTON_HEIGHT + RESIZE_HANDLE_HEIGHT;

// HACK: We really shouldn't have to do this.
polyfillTouchEvent();

interface IProps {
    forRooms: boolean;
    startAsHidden: boolean;
    label: string;
    onAddRoom?: () => void;
    addRoomContextMenu?: (onFinished: () => void) => React.ReactNode;
    addRoomLabel: string;
    isMinimized: boolean;
    tagId: TagID;
    onResize: () => void;
    showSkeleton?: boolean;

    extraTiles?: ReactComponentElement<typeof ExtraTile>[];

    // TODO: Account for https://github.com/vector-im/element-web/issues/14179
}

// TODO: Use re-resizer's NumberSize when it is exposed as the type
interface ResizeDelta {
    width: number;
    height: number;
}

type PartialDOMRect = Pick<DOMRect, "left" | "top" | "height">;

interface IState {
    contextMenuPosition: PartialDOMRect;
    addRoomContextMenuPosition: PartialDOMRect;
    isResizing: boolean;
    isExpanded: boolean; // used for the for expand of the sublist when the room list is being filtered
    height: number;
    rooms: Room[];
    filteredExtraTiles?: ReactComponentElement<typeof ExtraTile>[];
}

@replaceableComponent("views.rooms.RoomSublist")
export default class RoomSublist extends React.Component<IProps, IState> {
    private headerButton = createRef<HTMLDivElement>();
    private sublistRef = createRef<HTMLDivElement>();
    private dispatcherRef: string;
    private layout: ListLayout;
    private heightAtStart: number;
    private isBeingFiltered: boolean;
    private notificationState: ListNotificationState;

    constructor(props: IProps) {
        super(props);

        this.layout = RoomListLayoutStore.instance.getLayoutFor(this.props.tagId);
        this.heightAtStart = 0;
        this.isBeingFiltered = !!RoomListStore.instance.getFirstNameFilterCondition();
        this.notificationState = RoomNotificationStateStore.instance.getListState(this.props.tagId);
        this.state = {
            contextMenuPosition: null,
            addRoomContextMenuPosition: null,
            isResizing: false,
            isExpanded: this.isBeingFiltered ? this.isBeingFiltered : !this.layout.isCollapsed,
            height: 0, // to be fixed in a moment, we need `rooms` to calculate this.
            rooms: arrayFastClone(RoomListStore.instance.orderedLists[this.props.tagId] || []),
        };
        // Why Object.assign() and not this.state.height? Because TypeScript says no.
        this.state = Object.assign(this.state, {height: this.calculateInitialHeight()});
        this.dispatcherRef = defaultDispatcher.register(this.onAction);
        RoomListStore.instance.on(LISTS_UPDATE_EVENT, this.onListsUpdated);
    }

    private calculateInitialHeight() {
        const requestedVisibleTiles = Math.max(Math.floor(this.layout.visibleTiles), this.layout.minVisibleTiles);
        const tileCount = Math.min(this.numTiles, requestedVisibleTiles);
        return this.layout.tilesToPixelsWithPadding(tileCount, this.padding);
    }

    private get padding() {
        let padding = RESIZE_HANDLE_HEIGHT;
        // this is used for calculating the max height of the whole container,
        // and takes into account whether there should be room reserved for the show more/less button
        // when fully expanded. We can't rely purely on the layout's defaultVisible tile count
        // because there are conditions in which we need to know that the 'show more' button
        // is present while well under the default tile limit.
        const needsShowMore = this.numTiles > this.numVisibleTiles;

        // ...but also check this or we'll miss if the section is expanded and we need a
        // 'show less'
        const needsShowLess = this.numTiles > this.layout.defaultVisibleTiles;

        if (needsShowMore || needsShowLess) {
            padding += SHOW_N_BUTTON_HEIGHT;
        }
        return padding;
    }

    private get extraTiles(): ReactComponentElement<typeof ExtraTile>[] | null {
        if (this.state.filteredExtraTiles) {
            return this.state.filteredExtraTiles;
        }
        if (this.props.extraTiles) {
            return this.props.extraTiles;
        }
        return null;
    }

    private get numTiles(): number {
        return RoomSublist.calcNumTiles(this.state.rooms, this.extraTiles);
    }

    private static calcNumTiles(rooms: Room[], extraTiles: any[]) {
        return (rooms || []).length + (extraTiles || []).length;
    }

    private get numVisibleTiles(): number {
        const nVisible = Math.ceil(this.layout.visibleTiles);
        return Math.min(nVisible, this.numTiles);
    }

    public componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IState>) {
        const prevExtraTiles = prevState.filteredExtraTiles || prevProps.extraTiles;
        // as the rooms can come in one by one we need to reevaluate
        // the amount of available rooms to cap the amount of requested visible rooms by the layout
        if (RoomSublist.calcNumTiles(prevState.rooms, prevExtraTiles) !== this.numTiles) {
            this.setState({height: this.calculateInitialHeight()});
        }
    }

    public shouldComponentUpdate(nextProps: Readonly<IProps>, nextState: Readonly<IState>): boolean {
        if (objectHasDiff(this.props, nextProps)) {
            // Something we don't care to optimize has updated, so update.
            return true;
        }

        // Do the same check used on props for state, without the rooms we're going to no-op
        const prevStateNoRooms = objectExcluding(this.state, ['rooms']);
        const nextStateNoRooms = objectExcluding(nextState, ['rooms']);
        if (objectHasDiff(prevStateNoRooms, nextStateNoRooms)) {
            return true;
        }

        // If we're supposed to handle extra tiles, take the performance hit and re-render all the
        // time so we don't have to consider them as part of the visible room optimization.
        const prevExtraTiles = this.props.extraTiles || [];
        const nextExtraTiles = (nextState.filteredExtraTiles || nextProps.extraTiles) || [];
        if (prevExtraTiles.length > 0 || nextExtraTiles.length > 0) {
            return true;
        }

        // If we're about to update the height of the list, we don't really care about which rooms
        // are visible or not for no-op purposes, so ensure that the height calculation runs through.
        if (RoomSublist.calcNumTiles(nextState.rooms, nextExtraTiles) !== this.numTiles) {
            return true;
        }

        // Before we go analyzing the rooms, we can see if we're collapsed. If we're collapsed, we don't need
        // to render anything. We do this after the height check though to ensure that the height gets appropriately
        // calculated for when/if we become uncollapsed.
        if (!nextState.isExpanded) {
            return false;
        }

        // Quickly double check we're not about to break something due to the number of rooms changing.
        if (this.state.rooms.length !== nextState.rooms.length) {
            return true;
        }

        // Finally, determine if the room update (as presumably that's all that's left) is within
        // our visible range. If it is, then do a render. If the update is outside our visible range
        // then we can skip the update.
        //
        // We also optimize for order changing here: if the update did happen in our visible range
        // but doesn't result in the list re-sorting itself then there's no reason for us to update
        // on our own.
        const prevSlicedRooms = this.state.rooms.slice(0, this.numVisibleTiles);
        const nextSlicedRooms = nextState.rooms.slice(0, this.numVisibleTiles);
        if (arrayHasOrderChange(prevSlicedRooms, nextSlicedRooms)) {
            return true;
        }

        // Finally, nothing happened so no-op the update
        return false;
    }

    public componentWillUnmount() {
        defaultDispatcher.unregister(this.dispatcherRef);
        RoomListStore.instance.off(LISTS_UPDATE_EVENT, this.onListsUpdated);
    }

    private onListsUpdated = () => {
        const stateUpdates: IState & any = {}; // &any is to avoid a cast on the initializer

        if (this.props.extraTiles) {
            const nameCondition = RoomListStore.instance.getFirstNameFilterCondition();
            if (nameCondition) {
                stateUpdates.filteredExtraTiles = this.props.extraTiles
                    .filter(t => nameCondition.matches(t.props.displayName || ""));
            } else if (this.state.filteredExtraTiles) {
                stateUpdates.filteredExtraTiles = null;
            }
        }

        const currentRooms = this.state.rooms;
        const newRooms = arrayFastClone(RoomListStore.instance.orderedLists[this.props.tagId] || []);
        if (arrayHasOrderChange(currentRooms, newRooms)) {
            stateUpdates.rooms = newRooms;
        }

        const isStillBeingFiltered = !!RoomListStore.instance.getFirstNameFilterCondition();
        if (isStillBeingFiltered !== this.isBeingFiltered) {
            this.isBeingFiltered = isStillBeingFiltered;
            if (isStillBeingFiltered) {
                stateUpdates.isExpanded = true;
            } else {
                stateUpdates.isExpanded = !this.layout.isCollapsed;
            }
        }

        if (Object.keys(stateUpdates).length > 0) {
            this.setState(stateUpdates);
        }
    };

    private onAction = (payload: ActionPayload) => {
        if (payload.action === "view_room" && payload.show_room_tile && this.state.rooms) {
            // XXX: we have to do this a tick later because we have incorrect intermediate props during a room change
            // where we lose the room we are changing from temporarily and then it comes back in an update right after.
            setImmediate(() => {
                const roomIndex = this.state.rooms.findIndex((r) => r.roomId === payload.room_id);

                if (!this.state.isExpanded && roomIndex > -1) {
                    this.toggleCollapsed();
                }
                // extend the visible section to include the room if it is entirely invisible
                if (roomIndex >= this.numVisibleTiles) {
                    this.layout.visibleTiles = this.layout.tilesWithPadding(roomIndex + 1, MAX_PADDING_HEIGHT);
                    this.forceUpdate(); // because the layout doesn't trigger a re-render
                }
            });
        }
    };

    private onAddRoom = (e) => {
        e.stopPropagation();
        if (this.props.onAddRoom) this.props.onAddRoom();
    };

    private applyHeightChange(newHeight: number) {
        const heightInTiles = Math.ceil(this.layout.pixelsToTiles(newHeight - this.padding));
        this.layout.visibleTiles = Math.min(this.numTiles, heightInTiles);
    }

    private onResize = (
        e: MouseEvent | TouchEvent,
        travelDirection: Direction,
        refToElement: HTMLDivElement,
        delta: ResizeDelta,
    ) => {
        const newHeight = this.heightAtStart + delta.height;
        this.applyHeightChange(newHeight);
        this.setState({height: newHeight});
    };

    private onResizeStart = () => {
        this.heightAtStart = this.state.height;
        this.setState({isResizing: true});
    };

    private onResizeStop = (
        e: MouseEvent | TouchEvent,
        travelDirection: Direction,
        refToElement: HTMLDivElement,
        delta: ResizeDelta,
    ) => {
        const newHeight = this.heightAtStart + delta.height;
        this.applyHeightChange(newHeight);
        this.setState({isResizing: false, height: newHeight});
    };

    private onShowAllClick = () => {
        // read number of visible tiles before we mutate it
        const numVisibleTiles = this.numVisibleTiles;
        const newHeight = this.layout.tilesToPixelsWithPadding(this.numTiles, this.padding);
        this.applyHeightChange(newHeight);
        this.setState({height: newHeight}, () => {
            // focus the top-most new room
            this.focusRoomTile(numVisibleTiles);
        });
    };

    private onShowLessClick = () => {
        const newHeight = this.layout.tilesToPixelsWithPadding(this.layout.defaultVisibleTiles, this.padding);
        this.applyHeightChange(newHeight);
        this.setState({height: newHeight});
    };

    private focusRoomTile = (index: number) => {
        if (!this.sublistRef.current) return;
        const elements = this.sublistRef.current.querySelectorAll<HTMLDivElement>(".mx_RoomTile");
        const element = elements && elements[index];
        if (element) {
            element.focus();
        }
    };

    private onOpenMenuClick = (ev: React.MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        const target = ev.target as HTMLButtonElement;
        this.setState({contextMenuPosition: target.getBoundingClientRect()});
    };

    private onContextMenu = (ev: React.MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        this.setState({
            contextMenuPosition: {
                left: ev.clientX,
                top: ev.clientY,
                height: 0,
            },
        });
    };

    private onAddRoomContextMenu = (ev: React.MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        const target = ev.target as HTMLButtonElement;
        this.setState({addRoomContextMenuPosition: target.getBoundingClientRect()});
    };

    private onCloseMenu = () => {
        this.setState({contextMenuPosition: null});
    };

    private onCloseAddRoomMenu = () => {
        this.setState({addRoomContextMenuPosition: null});
    };

    private onUnreadFirstChanged = async () => {
        const isUnreadFirst = RoomListStore.instance.getListOrder(this.props.tagId) === ListAlgorithm.Importance;
        const newAlgorithm = isUnreadFirst ? ListAlgorithm.Natural : ListAlgorithm.Importance;
        await RoomListStore.instance.setListOrder(this.props.tagId, newAlgorithm);
        this.forceUpdate(); // because if the sublist doesn't have any changes then we will miss the list order change
    };

    private onTagSortChanged = async (sort: SortAlgorithm) => {
        await RoomListStore.instance.setTagSorting(this.props.tagId, sort);
    };

    private onMessagePreviewChanged = () => {
        this.layout.showPreviews = !this.layout.showPreviews;
        this.forceUpdate(); // because the layout doesn't trigger a re-render
    };

    private onBadgeClick = (ev: React.MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();

        let room;
        if (this.props.tagId === DefaultTagID.Invite) {
            // switch to first room as that'll be the top of the list for the user
            room = this.state.rooms && this.state.rooms[0];
        } else {
            // find the first room with a count of the same colour as the badge count
            room = RoomListStore.instance.unfilteredLists[this.props.tagId].find((r: Room) => {
                const notifState = this.notificationState.getForRoom(r);
                return notifState.count > 0 && notifState.color === this.notificationState.color;
            });
        }

        if (room) {
            dis.dispatch({
                action: 'view_room',
                room_id: room.roomId,
                show_room_tile: true, // to make sure the room gets scrolled into view
            });
        }
    };

    private onHeaderClick = () => {
        const possibleSticky = this.headerButton.current.parentElement;
        const sublist = possibleSticky.parentElement.parentElement;
        const list = sublist.parentElement.parentElement;
        // the scrollTop is capped at the height of the header in LeftPanel, the top header is always sticky
        const isAtTop = list.scrollTop <= HEADER_HEIGHT;
        const isAtBottom = list.scrollTop >= list.scrollHeight - list.offsetHeight;
        const isStickyTop = possibleSticky.classList.contains('mx_RoomSublist_headerContainer_stickyTop');
        const isStickyBottom = possibleSticky.classList.contains('mx_RoomSublist_headerContainer_stickyBottom');

        if ((isStickyBottom && !isAtBottom) || (isStickyTop && !isAtTop)) {
            // is sticky - jump to list
            sublist.scrollIntoView({behavior: 'smooth'});
        } else {
            // on screen - toggle collapse
            const isExpanded = this.state.isExpanded;
            this.toggleCollapsed();
            // if the bottom list is collapsed then scroll it in so it doesn't expand off screen
            if (!isExpanded && isStickyBottom) {
                setImmediate(() => {
                    sublist.scrollIntoView({behavior: 'smooth'});
                });
            }
        }
    };

    private toggleCollapsed = () => {
        this.layout.isCollapsed = this.state.isExpanded;
        this.setState({isExpanded: !this.layout.isCollapsed});
        setImmediate(() => this.props.onResize()); // needs to happen when the DOM is updated
    };

    private onHeaderKeyDown = (ev: React.KeyboardEvent) => {
        const action = getKeyBindingsManager().getRoomListAction(ev);
        switch (action) {
            case RoomListAction.CollapseSection:
                ev.stopPropagation();
                if (this.state.isExpanded) {
                    // Collapse the room sublist if it isn't already
                    this.toggleCollapsed();
                }
                break;
            case RoomListAction.ExpandSection: {
                ev.stopPropagation();
                if (!this.state.isExpanded) {
                    // Expand the room sublist if it isn't already
                    this.toggleCollapsed();
                } else if (this.sublistRef.current) {
                    // otherwise focus the first room
                    const element = this.sublistRef.current.querySelector(".mx_RoomTile") as HTMLDivElement;
                    if (element) {
                        element.focus();
                    }
                }
                break;
            }
        }
    };

    private onKeyDown = (ev: React.KeyboardEvent) => {
        switch (ev.key) {
            // On ARROW_LEFT go to the sublist header
            case Key.ARROW_LEFT:
                ev.stopPropagation();
                this.headerButton.current.focus();
                break;
            // Consume ARROW_RIGHT so it doesn't cause focus to get sent to composer
            case Key.ARROW_RIGHT:
                ev.stopPropagation();
        }
    };

    private renderVisibleTiles(): React.ReactElement[] {
        if (!this.state.isExpanded) {
            // don't waste time on rendering
            return [];
        }

        const tiles: React.ReactElement[] = [];

        if (this.state.rooms) {
            const visibleRooms = this.state.rooms.slice(0, this.numVisibleTiles);
            for (const room of visibleRooms) {
                tiles.push(<RoomTile
                    room={room}
                    key={`room-${room.roomId}`}
                    showMessagePreview={this.layout.showPreviews}
                    isMinimized={this.props.isMinimized}
                    tag={this.props.tagId}
                />);
            }
        }

        if (this.extraTiles) {
            // HACK: We break typing here, but this 'extra tiles' property shouldn't exist.
            (tiles as any[]).push(...this.extraTiles);
        }

        // We only have to do this because of the extra tiles. We do it conditionally
        // to avoid spending cycles on slicing. It's generally fine to do this though
        // as users are unlikely to have more than a handful of tiles when the extra
        // tiles are used.
        if (tiles.length > this.numVisibleTiles) {
            return tiles.slice(0, this.numVisibleTiles);
        }

        return tiles;
    }

    private renderMenu(): React.ReactElement {
        let contextMenu = null;
        if (this.state.contextMenuPosition) {
            const isAlphabetical = RoomListStore.instance.getTagSorting(this.props.tagId) === SortAlgorithm.Alphabetic;
            const isUnreadFirst = RoomListStore.instance.getListOrder(this.props.tagId) === ListAlgorithm.Importance;

            // Invites don't get some nonsense options, so only add them if we have to.
            let otherSections = null;
            if (this.props.tagId !== DefaultTagID.Invite) {
                otherSections = (
                    <React.Fragment>
                        <hr />
                        <div>
                            <div className='mx_RoomSublist_contextMenu_title'>{_t("Appearance")}</div>
                            <StyledMenuItemCheckbox
                                onClose={this.onCloseMenu}
                                onChange={this.onUnreadFirstChanged}
                                checked={isUnreadFirst}
                            >
                                {_t("Show rooms with unread messages first")}
                            </StyledMenuItemCheckbox>
                            <StyledMenuItemCheckbox
                                onClose={this.onCloseMenu}
                                onChange={this.onMessagePreviewChanged}
                                checked={this.layout.showPreviews}
                            >
                                {_t("Show previews of messages")}
                            </StyledMenuItemCheckbox>
                        </div>
                    </React.Fragment>
                );
            }

            contextMenu = (
                <ContextMenu
                    chevronFace={ChevronFace.None}
                    left={this.state.contextMenuPosition.left}
                    top={this.state.contextMenuPosition.top + this.state.contextMenuPosition.height}
                    onFinished={this.onCloseMenu}
                >
                    <div className="mx_RoomSublist_contextMenu">
                        <div>
                            <div className='mx_RoomSublist_contextMenu_title'>{_t("Sort by")}</div>
                            <StyledMenuItemRadio
                                onClose={this.onCloseMenu}
                                onChange={() => this.onTagSortChanged(SortAlgorithm.Recent)}
                                checked={!isAlphabetical}
                                name={`mx_${this.props.tagId}_sortBy`}
                            >
                                {_t("Activity")}
                            </StyledMenuItemRadio>
                            <StyledMenuItemRadio
                                onClose={this.onCloseMenu}
                                onChange={() => this.onTagSortChanged(SortAlgorithm.Alphabetic)}
                                checked={isAlphabetical}
                                name={`mx_${this.props.tagId}_sortBy`}
                            >
                                {_t("A-Z")}
                            </StyledMenuItemRadio>
                        </div>
                        {otherSections}
                    </div>
                </ContextMenu>
            );
        } else if (this.state.addRoomContextMenuPosition) {
            contextMenu = (
                <IconizedContextMenu
                    chevronFace={ChevronFace.None}
                    left={this.state.addRoomContextMenuPosition.left - 7} // center align with the handle
                    top={this.state.addRoomContextMenuPosition.top + this.state.addRoomContextMenuPosition.height}
                    onFinished={this.onCloseAddRoomMenu}
                    compact
                >
                    {this.props.addRoomContextMenu(this.onCloseAddRoomMenu)}
                </IconizedContextMenu>
            );
        }

        return (
            <React.Fragment>
                <ContextMenuTooltipButton
                    className="mx_RoomSublist_menuButton"
                    onClick={this.onOpenMenuClick}
                    title={_t("List options")}
                    isExpanded={!!this.state.contextMenuPosition}
                />
                {contextMenu}
            </React.Fragment>
        );
    }

    private renderHeader(): React.ReactElement {
        return (
            <RovingTabIndexWrapper inputRef={this.headerButton}>
                {({onFocus, isActive, ref}) => {
                    const tabIndex = isActive ? 0 : -1;

                    let ariaLabel = _t("Jump to first unread room.");
                    if (this.props.tagId === DefaultTagID.Invite) {
                        ariaLabel = _t("Jump to first invite.");
                    }

                    const badge = (
                        <NotificationBadge
                            forceCount={true}
                            notification={this.notificationState}
                            onClick={this.onBadgeClick}
                            tabIndex={tabIndex}
                            aria-label={ariaLabel}
                        />
                    );

                    let addRoomButton = null;
                    if (!!this.props.onAddRoom) {
                        addRoomButton = (
                            <AccessibleTooltipButton
                                tabIndex={tabIndex}
                                onClick={this.onAddRoom}
                                className="mx_RoomSublist_auxButton"
                                tooltipClassName="mx_RoomSublist_addRoomTooltip"
                                aria-label={this.props.addRoomLabel || _t("Add room")}
                                title={this.props.addRoomLabel}
                            />
                        );
                    } else if (this.props.addRoomContextMenu) {
                        addRoomButton = (
                            <ContextMenuTooltipButton
                                tabIndex={tabIndex}
                                onClick={this.onAddRoomContextMenu}
                                className="mx_RoomSublist_auxButton"
                                tooltipClassName="mx_RoomSublist_addRoomTooltip"
                                aria-label={this.props.addRoomLabel || _t("Add room")}
                                title={this.props.addRoomLabel}
                                isExpanded={!!this.state.addRoomContextMenuPosition}
                            />
                        );
                    }

                    const collapseClasses = classNames({
                        'mx_RoomSublist_collapseBtn': true,
                        'mx_RoomSublist_collapseBtn_collapsed': !this.state.isExpanded,
                    });

                    const classes = classNames({
                        'mx_RoomSublist_headerContainer': true,
                        'mx_RoomSublist_headerContainer_withAux': !!addRoomButton,
                    });

                    const badgeContainer = (
                        <div className="mx_RoomSublist_badgeContainer">
                            {badge}
                        </div>
                    );

                    let Button: React.ComponentType<React.ComponentProps<typeof AccessibleButton>> = AccessibleButton;
                    if (this.props.isMinimized) {
                        Button = AccessibleTooltipButton;
                    }

                    // Note: the addRoomButton conditionally gets moved around
                    // the DOM depending on whether or not the list is minimized.
                    // If we're minimized, we want it below the header so it
                    // doesn't become sticky.
                    // The same applies to the notification badge.
                    return (
                        <div
                            className={classes}
                            onKeyDown={this.onHeaderKeyDown}
                            onFocus={onFocus}
                            aria-label={this.props.label}
                        >
                            <div className="mx_RoomSublist_stickable">
                                <Button
                                    onFocus={onFocus}
                                    inputRef={ref}
                                    tabIndex={tabIndex}
                                    className="mx_RoomSublist_headerText"
                                    role="treeitem"
                                    aria-expanded={this.state.isExpanded}
                                    aria-level={1}
                                    onClick={this.onHeaderClick}
                                    onContextMenu={this.onContextMenu}
                                    title={this.props.isMinimized ? this.props.label : undefined}
                                >
                                    <span className={collapseClasses} />
                                    <span>{this.props.label}</span>
                                </Button>
                                {this.renderMenu()}
                                {this.props.isMinimized ? null : badgeContainer}
                                {this.props.isMinimized ? null : addRoomButton}
                            </div>
                            {this.props.isMinimized ? badgeContainer : null}
                            {this.props.isMinimized ? addRoomButton : null}
                        </div>
                    );
                }}
            </RovingTabIndexWrapper>
        );
    }

    private onScrollPrevent(e: React.UIEvent<HTMLDivElement>) {
        // the RoomTile calls scrollIntoView and the browser may scroll a div we do not wish to be scrollable
        // this fixes https://github.com/vector-im/element-web/issues/14413
        (e.target as HTMLDivElement).scrollTop = 0;
    }

    public render(): React.ReactElement {
        const visibleTiles = this.renderVisibleTiles();
        const classes = classNames({
            'mx_RoomSublist': true,
            'mx_RoomSublist_hasMenuOpen': !!this.state.contextMenuPosition,
            'mx_RoomSublist_minimized': this.props.isMinimized,
        });

        let content = null;
        if (visibleTiles.length > 0) {
            const layout = this.layout; // to shorten calls

            const minTiles = Math.min(layout.minVisibleTiles, this.numTiles);
            const showMoreAtMinHeight = minTiles < this.numTiles;
            const minHeightPadding = RESIZE_HANDLE_HEIGHT + (showMoreAtMinHeight ? SHOW_N_BUTTON_HEIGHT : 0);
            const minTilesPx = layout.tilesToPixelsWithPadding(minTiles, minHeightPadding);
            const maxTilesPx = layout.tilesToPixelsWithPadding(this.numTiles, this.padding);
            const showMoreBtnClasses = classNames({
                'mx_RoomSublist_showNButton': true,
            });

            // If we're hiding rooms, show a 'show more' button to the user. This button
            // floats above the resize handle, if we have one present. If the user has all
            // tiles visible, it becomes 'show less'.
            let showNButton = null;

            if (maxTilesPx > this.state.height) {
                // the height of all the tiles is greater than the section height: we need a 'show more' button
                const nonPaddedHeight = this.state.height - RESIZE_HANDLE_HEIGHT - SHOW_N_BUTTON_HEIGHT;
                const amountFullyShown = Math.floor(nonPaddedHeight / this.layout.tileHeight);
                const numMissing = this.numTiles - amountFullyShown;
                const label = _t("Show %(count)s more", {count: numMissing});
                let showMoreText = (
                    <span className='mx_RoomSublist_showNButtonText'>
                        {label}
                    </span>
                );
                if (this.props.isMinimized) showMoreText = null;
                showNButton = (
                    <RovingAccessibleButton
                        role="treeitem"
                        onClick={this.onShowAllClick}
                        className={showMoreBtnClasses}
                        aria-label={label}
                    >
                        <span className='mx_RoomSublist_showMoreButtonChevron mx_RoomSublist_showNButtonChevron'>
                            {/* set by CSS masking */}
                        </span>
                        {showMoreText}
                    </RovingAccessibleButton>
                );
            } else if (this.numTiles > this.layout.defaultVisibleTiles) {
                // we have all tiles visible - add a button to show less
                const label = _t("Show less");
                let showLessText = (
                    <span className='mx_RoomSublist_showNButtonText'>
                        {label}
                    </span>
                );
                if (this.props.isMinimized) showLessText = null;
                showNButton = (
                    <RovingAccessibleButton
                        role="treeitem"
                        onClick={this.onShowLessClick}
                        className={showMoreBtnClasses}
                        aria-label={label}
                    >
                        <span className='mx_RoomSublist_showLessButtonChevron mx_RoomSublist_showNButtonChevron'>
                            {/* set by CSS masking */}
                        </span>
                        {showLessText}
                    </RovingAccessibleButton>
                );
            }

            // Figure out if we need a handle
            const handles: Enable = {
                bottom: true, // the only one we need, but the others must be explicitly false
                bottomLeft: false,
                bottomRight: false,
                left: false,
                right: false,
                top: false,
                topLeft: false,
                topRight: false,
            };
            if (layout.visibleTiles >= this.numTiles && this.numTiles <= layout.minVisibleTiles) {
                // we're at a minimum, don't have a bottom handle
                handles.bottom = false;
            }

            // We have to account for padding so we can accommodate a 'show more' button and
            // the resize handle, which are pinned to the bottom of the container. This is the
            // easiest way to have a resize handle below the button as otherwise we're writing
            // our own resize handling and that doesn't sound fun.
            //
            // The layout class has some helpers for dealing with padding, as we don't want to
            // apply it in all cases. If we apply it in all cases, the resizing feels like it
            // goes backwards and can become wildly incorrect (visibleTiles says 18 when there's
            // only mathematically 7 possible).

            const handleWrapperClasses = classNames({
                'mx_RoomSublist_resizerHandles': true,
                'mx_RoomSublist_resizerHandles_showNButton': !!showNButton,
            });

            content = (
                <React.Fragment>
                    <Resizable
                        size={{height: this.state.height} as any}
                        minHeight={minTilesPx}
                        maxHeight={maxTilesPx}
                        onResizeStart={this.onResizeStart}
                        onResizeStop={this.onResizeStop}
                        onResize={this.onResize}
                        handleWrapperClass={handleWrapperClasses}
                        handleClasses={{bottom: "mx_RoomSublist_resizerHandle"}}
                        className="mx_RoomSublist_resizeBox"
                        enable={handles}
                    >
                        <div className="mx_RoomSublist_tiles" onScroll={this.onScrollPrevent}>
                            {visibleTiles}
                        </div>
                        {showNButton}
                    </Resizable>
                </React.Fragment>
            );
        } else if (this.props.showSkeleton && this.state.isExpanded) {
            content = <div className="mx_RoomSublist_skeletonUI" />;
        }

        return (
            <div
                ref={this.sublistRef}
                className={classes}
                role="group"
                aria-label={this.props.label}
                onKeyDown={this.onKeyDown}
            >
                {this.renderHeader()}
                {content}
            </div>
        );
    }
}
